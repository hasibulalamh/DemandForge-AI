import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.object({
  status: z.enum(["queued", "running", "succeeded", "failed", "canceled"]).optional(),
  type: z.enum(["analyze_lead", "generate_demo", "deploy_demo"]).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`jobs:list:${user.id}`, 120, 60_000);

    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const supabase = await createSupabaseServerClient();

    let builder = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (query.status) builder = builder.eq("status", query.status);
    if (query.type) builder = builder.eq("job_type", query.type);

    const from = (query.page - 1) * query.pageSize;
    const { data, count, error } = await builder.range(from, from + query.pageSize - 1);
    if (error) throw new Error("Could not load jobs.");

    return jsonOk({ jobs: data ?? [], total: count ?? 0, page: query.page, pageSize: query.pageSize });
  });
}
