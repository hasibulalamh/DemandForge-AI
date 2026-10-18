import type { NextRequest } from "next/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/api/rate-limit";
import { jsonOk, notFound, safeRoute } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateCollectionRuleSchema } from "@/lib/validation/schemas";
import type { TablesUpdate } from "@/types/database";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`rules:update:${user.id}`, 60, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const body = updateCollectionRuleSchema.parse(await request.json());

    const update: TablesUpdate<"collection_rules"> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.keywords !== undefined) update.keywords = body.keywords;
    if (body.excludedKeywords !== undefined) update.excluded_keywords = body.excludedKeywords;
    if (body.projectCategories !== undefined) update.project_categories = body.projectCategories;
    if (body.isEnabled !== undefined) update.is_enabled = body.isEnabled;

    if (Object.keys(update).length === 0) return jsonOk({ updated: false });

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collection_rules")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error("Could not update the collection rule.");
    if (!data) throw notFound("Collection rule");
    return jsonOk(data);
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`rules:delete:${user.id}`, 30, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("collection_rules")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error("Could not delete the collection rule.");
    if (!count) throw notFound("Collection rule");
    return jsonOk({ deleted: true });
  });
}
