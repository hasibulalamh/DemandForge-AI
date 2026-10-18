import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicConfig } from "@/lib/public-config";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS, so every caller must scope queries by the
 * authenticated user id it has already verified. Never import this module into a
 * Client Component, route handler that echoes rows to a caller, or the extension.
 */
export function createSupabaseAdminClient() {
  if (!publicConfig.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase service role is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient<Database>(publicConfig.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function isAdminClientConfigured(): boolean {
  return Boolean(publicConfig.supabaseUrl && serverEnv.supabaseServiceRoleKey);
}
