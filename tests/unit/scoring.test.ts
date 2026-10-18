import { describe, expect, it } from "vitest";

import { SCORING_WEIGHTS, scoreBand, scoreLead, type LeadScoreInput } from "@/lib/scoring";

const baseline: LeadScoreInput = {
  hiringIntent: "unknown",
  budgetStatus: "unknown",
  urgency: "unknown",
  requirementsClarity: 0,
  requiredFeatureCount: 0,
  technologyPreferenceCount: 0,
  confidence: 0,
};

describe("scoreLead", () => {
  it("scores unknown signals as zero", () => {
    const result = scoreLead(baseline);
    expect(result.total).toBe(0);
    expect(Object.values(result.factors).every((points) => points === 0)).toBe(true);
  });

  it("uses fixed, documented weights that sum to 100", () => {
    const total = Object.values(SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBe(100);
  });

  it("produces the maximum score for a fully specified high-intent lead", () => {
    const result = scoreLead({
      hiringIntent: "high",
      budgetStatus: "stated",
      urgency: "high",
      requirementsClarity: 100,
      requiredFeatureCount: 6,
      technologyPreferenceCount: 2,
      confidence: 100,
    });
    expect(result.total).toBe(100);
  });

  it("is monotonic in hiring intent", () => {
    const low = scoreLead({ ...baseline, hiringIntent: "low" }).total;
    const medium = scoreLead({ ...baseline, hiringIntent: "medium" }).total;
    const high = scoreLead({ ...baseline, hiringIntent: "high" }).total;
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);
  });

  it("never rewards an unknown budget", () => {
    const unknown = scoreLead({ ...baseline, budgetStatus: "unknown" });
    const unclear = scoreLead({ ...baseline, budgetStatus: "unclear" });
    const stated = scoreLead({ ...baseline, budgetStatus: "stated" });
    expect(unknown.factors.budget).toBe(0);
    expect(unclear.factors.budget).toBeGreaterThan(0);
    expect(stated.factors.budget).toBe(SCORING_WEIGHTS.budget);
  });

  it("caps feature and technology contributions", () => {
    const result = scoreLead({ ...baseline, requiredFeatureCount: 50, technologyPreferenceCount: 9 });
    expect(result.factors.requiredFeatures).toBe(SCORING_WEIGHTS.requiredFeatures);
    expect(result.factors.techSpecificity).toBe(SCORING_WEIGHTS.techSpecificity);
  });

  it("clamps out-of-range and non-finite inputs", () => {
    const result = scoreLead({
      ...baseline,
      requirementsClarity: 500,
      confidence: Number.NaN,
      requiredFeatureCount: -5,
    });
    expect(result.factors.requirementsClarity).toBe(SCORING_WEIGHTS.requirementsClarity);
    expect(result.factors.confidence).toBe(0);
    expect(result.factors.requiredFeatures).toBe(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("explains every factor in plain language", () => {
    const result = scoreLead(baseline);
    expect(result.reasons).toHaveLength(7);
    expect(result.reasons.join(" ")).toContain("Hiring intent");
    expect(result.reasons.join(" ")).toContain("Budget signal");
  });
});

describe("scoreBand", () => {
  it("maps scores to stable bands", () => {
    expect(scoreBand(null)).toBe("unscored");
    expect(scoreBand(0)).toBe("low");
    expect(scoreBand(39)).toBe("low");
    expect(scoreBand(40)).toBe("medium");
    expect(scoreBand(69)).toBe("medium");
    expect(scoreBand(70)).toBe("high");
    expect(scoreBand(100)).toBe("high");
  });
});
