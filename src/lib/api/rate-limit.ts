/**
 * Fixed-window rate limiter.
 *
 * Limitation (documented in docs/SECURITY.md): state is per serverless instance,
 * not global. It raises the cost of naive abuse (mass imports, repeated AI calls)
 * but a distributed limiter would be required for strict guarantees. The durable
 * job queue provides a second line of defence for expensive operations.
 */

import { ApiError } from "./errors";

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimiter = globalThis as unknown as { __demandforgeRateLimits?: Map<string, Bucket> };
const buckets = (globalForLimiter.__demandforgeRateLimits ??= new Map<string, Bucket>());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0, limit };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;

  if (buckets.size > 5_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
    limit,
  };
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function assertRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const result = rateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down and try again.", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return result;
}
