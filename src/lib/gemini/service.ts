import "server-only";

import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createGeminiClient } from "./client";
import type { UsageRecorder } from "./types";

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const input = (inputTokens / 1_000_000) * serverEnv.geminiInputPricePerMillion;
  const output = (outputTokens / 1_000_000) * serverEnv.geminiOutputPricePerMillion;
  return Math.round((input + output) * 1_000_000) / 1_000_000;
}

/** Usage is best-effort telemetry: failures are logged, never fatal. */
export function createUsageRecorder(userId: string): UsageRecorder {
  return async (usage) => {
    try {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.from("ai_usage").insert({
        user_id: userId,
        provider: "google",
        model: usage.model,
        operation: usage.operation,
        input_usage: Math.max(0, Math.round(usage.inputTokens)),
        output_usage: Math.max(0, Math.round(usage.outputTokens)),
        estimated_cost: estimateCostUsd(usage.inputTokens, usage.outputTokens),
        status: usage.status,
        error_code: usage.errorCode ?? null,
      });
      if (error) {
        console.warn("[gemini] could not record usage", { code: error.code });
      }
    } catch {
      console.warn("[gemini] usage recorder unavailable");
    }
  };
}

export function createGeminiForUser(userId: string) {
  const client = createGeminiClient();
  return { client, recordUsage: createUsageRecorder(userId), model: client.modelName };
}
