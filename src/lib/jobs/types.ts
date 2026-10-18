import { z } from "zod";

export const jobPayloadSchemas = {
  analyze_lead: z.object({ leadId: z.string().uuid() }),
  generate_demo: z.object({ demoId: z.string().uuid() }),
  deploy_demo: z.object({ demoId: z.string().uuid(), deploymentId: z.string().uuid() }),
} as const;

export type JobType = keyof typeof jobPayloadSchemas;
export type JobPayload<T extends JobType> = z.infer<(typeof jobPayloadSchemas)[T]>;

export const JOB_TYPES = Object.keys(jobPayloadSchemas) as JobType[];

/** A failure that retries cannot fix (invalid input, missing credentials, unsafe artifact). */
export class NonRetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableJobError";
  }
}

export function isJobType(value: string): value is JobType {
  return (JOB_TYPES as string[]).includes(value);
}

export function parseJobPayload<T extends JobType>(type: T, payload: unknown): JobPayload<T> {
  return jobPayloadSchemas[type].parse(payload) as JobPayload<T>;
}

/** Exponential backoff, capped at one hour. attempt is 1-based. */
export function jobBackoffMs(attempt: number): number {
  const base = 30_000;
  return Math.min(base * 2 ** Math.max(0, attempt - 1), 3_600_000);
}

/** Safe error text for the database and UI: no tokens, bounded length. */
export function sanitizeJobError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown job error";
  const scrubbed = raw
    .replace(/(?:Bearer\s+)[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/(?:df_|sb_secret_|sb_publishable_)[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/(?:api[_-]?key|token|secret)\s*[:=]\s*\S+/gi, "$1=[redacted]");
  return scrubbed.slice(0, 500);
}
