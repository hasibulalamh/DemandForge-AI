import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { isSupabaseConfigured, publicConfig } from "@/lib/public-config";
import type { Database } from "@/types/database";

/**
 * Supabase client bound to the request's auth cookies. RLS is enforced.
 * Uses the supported @supabase/ssr cookie pattern for the App Router.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. See docs/ENVIRONMENT-VARIABLES.md.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(publicConfig.supabaseUrl, publicConfig.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. Session refresh is handled by
          // src/proxy.ts, so this can be safely ignored here.
        }
      },
    },
  });
}
