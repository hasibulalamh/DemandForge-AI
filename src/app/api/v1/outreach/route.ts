import type { NextRequest } from "next/server";

import { ApiError, jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { listOutreach } from "@/features/outreach/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOutreachSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`outreach:list:${user.id}`, 120, 60_000);
    return jsonOk(await listOutreach());
  });
}

export async function POST(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`outreach:create:${user.id}`, 30, 60_000);

    const body = createOutreachSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();

    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", body.leadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!lead) throw new ApiError(404, "NOT_FOUND", "Lead not found.");

    if (body.demoProjectId) {
      const { data: demo } = await supabase
        .from("demo_projects")
        .select("id, lead_id")
        .eq("id", body.demoProjectId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!demo || demo.lead_id !== body.leadId) {
        throw new ApiError(422, "VALIDATION_ERROR", "The selected demo does not match the lead.");
      }
    }

    const { data, error } = await supabase
      .from("outreach_records")
      .insert({
        user_id: user.id,
        lead_id: body.leadId,
        demo_project_id: body.demoProjectId ?? null,
        channel: body.channel,
        draft_content: body.draftContent,
        status: body.status,
      })
      .select("*")
      .single();

    if (error) throw new Error("Could not create the outreach draft.");
    return jsonOk(data, { status: 201 });
  });
}
