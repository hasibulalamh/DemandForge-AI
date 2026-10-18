import { describe, expect, it } from "vitest";

import { enqueueJob } from "@/lib/jobs/queue";
import {
  isJobType,
  jobBackoffMs,
  parseJobPayload,
  sanitizeJobError,
  NonRetryableJobError,
} from "@/lib/jobs/types";
import type { AdminClient } from "@/lib/jobs/context";
import { createFakeAdmin } from "./fakes/admin";

const leadId = "22222222-2222-4222-8222-222222222222";

describe("job payloads", () => {
  it("accepts valid payloads per type", () => {
    expect(parseJobPayload("analyze_lead", { leadId })).toEqual({ leadId });
    expect(
      parseJobPayload("deploy_demo", {
        demoId: "44444444-4444-4444-8444-444444444444",
        deploymentId: "55555555-5555-4555-8555-555555555555",
      }),
    ).toHaveProperty("demoId");
  });

  it("rejects invalid payloads before they reach the queue", () => {
    expect(() => parseJobPayload("analyze_lead", { leadId: "nope" })).toThrow();
    expect(() => parseJobPayload("generate_demo", {})).toThrow();
    expect(() => parseJobPayload("deploy_demo", { demoId: leadId })).toThrow();
  });

  it("recognizes only registered job types", () => {
    expect(isJobType("analyze_lead")).toBe(true);
    expect(isJobType("run_arbitrary_code")).toBe(false);
  });
});

describe("jobBackoffMs", () => {
  it("grows exponentially and caps at one hour", () => {
    expect(jobBackoffMs(1)).toBe(30_000);
    expect(jobBackoffMs(2)).toBe(60_000);
    expect(jobBackoffMs(3)).toBe(120_000);
    expect(jobBackoffMs(20)).toBe(3_600_000);
  });
});

describe("sanitizeJobError", () => {
  it("redacts tokens and bearer headers", () => {
    const message = sanitizeJobError(
      new Error("failed with Bearer abc.def.ghi and df_secret-token and api_key=sk_live_123"),
    );
    expect(message).not.toContain("abc.def.ghi");
    expect(message).not.toContain("df_secret-token");
    expect(message).not.toContain("sk_live_123");
    expect(message).toContain("[redacted]");
  });

  it("bounds the message length", () => {
    expect(sanitizeJobError(new Error("x".repeat(2000))).length).toBe(500);
  });

  it("handles non-Error values", () => {
    expect(sanitizeJobError("boom")).toBe("Unknown job error");
  });
});

describe("NonRetryableJobError", () => {
  it("is identifiable so the worker stops retrying", () => {
    const error = new NonRetryableJobError("missing credentials");
    expect(error.name).toBe("NonRetryableJobError");
    expect(error instanceof Error).toBe(true);
  });
});

describe("enqueueJob", () => {
  it("persists a validated payload and defaults", async () => {
    const admin = createFakeAdmin({ jobs: [] }) as unknown as AdminClient;
    const { job, duplicate } = await enqueueJob(
      {
        userId: "user-a",
        type: "analyze_lead",
        payload: { leadId },
      },
      admin,
    );

    expect(duplicate).toBe(false);
    expect(job.job_type).toBe("analyze_lead");
    expect(job.status).toBe("queued");
    expect(job.payload).toEqual({ leadId });
  });

  it("returns the existing job for a repeated idempotency key", async () => {
    const admin = createFakeAdmin({ jobs: [] }) as unknown as AdminClient;
    const first = await enqueueJob(
      {
        userId: "user-a",
        type: "analyze_lead",
        payload: { leadId },
        idempotencyKey: `analyze:${leadId}`,
      },
      admin,
    );
    const second = await enqueueJob(
      {
        userId: "user-a",
        type: "analyze_lead",
        payload: { leadId },
        idempotencyKey: `analyze:${leadId}`,
      },
      admin,
    );

    expect(second.duplicate).toBe(true);
    expect(second.job.id).toBe(first.job.id);
  });
});
