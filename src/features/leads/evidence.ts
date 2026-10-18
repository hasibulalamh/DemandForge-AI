import type { Json } from "@/types/database";

export interface EvidenceQuote {
  claim: string;
  quote: string;
}

export interface ScoreBreakdownView {
  total: number;
  factors: Record<string, number>;
  max: Record<string, number>;
  reasons: string[];
}

export interface LeadEvidenceView {
  quotes: EvidenceQuote[];
  scoreBreakdown: ScoreBreakdownView | null;
  suggestedNextAction: string | null;
  demoScope: string | null;
  demoTemplate: string | null;
  budgetQuote: string | null;
  urgencyQuote: string | null;
  hiringIntentQuote: string | null;
  analyzedAt: string | null;
  sourceUrl: string | null;
}

export interface FeatureView {
  name: string;
  detail: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFeatures(value: Json): FeatureView[] {
  if (!Array.isArray(value)) return [];
  const features: FeatureView[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.name !== "string") continue;
    const detail =
      typeof item.quote === "string"
        ? item.quote
        : typeof item.reason === "string"
          ? item.reason
          : typeof item.description === "string"
            ? item.description
            : "";
    features.push({ name: item.name, detail });
  }
  return features;
}

export function parseEvidence(value: Json): LeadEvidenceView {
  const empty: LeadEvidenceView = {
    quotes: [],
    scoreBreakdown: null,
    suggestedNextAction: null,
    demoScope: null,
    demoTemplate: null,
    budgetQuote: null,
    urgencyQuote: null,
    hiringIntentQuote: null,
    analyzedAt: null,
    sourceUrl: null,
  };

  if (!isRecord(value)) return empty;

  const quotes: EvidenceQuote[] = Array.isArray(value.quotes)
    ? value.quotes
        .filter(
          (item): item is { claim: string; quote: string } =>
            isRecord(item) && typeof item.claim === "string" && typeof item.quote === "string",
        )
        .slice(0, 12)
    : [];

  let scoreBreakdown: ScoreBreakdownView | null = null;
  if (isRecord(value.scoreBreakdown)) {
    const raw = value.scoreBreakdown;
    if (typeof raw.total === "number" && isRecord(raw.factors) && isRecord(raw.max)) {
      const factors: Record<string, number> = {};
      const max: Record<string, number> = {};
      for (const [key, points] of Object.entries(raw.factors)) {
        if (typeof points === "number") factors[key] = points;
      }
      for (const [key, points] of Object.entries(raw.max)) {
        if (typeof points === "number") max[key] = points;
      }
      scoreBreakdown = {
        total: raw.total,
        factors,
        max,
        reasons: Array.isArray(raw.reasons)
          ? raw.reasons.filter((reason): reason is string => typeof reason === "string")
          : [],
      };
    }
  }

  const text = (key: string): string | null =>
    typeof value[key] === "string" ? (value[key] as string) : null;

  return {
    quotes,
    scoreBreakdown,
    suggestedNextAction: text("suggestedNextAction"),
    demoScope: text("demoScope"),
    demoTemplate: text("demoTemplate"),
    budgetQuote: text("budgetQuote"),
    urgencyQuote: text("urgencyQuote"),
    hiringIntentQuote: text("hiringIntentQuote"),
    analyzedAt: text("analyzedAt"),
    sourceUrl: text("sourceUrl"),
  };
}
