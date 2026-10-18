import type { NextRequest } from "next/server";

import { jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { listLeads } from "@/features/leads/queries";
import { importLead, matchCollectionRule } from "@/features/leads/import";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { importLeadSchema, leadListQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`leads:list:${user.id}`, 120, 60_000);

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = leadListQuerySchema.parse(params);
    const result = await listLeads(filters);
    return jsonOk(result);
  });
}

export async function POST(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`leads:import:${user.id}`, 30, 60_000);

    const body = importLeadSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();

    const { data: rules } = await admin
      .from("collection_rules")
      .select("name, keywords, excluded_keywords, is_enabled")
      .eq("user_id", user.id);

    const result = await importLead(admin, user.id, body);
    const matchedRule = matchCollectionRule(body.originalText, rules ?? []);

    return jsonOk({ ...result, matchedRule }, { status: result.duplicate ? 200 : 201 });
  });
}

export const dynamic = "force-dynamic";
