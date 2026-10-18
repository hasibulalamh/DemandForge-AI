import { describe, expect, it } from "vitest";

import {
  createCollectionRuleSchema,
  createDemoSchema,
  createSourceSchema,
  importLeadSchema,
  leadListQuerySchema,
  updateOutreachSchema,
} from "@/lib/validation/schemas";

describe("importLeadSchema", () => {
  it("accepts a realistic import", () => {
    const parsed = importLeadSchema.parse({
      originalText: "Looking for a developer to build a 5 page website for a dental clinic.",
      canonicalUrl: "https://www.facebook.com/groups/x/posts/1",
    });
    expect(parsed.originalText).toHaveLength(70);
    expect(parsed.canonicalUrl).toContain("facebook.com");
  });

  it("rejects short text with a helpful message", () => {
    const result = importLeadSchema.safeParse({ originalText: "too short" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("20 characters");
  });

  it("rejects dangerous URLs", () => {
    const result = importLeadSchema.safeParse({
      originalText: "A valid long enough project request text",
      canonicalUrl: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes empty optional strings to null", () => {
    const parsed = importLeadSchema.parse({
      originalText: "A valid long enough project request text",
      canonicalUrl: "",
      sourceId: null,
    });
    expect(parsed.canonicalUrl).toBeNull();
  });

  it("caps text length", () => {
    const result = importLeadSchema.safeParse({ originalText: "a".repeat(20001) });
    expect(result.success).toBe(false);
  });
});

describe("leadListQuerySchema", () => {
  it("applies defaults", () => {
    const parsed = leadListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(10);
    expect(parsed.sort).toBe("newest");
  });

  it("coerces numeric query strings", () => {
    const parsed = leadListQuerySchema.parse({ page: "3", pageSize: "25", minScore: "70" });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(25);
    expect(parsed.minScore).toBe(70);
  });

  it("rejects unknown enum values and oversized pages", () => {
    expect(leadListQuerySchema.safeParse({ sort: "cheapest" }).success).toBe(false);
    expect(leadListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});

describe("createSourceSchema", () => {
  it("defaults to a manual source", () => {
    const parsed = createSourceSchema.parse({ sourceName: "Groups" });
    expect(parsed.sourceType).toBe("manual");
    expect(parsed.sourceUrl).toBeNull();
  });

  it("does not accept the unimplemented Meta API source type", () => {
    expect(createSourceSchema.safeParse({ sourceName: "Meta", sourceType: "meta_api" }).success).toBe(false);
  });
});

describe("createCollectionRuleSchema", () => {
  it("defaults arrays and enabled state", () => {
    const parsed = createCollectionRuleSchema.parse({ name: "Websites" });
    expect(parsed.keywords).toEqual([]);
    expect(parsed.isEnabled).toBe(true);
  });
});

describe("createDemoSchema", () => {
  it("requires a uuid lead and a known template", () => {
    expect(
      createDemoSchema.safeParse({
        leadId: "22222222-2222-4222-8222-222222222222",
        templateName: "portfolio",
      }).success,
    ).toBe(true);
    expect(createDemoSchema.safeParse({ leadId: "not-a-uuid" }).success).toBe(false);
    expect(
      createDemoSchema.safeParse({
        leadId: "22222222-2222-4222-8222-222222222222",
        templateName: "wordpress",
      }).success,
    ).toBe(false);
  });
});

describe("updateOutreachSchema", () => {
  it("accepts status transitions and rejects unknown statuses", () => {
    expect(updateOutreachSchema.safeParse({ status: "sent" }).success).toBe(true);
    expect(updateOutreachSchema.safeParse({ status: "maybe" }).success).toBe(false);
  });
});
