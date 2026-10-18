import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { authenticateApiToken } from "@/lib/security/api-token";
import { importLead, matchCollectionRule } from "@/features/leads/import";
import { enqueueJob } from "@/lib/jobs/queue";
import { triggerQueueSoon } from "@/lib/jobs/trigger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { importLeadSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const extensionImportSchema = importLeadSchema.extend({
  autoAnalyze: z.boolean().default(false),
});

/** Rules and sources for the extension popup (read-only, token scoped). */
export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await authenticateApiToken(request);
    assertRateLimit(`ext:read:${user.id}`, 60, 60_000);

    const admin = createSupabaseAdminClient();
    const [rules, sources] = await Promise.all([
      admin
        .from("collection_rules")
        .select("id, name, keywords, excluded_keywords, is_enabled")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("sources")
        .select("id, source_name, source_type, connection_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    return jsonOk({ rules: rules.data ?? [], sources: sources.data ?? [] });
  });
}

export async function POST(request: NextRequest) {
  return safeRoute(async () => {
    const user = await authenticateApiToken(request);
    assertRateLimit(`ext:import:${user.id}`, 30, 60_000);

    const body = extensionImportSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();

    const { data: rules } = await admin
      .from("collection_rules")
      .select("name, keywords, excluded_keywords, is_enabled")
      .eq("user_id", user.id);

    const result = await importLead(admin, user.id, {
      sourceId: body.sourceId ?? null,
      canonicalUrl: body.canonicalUrl ?? null,
      originalText: body.originalText,
      externalReference: body.externalReference ?? null,
      publishedAt: body.publishedAt ?? null,
    });

    const matchedRule = matchCollectionRule(body.originalText, rules ?? []);
    let jobId: string | null = null;

    if (body.autoAnalyze && !result.duplicate) {
      const { job } = await enqueueJob({
        userId: user.id,
        type: "analyze_lead",
        payload: { leadId: result.leadId },
        idempotencyKey: `analyze:${result.leadId}:import`,
        maxAttempts: 3,
      });
      jobId = job.id;
      triggerQueueSoon();
    }

    return jsonOk({ ...result, matchedRule, jobId }, { status: result.duplicate ? 200 : 201 });
  });
}
