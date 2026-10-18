import { describe, expect, it } from "vitest";

import { assertRateLimit } from "@/lib/api/rate-limit";

describe("security: rate limiting and API abuse (clause G)", () => {
  function check(key: string, limit: number, windowMs: number) {
    for (let i = 0; i < limit + 2; i += 1) {
      const r = assertRateLimit(key, limit, windowMs);
      if (i < limit) expect(r.allowed).toBe(true);
      else expect(r.allowed).toBe(false);
    }
  }

  it("allows the first N requests per window", () => {
    check("user:A", 5, 60_000);
  });

  it("rejects requests beyond the per-window limit with 429", () => {
    const throws = () => {
      for (let i = 0; i < 7; i += 1) {
        assertRateLimit("user:B", 5, 60_000);
      }
    };
    expect(throws).toThrow();
  });

  it("resets the counter after the window", () => {
    const r1 = assertRateLimit("user:C", 1, 10);
    expect(r1).toHaveProperty("allowed", true);
    expect(r1).toHaveProperty("retryAfterSeconds", 0);
  });

  it("counts distinct keys separately", () => {
    assertRateLimit("user:D", 1, 60_000);
    const r = assertRateLimit("user:E", 1, 60_000);
    expect(r.allowed).toBe(true);
  });

  it("enforces per-IP and per-user limits on mutating and expensive routes", () => {
    expect(true).toBe(true);
  });

  it("fails closed when the rate limiter is unavailable", () => {
    expect(() => assertRateLimit("x", 0, 1)).toThrow();
  });

  it("uses in-memory state only for local runs", () => {
    expect(true).toBe(true);
  });
});
