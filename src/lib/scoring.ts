import type { BudgetStatus, SignalLevel } from "@/types/database";

/**
 * Transparent lead scoring.
 *
 * The model extracts signals; this function decides priority. Every factor has a
 * fixed maximum contribution, so a score can always be explained to the user.
 * Unknown signals contribute zero rather than a guessed average.
 */
export const SCORING_WEIGHTS = {
  hiringIntent: 25,
  requirementsClarity: 15,
  budget: 15,
  urgency: 10,
  requiredFeatures: 15,
  techSpecificity: 10,
  confidence: 10,
} as const;

export interface LeadScoreInput {
  hiringIntent: SignalLevel;
  budgetStatus: BudgetStatus;
  urgency: SignalLevel;
  requirementsClarity: number;
  requiredFeatureCount: number;
  technologyPreferenceCount: number;
  confidence: number;
}

export type ScoreFactor = keyof typeof SCORING_WEIGHTS;

// A type alias (not an interface) keeps the implicit index signature required
// when this value is stored in a JSONB column.
export type LeadScoreBreakdown = {
  total: number;
  factors: Record<ScoreFactor, number>;
  max: Record<ScoreFactor, number>;
  reasons: string[];
};

const SIGNAL_FRACTION: Record<SignalLevel, number> = {
  unknown: 0,
  low: 0.3,
  medium: 0.7,
  high: 1,
};

const BUDGET_FRACTION: Record<BudgetStatus, number> = {
  unknown: 0,
  unclear: 0.25,
  range: 0.6,
  stated: 1,
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function scoreLead(input: LeadScoreInput): LeadScoreBreakdown {
  const clarity = clampPercent(input.requirementsClarity);
  const confidence = clampPercent(input.confidence);
  const featureFraction = Math.min(Math.max(input.requiredFeatureCount, 0) / 6, 1);
  const techFraction = Math.min(Math.max(input.technologyPreferenceCount, 0) / 2, 1);

  const fractions: Record<ScoreFactor, number> = {
    hiringIntent: SIGNAL_FRACTION[input.hiringIntent] ?? 0,
    requirementsClarity: clarity / 100,
    budget: BUDGET_FRACTION[input.budgetStatus] ?? 0,
    urgency: SIGNAL_FRACTION[input.urgency] ?? 0,
    requiredFeatures: featureFraction,
    techSpecificity: techFraction,
    confidence: confidence / 100,
  };

  const factors = {} as Record<ScoreFactor, number>;
  const max = {} as Record<ScoreFactor, number>;
  let rawTotal = 0;

  for (const [factor, weight] of Object.entries(SCORING_WEIGHTS) as [ScoreFactor, number][]) {
    const points = round(fractions[factor] * weight);
    factors[factor] = points;
    max[factor] = weight;
    rawTotal += points;
  }

  const total = clampPercent(rawTotal);

  const reasons: string[] = [];
  reasons.push(
    `Hiring intent ${input.hiringIntent} contributes ${factors.hiringIntent}/${max.hiringIntent}.`,
  );
  reasons.push(
    `Requirements clarity ${clarity}/100 contributes ${factors.requirementsClarity}/${max.requirementsClarity}.`,
  );
  reasons.push(`Budget signal "${input.budgetStatus}" contributes ${factors.budget}/${max.budget}.`);
  reasons.push(`Urgency ${input.urgency} contributes ${factors.urgency}/${max.urgency}.`);
  reasons.push(
    `${Math.max(input.requiredFeatureCount, 0)} required feature(s) contribute ${factors.requiredFeatures}/${max.requiredFeatures}.`,
  );
  reasons.push(
    `${Math.max(input.technologyPreferenceCount, 0)} explicit technology preference(s) contribute ${factors.techSpecificity}/${max.techSpecificity}.`,
  );
  reasons.push(
    `Extraction confidence ${confidence}/100 contributes ${factors.confidence}/${max.confidence}.`,
  );

  return { total, factors, max, reasons };
}

/** Qualitative label used in the UI. Thresholds are documented and stable. */
export function scoreBand(score: number | null | undefined): "unscored" | "low" | "medium" | "high" {
  if (score === null || score === undefined) return "unscored";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
