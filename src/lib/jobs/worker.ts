import "server-only";

import { randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";
import type { JobHandler } from "./context";
import { handleAnalyzeLead } from "./handlers/analyze-lead";
import { handleDeployDemo } from "./handlers/deploy-demo";
import { handleGenerateDemo } from "./handlers/generate-demo";
import { isJobType, jobBackoffMs, NonRetryableJobError, sanitizeJobError, type JobType } from "./types";

const HANDLERS: Record<JobType, JobHandler> = {
  analyze_lead: handleAnalyzeLead,
  generate_demo: handleGenerateDemo,
  deploy_demo: handleDeployDemo,
};

export interface WorkerOptions {
  maxJobs?: number;
  budgetMs?: number;
  workerId?: string;
  jobTypes?: JobType[];
  lockSeconds?: number;
}

export interface WorkerSummary {
  workerId: string;
  recovered: number;
  claimed: number;
  succeeded: number;
  failed: number;
  retried: number;
  durationMs: number;
}

/**
 * Claims and processes a bounded amount of work. Each job is claimed
 * individually with `FOR UPDATE SKIP LOCKED`, so a crash cannot strand a batch
 * of already-claimed jobs.
 */
export async function runWorker(options: WorkerOptions = {}): Promise<WorkerSummary> {
  const admin = createSupabaseAdminClient();
  const workerId = options.workerId ?? `worker_${randomUUID()}`;
  const budgetMs = Math.max(5_000, options.budgetMs ?? 45_000);
  const maxJobs = Math.max(1, Math.min(options.maxJobs ?? 5, 25));
  const startedAt = Date.now();

  const summary: WorkerSummary = {
    workerId,
    recovered: 0,
    claimed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    durationMs: 0,
  };

  const { data: recovered, error: recoverError } = await admin.rpc("recover_stale_jobs", {
    p_lock_seconds: options.lockSeconds ?? 300,
  });
  if (recoverError) {
    console.warn("[jobs] stale recovery failed", { code: recoverError.code });
  } else if (typeof recovered === "number") {
    summary.recovered = recovered;
  }

  for (let index = 0; index < maxJobs; index += 1) {
    if (Date.now() - startedAt > budgetMs) break;

    const { data, error } = await admin.rpc("claim_jobs", {
      p_worker_id: workerId,
      p_limit: 1,
      p_job_types: options.jobTypes ?? null,
      p_lock_seconds: options.lockSeconds ?? 300,
    });

    if (error) {
      console.error("[jobs] claim failed", { code: error.code });
      break;
    }

    const job = (data?.[0] ?? null) as Tables<"jobs"> | null;
    if (!job) break;

    summary.claimed += 1;

    await admin.from("job_attempts").insert({
      job_id: job.id,
      attempt: job.attempt_count,
      worker_id: workerId,
      status: "running",
    });

    try {
      if (!isJobType(job.job_type)) {
        throw new NonRetryableJobError(`Unsupported job type: ${job.job_type}`);
      }
      await HANDLERS[job.job_type]({ job, admin, workerId });

      await admin
        .from("jobs")
        .update({
          status: "succeeded",
          completed_at: new Date().toISOString(),
          last_error: null,
          locked_by: null,
          locked_at: null,
        })
        .eq("id", job.id)
        .eq("locked_by", workerId);

      await admin
        .from("job_attempts")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("job_id", job.id)
        .eq("attempt", job.attempt_count);

      summary.succeeded += 1;
    } catch (caught) {
      const message = sanitizeJobError(caught);
      const isFinal = caught instanceof NonRetryableJobError || job.attempt_count >= job.max_attempts;

      if (isFinal) {
        await admin
          .from("jobs")
          .update({
            status: "failed",
            last_error: message,
            completed_at: new Date().toISOString(),
            locked_by: null,
            locked_at: null,
          })
          .eq("id", job.id)
          .eq("locked_by", workerId);
        summary.failed += 1;
      } else {
        await admin
          .from("jobs")
          .update({
            status: "queued",
            last_error: message,
            scheduled_at: new Date(Date.now() + jobBackoffMs(job.attempt_count)).toISOString(),
            locked_by: null,
            locked_at: null,
          })
          .eq("id", job.id)
          .eq("locked_by", workerId);
        summary.retried += 1;
      }

      await admin
        .from("job_attempts")
        .update({ status: "failed", finished_at: new Date().toISOString(), error: message })
        .eq("job_id", job.id)
        .eq("attempt", job.attempt_count);

      console.warn("[jobs] job failed", {
        jobId: job.id,
        type: job.job_type,
        final: isFinal,
        code: caught instanceof NonRetryableJobError ? "non_retryable" : "retryable",
      });
    }
  }

  summary.durationMs = Date.now() - startedAt;
  return summary;
}
