import type { NextRequest } from "next/server";

import { jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { generateApiToken } from "@/lib/security/api-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTokenSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`tokens:list:${user.id}`, 60, 60_000);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("api_tokens")
      .select("id, name, token_prefix, last_used_at, revoked_at, created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error("Could not load API tokens.");
    return jsonOk(data ?? []);
  });
}

export async function POST(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`tokens:create:${user.id}`, 5, 60_000);

    const body = createTokenSchema.parse(await request.json());
    const { token, tokenHash, tokenPrefix } = generateApiToken();

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("api_tokens")
      .insert({
        user_id: user.id,
        name: body.name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
      })
      .select("id, name, token_prefix, created_at")
      .single();

    if (error) throw new Error("Could not create the API token.");

    // The plaintext token is returned exactly once and never stored.
    return jsonOk({ ...data, token }, { status: 201 });
  });
}
