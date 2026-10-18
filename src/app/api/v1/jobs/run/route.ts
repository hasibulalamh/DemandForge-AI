import type { NextRequest } from "next/server";

import { ApiError, configError, jsonOk, safeRoute } from "@/lib/api/errors";
import { serverEnv } from "@/lib/env";
import { runWorker } from "@/lib/jobs/worker";
import { safeEqualString } from "@/lib/security/hash";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: NextRequest): void {
  if (!serverEnv.cronSecret) {
    throw configError("CRON_SECRET is not configured; the queue worker is disabled.");
  }
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${serverEnv.cronSecret}`;
  if (!safeEqualString(header, expected)) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid worker credentials.");
  }
}

async function handle(request: NextRequest) {
  return safeRoute(async () => {
    authorize(request);
    const summary = await runWorker({ maxJobs: 5, budgetMs: 45_000 });
    return jsonOk(summary);
  });
}

// Vercel Cron issues GET requests with the CRON_SECRET bearer token.
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
