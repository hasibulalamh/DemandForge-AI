import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { getLead } from "@/features/leads/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateLeadSchema } from "@/lib/validation/schemas";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`leads:get:${user.id}`, 120, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const lead = await getLead(id);
    if (!lead) throw notFound("Lead");
    return jsonOk(lead);
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`leads:update:${user.id}`, 60, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const body = updateLeadSchema.parse(await request.json());

    if (!body.pipelineStatus) return jsonOk({ updated: false });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("leads")
      .update({ pipeline_status: body.pipelineStatus })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error("Could not update the lead.");
    if (!data) throw notFound("Lead");
    return jsonOk(data);
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`leads:delete:${user.id}`, 20, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("leads")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error("Could not delete the lead.");
    if (!count) throw notFound("Lead");
    return jsonOk({ deleted: true });
  });
}
