"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, publicConfig } from "@/lib/public-config";
import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return createBrowserClient<Database>(publicConfig.supabaseUrl, publicConfig.supabaseKey);
}
