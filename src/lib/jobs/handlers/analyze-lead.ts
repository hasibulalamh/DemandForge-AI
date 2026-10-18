import "server-only";

import { recordAudit } from "@/lib/audit";
import { isGeminiConfigured } from "@/lib/env";
import { analyzeLead } from "@/lib/gemini/analysis";
import { createGeminiForUser } from "@/lib/gemini/service";
import { GeminiError } from "@/lib/gemini/types";
import type { JobContext } from "../context";
import { NonRetryableJobError, parseJobPayload } from "../types";

export async function handleAnalyzeLead({ job, admin }: JobContext): Promise<void> {
  const { leadId } = parseJobPayload("analyze_lead", job.payload);

  const { data: lead, error } = await admin
    .from("leads")
    .select("id, original_text, canonical_url, analysis_status")
    .eq("id", leadId)
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (error) throw new Error("Could not load the lead for analysis.");
  if (!lead) throw new NonRetryableJobError("Lead not found or no longer belongs to this user.");

  if (!isGeminiConfigured()) {
    await admin.from("leads").update({ analysis_status: "failed" }).eq("id", lead.id);
    throw new NonRetryableJobError("Gemini is not configured. Set GEMINI_API_KEY.");
  }

  await admin.from("leads").update({ analysis_status: "analyzing" }).eq("id", lead.id);

  const { client, recordUsage, model } = createGeminiForUser(job.user_id);

  try {
    const result = await analyzeLead(
      {
        originalText: lead.original_text,
        canonicalUrl: lead.canonical_url,
      },
      client,
    );

    await recordUsage({
      operation: "lead_analysis",
      model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      status: "success",
    });

    const { error: updateError } = await admin
      .from("leads")
      .update(result.dbUpdate)
      .eq("id", lead.id)
      .eq("user_id", job.user_id);

    if (updateError) throw new Error("Could not save the analysis result.");

    await recordAudit(admin, {
      userId: job.user_id,
      actorType: "worker",
      action: "lead.analyzed",
      entityType: "lead",
      entityId: lead.id,
      metadata: {
        leadScore: result.score.total,
        confidence: result.analysis.confidence,
        category: result.analysis.category,
        jobId: job.id,
      },
    });
  } catch (caught) {
    await recordUsage({
      operation: "lead_analysis",
      model,
      inputTokens: 0,
      outputTokens: 0,
      status: "error",
      errorCode: caught instanceof GeminiError ? caught.code : "unknown",
    });
    await admin.from("leads").update({ analysis_status: "failed" }).eq("id", lead.id);
    throw caught;
  }
}
