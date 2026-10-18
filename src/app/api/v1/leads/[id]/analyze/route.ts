import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { enqueueJob } from "@/lib/jobs/queue";
import { triggerQueueSoon } from "@/lib/jobs/trigger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`leads:analyze:${user.id}`, 10, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const supabase = await createSupabaseServerClient();

    const { data: lead } = await supabase
      .from("leads")
      .select("id, updated_at, analysis_status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lead) throw notFound("Lead");

    const { job, duplicate } = await enqueueJob({
      userId: user.id,
      type: "analyze_lead",
      payload: { leadId: lead.id },
      idempotencyKey: `analyze:${lead.id}:${lead.updated_at}`,
      maxAttempts: 3,
    });

    if (!duplicate && job.status === "queued") {
      await supabase.from("leads").update({ analysis_status: "queued" }).eq("id", lead.id);
    }

    triggerQueueSoon();

    return jsonOk({ jobId: job.id, jobStatus: job.status, duplicate }, { status: 202 });
  });
}
