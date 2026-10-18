import "server-only";

import { recordAudit } from "@/lib/audit";
import type { AdminClient } from "@/lib/jobs/context";
import { canonicalizeUrl, computeContentHash } from "@/lib/security/hash";
import type { Json } from "@/types/database";

export interface ImportLeadInput {
  sourceId?: string | null;
  canonicalUrl?: string | null;
  originalText: string;
  externalReference?: string | null;
  publishedAt?: string | null;
}

export interface ImportLeadResult {
  duplicate: boolean;
  leadId: string;
  analysisStatus: string;
}

function parsePublishedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Imports one lead for an already-authenticated user. `user_id` is always taken
 * from the authenticated identity, never from the request body. Duplicate
 * detection uses the canonical URL first, then the normalized content hash.
 */
export async function importLead(
  admin: AdminClient,
  userId: string,
  input: ImportLeadInput,
): Promise<ImportLeadResult> {
  const canonicalUrl = canonicalizeUrl(input.canonicalUrl);
  const hash = computeContentHash(input.originalText);

  if (input.sourceId) {
    const { data: source } = await admin
      .from("sources")
      .select("id")
      .eq("id", input.sourceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!source) {
      throw new Error("The selected source does not belong to this user.");
    }
  }

  if (canonicalUrl) {
    const { data: byUrl } = await admin
      .from("leads")
      .select("id, analysis_status")
      .eq("user_id", userId)
      .eq("canonical_url", canonicalUrl)
      .maybeSingle();

    if (byUrl) {
      return { duplicate: true, leadId: byUrl.id, analysisStatus: byUrl.analysis_status };
    }
  }

  const { data: byHash } = await admin
    .from("leads")
    .select("id, analysis_status")
    .eq("user_id", userId)
    .eq("normalized_content_hash", hash)
    .maybeSingle();

  if (byHash) {
    return { duplicate: true, leadId: byHash.id, analysisStatus: byHash.analysis_status };
  }

  const evidence: Json = {
    importedAt: new Date().toISOString(),
    importChannel: input.externalReference ? "extension" : "manual",
    originalUrl: canonicalUrl,
  };

  const { data: inserted, error } = await admin
    .from("leads")
    .insert({
      user_id: userId,
      source_id: input.sourceId ?? null,
      canonical_url: canonicalUrl,
      external_reference: input.externalReference ?? null,
      original_text: input.originalText,
      normalized_content_hash: hash,
      published_at: parsePublishedAt(input.publishedAt),
      evidence,
      analysis_status: "pending",
    })
    .select("id, analysis_status")
    .single();

  if (inserted) {
    await recordAudit(admin, {
      userId,
      action: "lead.imported",
      entityType: "lead",
      entityId: inserted.id,
      metadata: {
        channel: input.externalReference ? "extension" : "manual",
        hasUrl: Boolean(canonicalUrl),
      },
    });
    return { duplicate: false, leadId: inserted.id, analysisStatus: inserted.analysis_status };
  }

  // Unique-violation race: another request inserted the same lead concurrently.
  if (error?.code === "23505") {
    const { data: existing } = await admin
      .from("leads")
      .select("id, analysis_status")
      .eq("user_id", userId)
      .eq("normalized_content_hash", hash)
      .maybeSingle();

    if (existing) {
      return { duplicate: true, leadId: existing.id, analysisStatus: existing.analysis_status };
    }
  }

  throw new Error("Could not import the lead.");
}

/** Basic keyword-rule matching used for the extension's relevance hint. */
export function matchCollectionRule(
  text: string,
  rules: Array<{ name: string; keywords: string[]; excluded_keywords: string[]; is_enabled: boolean }>,
): string | null {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (!rule.is_enabled) continue;
    if (rule.excluded_keywords.some((word) => word && lower.includes(word.toLowerCase()))) continue;
    if (rule.keywords.some((word) => word && lower.includes(word.toLowerCase()))) {
      return rule.name;
    }
  }
  return null;
}
