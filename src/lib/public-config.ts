/**
 * Browser-safe configuration. Only NEXT_PUBLIC_* variables are referenced here.
 * Never add secrets to this module.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const publicConfig = {
  supabaseUrl,
  supabaseKey,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicConfig.supabaseUrl && publicConfig.supabaseKey);
}

export function missingSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!publicConfig.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publicConfig.supabaseKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return missing;
}
