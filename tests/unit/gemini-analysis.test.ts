import { describe, expect, it, vi } from "vitest";

import { analyzeLead, normalizeBudget } from "@/lib/gemini/analysis";
import { leadAnalysisSchema, type LeadAnalysisOutput } from "@/lib/gemini/schemas";
import type { StructuredGenerator } from "@/lib/gemini/types";
import { scoreLead } from "@/lib/scoring";

function analysisFixture(overrides: Partial<LeadAnalysisOutput> = {}): LeadAnalysisOutput {
  return leadAnalysisSchema.parse({
    category: "web_development",
    title: "Dental clinic website",
    summary: "Five page site with appointment booking for a dental clinic.",
    requiredFeatures: [
      { name: "Appointment booking", quote: "Need online appointment booking" },
      { name: "Contact form", quote: "and contact form" },
    ],
    suggestedFeatures: [{ name: "Google Maps embed", reason: "Local visitors need directions" }],
    technologyPreferences: [{ name: "WordPress", quote: "WordPress or plain HTML" }],
    budgetStatus: "stated",
    budgetAmount: 1200,
    budgetCurrency: "usd",
    budgetQuote: "Budget around $1200",
    urgency: "high",
    urgencyQuote: "need it in 3 weeks",
    hiringIntent: "high",
    hiringIntentQuote: "Please DM if interested",
    requirementsClarity: 80,
    confidence: 82,
    evidence: [{ claim: "Stated budget", quote: "Budget around $1200" }],
    suggestedNextAction: "Send a short concept of the booking flow.",
    demoScope: "Single page concept with booking section.",
    demoTemplate: "local-service",
    ...overrides,
  });
}

function generatorFor(output: LeadAnalysisOutput): StructuredGenerator {
  return {
    generateStructured: vi.fn(async ({ validate, responseSchema }) => {
      expect(responseSchema.type).toBe("OBJECT");
      expect(responseSchema.required).toContain("demoTemplate");
      return { data: validate(output), usage: { inputTokens: 100, outputTokens: 50 } };
    }),
  };
}

describe("normalizeBudget", () => {
  it("keeps a stated amount with its currency", () => {
    expect(normalizeBudget(analysisFixture())).toEqual({ status: "stated", amount: 1200, currency: "USD" });
  });

  it("downgrades to unclear when the amount or currency is missing", () => {
    expect(normalizeBudget(analysisFixture({ budgetAmount: null }))).toEqual({
      status: "unclear",
      amount: null,
      currency: null,
    });
    expect(normalizeBudget(analysisFixture({ budgetCurrency: null }))).toEqual({
      status: "unclear",
      amount: null,
      currency: null,
    });
  });

  it("never invents a budget when the model reported unknown", () => {
    expect(
      normalizeBudget(analysisFixture({ budgetStatus: "unknown", budgetAmount: 999, budgetCurrency: "USD" })),
    ).toEqual({ status: "unknown", amount: null, currency: null });
  });
});

describe("analyzeLead", () => {
  it("maps the validated analysis into a database update with a computed score", async () => {
    const result = await analyzeLead(
      { originalText: "post text", canonicalUrl: "https://example.com/p/1" },
      generatorFor(analysisFixture()),
    );

    const expected = scoreLead({
      hiringIntent: "high",
      budgetStatus: "stated",
      urgency: "high",
      requirementsClarity: 80,
      requiredFeatureCount: 2,
      technologyPreferenceCount: 1,
      confidence: 82,
    });

    expect(result.score.total).toBe(expected.total);
    expect(result.dbUpdate.lead_score).toBe(expected.total);
    expect(result.dbUpdate.analysis_status).toBe("analyzed");
    expect(result.dbUpdate.project_category).toBe("web_development");
    expect(result.dbUpdate.budget_amount).toBe(1200);
    expect(result.dbUpdate.budget_currency).toBe("USD");
    expect(result.dbUpdate.required_features).toHaveLength(2);
    expect(result.dbUpdate.confidence_score).toBe(82);
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 50 });

    const evidence = result.dbUpdate.evidence as Record<string, unknown>;
    expect(evidence.sourceUrl).toBe("https://example.com/p/1");
    expect(evidence.suggestedNextAction).toBe("Send a short concept of the booking flow.");
    expect(evidence.scoringWeightsVersion).toBe(1);
    expect((evidence.scoreBreakdown as { total: number }).total).toBe(expected.total);
  });

  it("scores a vague post lower than a specific one", async () => {
    const vague = await analyzeLead(
      { originalText: "post", canonicalUrl: null },
      generatorFor(
        analysisFixture({
          budgetStatus: "unknown",
          budgetAmount: null,
          budgetCurrency: null,
          urgency: "unknown",
          hiringIntent: "unknown",
          requirementsClarity: 20,
          confidence: 40,
          requiredFeatures: [],
          technologyPreferences: [],
        }),
      ),
    );

    expect(vague.score.total).toBeLessThan(40);
    expect(vague.dbUpdate.budget_status).toBe("unknown");
    expect(vague.dbUpdate.budget_amount).toBeNull();
  });

  it("stamps the analysis time so re-analysis is auditable", async () => {
    const result = await analyzeLead(
      { originalText: "post", canonicalUrl: null },
      generatorFor(analysisFixture()),
    );
    const evidence = result.dbUpdate.evidence as { analyzedAt: string };
    expect(Number.isNaN(Date.parse(evidence.analyzedAt))).toBe(false);
  });
});
