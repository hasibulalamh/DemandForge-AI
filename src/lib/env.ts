import "server-only";

import { publicConfig } from "./public-config";

/** Server-only configuration. Never import this module from a Client Component. */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  geminiInputPricePerMillion: Number(process.env.GEMINI_INPUT_PRICE_PER_MILLION ?? "0.30"),
  geminiOutputPricePerMillion: Number(process.env.GEMINI_OUTPUT_PRICE_PER_MILLION ?? "2.50"),
  vercelToken: process.env.VERCEL_TOKEN ?? "",
  vercelTeamId: process.env.VERCEL_TEAM_ID ?? "",
  vercelProjectId: process.env.VERCEL_PROJECT_ID ?? "",
  vercelProjectName: process.env.VERCEL_PROJECT_NAME ?? "demandforge-demos",
  cronSecret: process.env.CRON_SECRET ?? "",
  ownerSetupSecret: process.env.OWNER_SETUP_SECRET ?? "",
  appUrl: publicConfig.appUrl,
};

export function isSupabaseServerConfigured(): boolean {
  return Boolean(publicConfig.supabaseUrl && publicConfig.supabaseKey && serverEnv.supabaseServiceRoleKey);
}

export function isGeminiConfigured(): boolean {
  return Boolean(serverEnv.geminiApiKey);
}

export function isVercelConfigured(): boolean {
  return Boolean(serverEnv.vercelToken && (serverEnv.vercelProjectId || serverEnv.vercelProjectName));
}

export interface IntegrationStatus {
  supabase: { configured: boolean; missing: string[] };
  gemini: { configured: boolean; missing: string[] };
  vercel: { configured: boolean; missing: string[] };
  cron: { configured: boolean; missing: string[] };
}

/** Safe to render in the UI: names of missing variables only, never values. */
export function getIntegrationStatus(): IntegrationStatus {
  const supabaseMissing: string[] = [];
  if (!publicConfig.supabaseUrl) supabaseMissing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publicConfig.supabaseKey) supabaseMissing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!serverEnv.supabaseServiceRoleKey) supabaseMissing.push("SUPABASE_SERVICE_ROLE_KEY");

  const geminiMissing: string[] = [];
  if (!serverEnv.geminiApiKey) geminiMissing.push("GEMINI_API_KEY");

  const vercelMissing: string[] = [];
  if (!serverEnv.vercelToken) vercelMissing.push("VERCEL_TOKEN");
  if (!serverEnv.vercelProjectId && !serverEnv.vercelProjectName) {
    vercelMissing.push("VERCEL_PROJECT_ID");
  }

  const cronMissing: string[] = [];
  if (!serverEnv.cronSecret) cronMissing.push("CRON_SECRET");

  return {
    supabase: { configured: supabaseMissing.length === 0, missing: supabaseMissing },
    gemini: { configured: geminiMissing.length === 0, missing: geminiMissing },
    vercel: { configured: vercelMissing.length === 0, missing: vercelMissing },
    cron: { configured: cronMissing.length === 0, missing: cronMissing },
  };
}

export function getAppOrigin(): string {
  try {
    return new URL(serverEnv.appUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
}
