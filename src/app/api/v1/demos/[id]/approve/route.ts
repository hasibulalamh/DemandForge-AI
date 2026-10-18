import type { NextRequest } from "next/server";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { ApiError, jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`demos:approve:${user.id}`, 20, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const supabase = await createSupabaseServerClient();

    const { data: demo } = await supabase
      .from("demo_projects")
      .select("id, lead_id, generation_status, title")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!demo) throw notFound("Demo");

    const { data: artifact } = await supabase
      .from("demo_artifacts")
      .select("id")
      .eq("demo_id", demo.id)
      .maybeSingle();

    if (!artifact) {
      throw new ApiError(409, "NO_ARTIFACT", "Generate the demo before approving it.");
    }
    if (demo.generation_status !== "ready" && demo.generation_status !== "approved") {
      throw new ApiError(409, "NOT_READY", "The demo is not ready for approval.");
    }

    const approvedAt = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("demo_projects")
      .update({ generation_status: "approved", approved_at: approvedAt, deployment_error: null })
      .eq("id", demo.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw new Error("Could not approve the demo.");

    await supabase
      .from("leads")
      .update({ pipeline_status: "demo_generated" })
      .eq("id", demo.lead_id)
      .eq("user_id", user.id)
      .in("pipeline_status", ["new", "shortlisted"]);

    try {
      await recordAudit(createSupabaseAdminClient(), {
        userId: user.id,
        action: "demo.approved",
        entityType: "demo_project",
        entityId: demo.id,
        metadata: { approvedAt },
      });
    } catch {
      console.warn("[demos] audit unavailable during approval");
    }

    return jsonOk(updated);
  });
}
