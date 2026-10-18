import { scoreLead, type LeadScoreBreakdown } from "@/lib/scoring";
import type { BudgetStatus, TablesUpdate } from "@/types/database";

import { ANALYSIS_SYSTEM_INSTRUCTION, buildAnalysisPrompt } from "./prompts";
import { leadAnalysisResponseSchema, leadAnalysisSchema, type LeadAnalysisOutput } from "./schemas";
import type { GeminiUsage, StructuredGenerator } from "./types";

export interface LeadAnalysisInput {
  originalText: string;
  canonicalUrl: string | null;
  sourceName?: string | null;
}

export interface NormalizedBudget {
  status: BudgetStatus;
  amount: number | null;
  currency: string | null;
}

export interface LeadAnalysisResult {
  analysis: LeadAnalysisOutput;
  budget: NormalizedBudget;
  score: LeadScoreBreakdown;
  dbUpdate: TablesUpdate<"leads">;
  usage: GeminiUsage;
}

/**
 * Budget values are only stored when both an amount and a currency are present.
 * Otherwise the signal is downgraded instead of guessing a currency.
 */
export function normalizeBudget(output: LeadAnalysisOutput): NormalizedBudget {
  if (output.budgetStatus === "unknown" || output.budgetStatus === "unclear") {
    return { status: output.budgetStatus, amount: null, currency: null };
  }

  const amount = output.budgetAmount ?? null;
  const currency = output.budgetCurrency ?? null;

  if (amount === null || !currency) {
    return { status: "unclear", amount: null, currency: null };
  }

  return { status: output.budgetStatus, amount, currency };
}

export async function analyzeLead(
  input: LeadAnalysisInput,
  generator: StructuredGenerator,
): Promise<LeadAnalysisResult> {
  const { data, usage } = await generator.generateStructured({
    operation: "lead_analysis",
    systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
    prompt: buildAnalysisPrompt(input),
    responseSchema: leadAnalysisResponseSchema,
    validate: (value) => leadAnalysisSchema.parse(value),
    maxOutputTokens: 3072,
    temperature: 0.1,
  });

  const budget = normalizeBudget(data);

  const score = scoreLead({
    hiringIntent: data.hiringIntent,
    budgetStatus: budget.status,
    urgency: data.urgency,
    requirementsClarity: data.requirementsClarity,
    requiredFeatureCount: data.requiredFeatures.length,
    technologyPreferenceCount: data.technologyPreferences.length,
    confidence: data.confidence,
  });

  const evidence = {
    sourceUrl: input.canonicalUrl,
    quotes: data.evidence,
    budgetQuote: data.budgetQuote || null,
    urgencyQuote: data.urgencyQuote || null,
    hiringIntentQuote: data.hiringIntentQuote || null,
    suggestedNextAction: data.suggestedNextAction,
    demoScope: data.demoScope,
    demoTemplate: data.demoTemplate,
    scoreBreakdown: score,
    analyzedAt: new Date().toISOString(),
    scoringWeightsVersion: 1,
  };

  const dbUpdate: TablesUpdate<"leads"> = {
    project_category: data.category,
    project_title: data.title,
    project_summary: data.summary,
    required_features: data.requiredFeatures,
    suggested_features: data.suggestedFeatures,
    technology_preferences: data.technologyPreferences,
    budget_status: budget.status,
    budget_amount: budget.amount,
    budget_currency: budget.currency,
    urgency: data.urgency,
    hiring_intent: data.hiringIntent,
    requirements_clarity: data.requirementsClarity,
    confidence_score: data.confidence,
    lead_score: score.total,
    evidence,
    analysis_status: "analyzed",
  };

  return { analysis: data, budget, score, dbUpdate, usage };
}
