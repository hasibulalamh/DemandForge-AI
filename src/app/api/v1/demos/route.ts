import type { NextRequest } from "next/server";

import { ApiError, jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { listDemos } from "@/features/demos/queries";
import { enqueueJob } from "@/lib/jobs/queue";
import { triggerQueueSoon } from "@/lib/jobs/trigger";
import { uniqueSlug } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDemoSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`demos:list:${user.id}`, 120, 60_000);
    const demos = await listDemos();
    return jsonOk(demos);
  });
}

export async function POST(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`demos:create:${user.id}`, 10, 60_000);

    const body = createDemoSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();

    const { data: lead } = await supabase
      .from("leads")
      .select("id, project_title, analysis_status")
      .eq("id", body.leadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lead) throw notFound("Lead");
    if (lead.analysis_status !== "analyzed") {
      throw new ApiError(409, "LEAD_NOT_ANALYZED", "Analyze the lead with Gemini before generating a demo.");
    }

    const title = body.title?.trim() || `${lead.project_title ?? "Website"} — concept site`;
    const slug = uniqueSlug(title);

    const { data: demo, error } = await supabase
      .from("demo_projects")
      .insert({
        user_id: user.id,
        lead_id: lead.id,
        title,
        slug,
        template_name: body.templateName,
        generation_status: "queued",
      })
      .select("*")
      .single();

    if (error || !demo) throw new Error("Could not create the demo project.");

    try {
      const { job } = await enqueueJob({
        userId: user.id,
        type: "generate_demo",
        payload: { demoId: demo.id },
        idempotencyKey: `generate:${demo.id}`,
        maxAttempts: 2,
      });
      triggerQueueSoon();
      return jsonOk({ demo, jobId: job.id }, { status: 201 });
    } catch (jobError) {
      await supabase
        .from("demo_projects")
        .update({
          generation_status: "failed",
          deployment_error: "Could not queue demo generation.",
        })
        .eq("id", demo.id);
      throw jobError;
    }
  });
}
