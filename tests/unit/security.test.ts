import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/api/origin";
import { rateLimit, resetRateLimits } from "@/lib/api/rate-limit";
import { generateApiToken } from "@/lib/security/api-token";
import { sha256Hex } from "@/lib/security/hash";

function requestLike(init: { method: string; origin?: string; fetchSite?: string }): NextRequest {
  const headers = new Headers();
  if (init.origin) headers.set("origin", init.origin);
  if (init.fetchSite) headers.set("sec-fetch-site", init.fetchSite);
  return {
    method: init.method,
    headers,
    nextUrl: new URL("http://localhost:3000/api/v1/leads"),
  } as unknown as NextRequest;
}

describe("assertSameOrigin", () => {
  it("allows safe methods without an origin", () => {
    expect(() => assertSameOrigin(requestLike({ method: "GET" }))).not.toThrow();
  });

  it("allows same-origin mutations", () => {
    expect(() =>
      assertSameOrigin(requestLike({ method: "POST", origin: "http://localhost:3000" })),
    ).not.toThrow();
  });

  it("rejects missing origins on mutations", () => {
    expect(() => assertSameOrigin(requestLike({ method: "POST" }))).toThrowError(/Origin header/);
  });

  it("rejects cross-origin and cross-site mutations", () => {
    expect(() =>
      assertSameOrigin(requestLike({ method: "POST", origin: "https://evil.example" })),
    ).toThrowError(/not allowed/);
    expect(() =>
      assertSameOrigin(
        requestLike({ method: "POST", origin: "http://localhost:3000", fetchSite: "cross-site" }),
      ),
    ).toThrowError(/Cross-site/);
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    resetRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRateLimits();
  });

  it("allows requests up to the limit and then blocks", () => {
    for (let index = 0; index < 3; index += 1) {
      expect(rateLimit("user-a", 3, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit("user-a", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    rateLimit("user-a", 1, 60_000);
    expect(rateLimit("user-a", 1, 60_000).allowed).toBe(false);
    expect(rateLimit("user-b", 1, 60_000).allowed).toBe(true);
  });

  it("resets after the window", () => {
    rateLimit("user-a", 1, 60_000);
    expect(rateLimit("user-a", 1, 60_000).allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit("user-a", 1, 60_000).allowed).toBe(true);
  });
});

describe("generateApiToken", () => {
  it("creates a high-entropy df_ token and stores only its hash", () => {
    const generated = generateApiToken();
    expect(generated.token).toMatch(/^df_[A-Za-z0-9_-]{40,}$/);
    expect(generated.tokenHash).toBe(sha256Hex(generated.token));
    expect(generated.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(generated.tokenPrefix).toBe(generated.token.slice(0, 12));
    expect(generated.token.includes(generated.tokenHash)).toBe(false);
  });

  it("never repeats a token", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateApiToken().token));
    expect(tokens.size).toBe(20);
  });
});

describe("integration status", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reports missing variables by name without values", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("VERCEL_TOKEN", "");
    vi.stubEnv("VERCEL_PROJECT_ID", "");
    vi.stubEnv("VERCEL_PROJECT_NAME", "");
    vi.stubEnv("CRON_SECRET", "");
    vi.resetModules();

    const { getIntegrationStatus } = await import("@/lib/env");
    const status = getIntegrationStatus();

    expect(status.supabase.configured).toBe(false);
    expect(status.supabase.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(status.gemini.missing).toEqual(["GEMINI_API_KEY"]);
    expect(status.vercel.configured).toBe(false);
    expect(status.cron.missing).toEqual(["CRON_SECRET"]);
  });

  it("marks integrations configured when all variables exist", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("GEMINI_API_KEY", "gemini-test");
    vi.stubEnv("VERCEL_TOKEN", "vercel-test");
    vi.stubEnv("VERCEL_PROJECT_ID", "prj_test");
    vi.stubEnv("CRON_SECRET", "cron-test");
    vi.resetModules();

    const { getIntegrationStatus } = await import("@/lib/env");
    const status = getIntegrationStatus();

    expect(status.supabase.configured).toBe(true);
    expect(status.gemini.configured).toBe(true);
    expect(status.vercel.configured).toBe(true);
    expect(status.cron.configured).toBe(true);
  });
});
