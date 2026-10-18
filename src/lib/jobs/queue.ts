import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";
import { parseJobPayload, type JobType, type JobPayload } from "./types";

export interface EnqueueOptions<T extends JobType> {
  userId: string;
  type: T;
  payload: JobPayload<T>;
  idempotencyKey?: string | null;
  maxAttempts?: number;
  scheduledAt?: Date;
}

/**
 * Inserts a job. If the idempotency key already exists, the existing job is
 * returned unchanged so callers can safely repeat requests.
 */
export async function enqueueJob<T extends JobType>(
  options: EnqueueOptions<T>,
  adminClient?: ReturnType<typeof createSupabaseAdminClient>,
): Promise<{ job: Tables<"jobs">; duplicate: boolean }> {
  const admin = adminClient ?? createSupabaseAdminClient();

  // Validate before persisting: payloads never contain secrets.
  const payload = parseJobPayload(options.type, options.payload);

  const { data, error } = await admin
    .from("jobs")
    .insert({
      user_id: options.userId,
      job_type: options.type,
      payload,
      idempotency_key: options.idempotencyKey ?? null,
      max_attempts: Math.max(1, Math.min(options.maxAttempts ?? 3, 10)),
      scheduled_at: (options.scheduledAt ?? new Date()).toISOString(),
    })
    .select("*")
    .single();

  if (!error && data) return { job: data, duplicate: false };

  if (error?.code === "23505" && options.idempotencyKey) {
    const { data: existing, error: lookupError } = await admin
      .from("jobs")
      .select("*")
      .eq("idempotency_key", options.idempotencyKey)
      .maybeSingle();

    if (!lookupError && existing) return { job: existing, duplicate: true };
  }

  console.error("[jobs] enqueue failed", { code: error?.code });
  throw new Error("Could not enqueue the background job.");
}
