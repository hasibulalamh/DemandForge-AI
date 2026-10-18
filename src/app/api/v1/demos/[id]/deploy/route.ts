import type { NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, configError, jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { isVercelConfigured } from "@/lib/env";
import { enqueueJob } from "@/lib/jobs/queue";
import { triggerQueueSoon } from "@/lib/jobs/trigger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`demos:deploy:${user.id}`, 5, 60_000);

    const { id } = paramsSchema.parse(await context.params);

    if (!isVercelConfigured()) {
      throw configError("Vercel deployment is not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID.");
    }

    const supabase = await createSupabaseServerClient();
    const { data: demo } = await supabase
      .from("demo_projects")
      .select("id, title, generation_status, approved_at, deployment_status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!demo) throw notFound("Demo");
    if (!demo.approved_at || demo.generation_status !== "approved") {
      throw new ApiError(409, "NOT_APPROVED", "Approve the demo before deploying it.");
    }
    if (demo.deployment_status === "queued" || demo.deployment_status === "deploying") {
      throw new ApiError(409, "DEPLOYMENT_IN_PROGRESS", "A deployment is already in progress.");
    }

    const { data: artifact } = await supabase
      .from("demo_artifacts")
      .select("id, checksum")
      .eq("demo_id", demo.id)
      .maybeSingle();

    if (!artifact) throw new ApiError(409, "NO_ARTIFACT", "No generated artifact exists for this demo.");

    const admin = createSupabaseAdminClient();
    const { data: deployment, error } = await admin
      .from("deployments")
      .insert({
        user_id: user.id,
        demo_project_id: demo.id,
        status: "queued",
        requested_by: user.id,
      })
      .select("*")
      .single();

    if (error || !deployment) throw new Error("Could not create the deployment record.");

    const { error: demoError } = await supabase
      .from("demo_projects")
      .update({ deployment_status: "queued", deployment_error: null })
      .eq("id", demo.id)
      .eq("user_id", user.id);

    if (demoError) throw new Error("Could not queue the deployment.");

    const { job } = await enqueueJob({
      userId: user.id,
      type: "deploy_demo",
      payload: { demoId: demo.id, deploymentId: deployment.id },
      idempotencyKey: `deploy:${deployment.id}`,
      maxAttempts: 3,
    });

    triggerQueueSoon();

    return jsonOk({ deployment, jobId: job.id }, { status: 202 });
  });
}
