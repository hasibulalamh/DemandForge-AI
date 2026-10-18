import type { NextRequest } from "next/server";

import { getAppOrigin } from "@/lib/env";
import { ApiError } from "./errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie-authenticated mutations. Bearer-token requests made by
 * the extension do not rely on cookies and are exempted by the caller.
 */
export function assertSameOrigin(request: NextRequest): void {
  if (SAFE_METHODS.has(request.method)) return;

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!origin) {
    // A browser mutation without Origin is either same-origin navigation or a
    // non-browser client. Reject to avoid accepting forged form posts.
    throw new ApiError(403, "ORIGIN_REQUIRED", "Requests must include a valid Origin header.");
  }

  const allowed = new Set([getAppOrigin()]);
  try {
    allowed.add(request.nextUrl.origin);
  } catch {
    // nextUrl is always available for NextRequest; guard for tests.
  }

  if (!allowed.has(origin)) {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed to make this request.");
  }

  if (fetchSite && fetchSite === "cross-site") {
    throw new ApiError(403, "CROSS_SITE_REQUEST", "Cross-site requests are not allowed.");
  }
}
