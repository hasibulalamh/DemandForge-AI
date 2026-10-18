import type { NextRequest } from "next/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/api/rate-limit";
import { jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateSourceSchema } from "@/lib/validation/schemas";
import type { TablesUpdate } from "@/types/database";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`sources:update:${user.id}`, 40, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const body = updateSourceSchema.parse(await request.json());

    const update: TablesUpdate<"sources"> = {};
    if (body.sourceName !== undefined) update.source_name = body.sourceName;
    if (body.sourceUrl !== undefined) update.source_url = body.sourceUrl;
    if (body.connectionStatus !== undefined) update.connection_status = body.connectionStatus;

    if (Object.keys(update).length === 0) {
      return jsonOk({ updated: false });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error("Could not update the source.");
    if (!data) throw notFound("Source");
    return jsonOk(data);
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`sources:delete:${user.id}`, 20, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("sources")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error("Could not delete the source.");
    if (!count) throw notFound("Source");
    return jsonOk({ deleted: true });
  });
}
