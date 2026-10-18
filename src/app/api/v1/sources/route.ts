import type { NextRequest } from "next/server";

import { ApiError, jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { canonicalizeUrl, isSafeHttpUrl } from "@/lib/security/hash";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSourceSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`sources:list:${user.id}`, 120, 60_000);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error("Could not load sources.");
    return jsonOk(data ?? []);
  });
}

export async function POST(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`sources:create:${user.id}`, 20, 60_000);

    const body = createSourceSchema.parse(await request.json());
    const url = body.sourceUrl ?? null;

    if (url && !isSafeHttpUrl(url)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Source URL must be an absolute http(s) URL.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .insert({
        user_id: user.id,
        source_type: body.sourceType,
        source_name: body.sourceName,
        source_url: url,
        connection_status: body.sourceType === "chrome_extension" ? "connected" : "manual_only",
        config: {},
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      throw new ApiError(409, "CONFLICT", "A source with this URL already exists.");
    }
    if (error) throw new Error("Could not create the source.");

    return jsonOk({ ...data, canonicalUrl: canonicalizeUrl(url) }, { status: 201 });
  });
}
