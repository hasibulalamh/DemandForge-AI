import "server-only";

import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

import { unauthorized } from "@/lib/api/errors";
import type { AuthUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sha256Hex } from "./hash";

const TOKEN_PREFIX = "df_";

export interface GeneratedApiToken {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
}

/**
 * Tokens are 256 bits of CSPRNG entropy, so a plain SHA-256 digest is a
 * sufficient storage form (no password-style stretching is needed).
 */
export function generateApiToken(): GeneratedApiToken {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: sha256Hex(token), tokenPrefix: token.slice(0, 12) };
}

export async function authenticateApiToken(request: NextRequest): Promise<AuthUser> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(df_[A-Za-z0-9_-]{20,})$/.exec(header.trim());
  if (!match) throw unauthorized();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("api_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", sha256Hex(match[1]!))
    .maybeSingle();

  if (error) {
    console.error("[api-token] lookup failed", { code: error.code });
    throw unauthorized();
  }
  if (!data || data.revoked_at) throw unauthorized();

  void admin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(({ error: touchError }) => {
      if (touchError) console.warn("[api-token] could not update last_used_at", { code: touchError.code });
    });

  return { id: data.user_id, email: null };
}
