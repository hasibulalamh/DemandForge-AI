import type { NextRequest } from "next/server";

import { assertRateLimit } from "@/lib/api/rate-limit";
import { jsonOk, safeRoute } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCollectionRuleSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`rules:list:${user.id}`, 120, 60_000);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collection_rules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load collection rules.");
    return jsonOk(data ?? []);
  });
}

export async function POST(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`rules:create:${user.id}`, 20, 60_000);

    const body = createCollectionRuleSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collection_rules")
      .insert({
        user_id: user.id,
        name: body.name,
        keywords: body.keywords,
        excluded_keywords: body.excludedKeywords,
        project_categories: body.projectCategories,
        is_enabled: body.isEnabled,
      })
      .select("*")
      .single();

    if (error) throw new Error("Could not create the collection rule.");
    return jsonOk(data, { status: 201 });
  });
}
