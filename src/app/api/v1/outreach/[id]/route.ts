import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateOutreachSchema } from "@/lib/validation/schemas";
import type { TablesUpdate } from "@/types/database";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`outreach:update:${user.id}`, 60, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const body = updateOutreachSchema.parse(await request.json());

    const update: TablesUpdate<"outreach_records"> = {};
    if (body.draftContent !== undefined) update.draft_content = body.draftContent;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.status !== undefined) update.status = body.status;
    if (body.sentAt !== undefined) update.sent_at = body.sentAt;
    if (body.responseAt !== undefined) update.response_at = body.responseAt;

    // Stamps are derived server-side when a status implies them.
    if (body.status === "sent" && body.sentAt === undefined) {
      update.sent_at = new Date().toISOString();
    }
    if ((body.status === "replied" || body.status === "converted") && body.responseAt === undefined) {
      update.response_at = new Date().toISOString();
    }

    if (Object.keys(update).length === 0) return jsonOk({ updated: false });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("outreach_records")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error("Could not update the outreach record.");
    if (!data) throw notFound("Outreach record");
    return jsonOk(data);
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`outreach:delete:${user.id}`, 30, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("outreach_records")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error("Could not delete the outreach record.");
    if (!count) throw notFound("Outreach record");
    return jsonOk({ deleted: true });
  });
}
