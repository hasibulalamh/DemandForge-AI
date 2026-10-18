import "server-only";

import { after } from "next/server";

import { runWorker } from "./worker";

/**
 * Processes a small amount of queued work after the HTTP response. This makes
 * the UI feel immediate; the Vercel Cron entry point remains the durable
 * guarantee if the invocation is cut short.
 */
export function triggerQueueSoon(): void {
  try {
    after(async () => {
      try {
        await runWorker({ maxJobs: 2, budgetMs: 25_000 });
      } catch (error) {
        console.error("[jobs] opportunistic run failed", {
          name: error instanceof Error ? error.name : "Unknown",
        });
      }
    });
  } catch {
    // Not in a request scope (e.g. tests). The cron worker will pick the job up.
  }
}
