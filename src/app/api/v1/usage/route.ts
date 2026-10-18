import type { NextRequest } from "next/server";

import { jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { getUsageSummary } from "@/features/usage/queries";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`usage:${user.id}`, 60, 60_000);
    return jsonOk(await getUsageSummary());
  });
}
