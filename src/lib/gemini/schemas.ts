import { z } from "zod";

const signal = z.enum(["unknown", "low", "medium", "high"]);
const quote = z.string().trim().min(1).max(400);

export const demoTemplateSchema = z.enum(["local-service", "portfolio", "saas-landing"]);

export const leadAnalysisSchema = z.object({
  category: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1200),
  requiredFeatures: z
    .array(z.object({ name: z.string().trim().min(1).max(120), quote }))
    .max(15)
    .default([]),
  suggestedFeatures: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        reason: z.string().trim().min(1).max(400),
      }),
    )
    .max(10)
    .default([]),
  technologyPreferences: z
    .array(z.object({ name: z.string().trim().min(1).max(80), quote }))
    .max(10)
    .default([]),
  budgetStatus: z.enum(["unknown", "unclear", "stated", "range"]),
  budgetAmount: z.number().finite().min(0).max(1_000_000_000).nullable().optional(),
  budgetCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .nullable()
    .optional(),
  budgetQuote: z.string().trim().max(400).default(""),
  urgency: signal,
  urgencyQuote: z.string().trim().max(400).default(""),
  hiringIntent: signal,
  hiringIntentQuote: z.string().trim().max(400).default(""),
  requirementsClarity: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  evidence: z
    .array(z.object({ claim: z.string().trim().min(1).max(240), quote }))
    .max(12)
    .default([]),
  suggestedNextAction: z.string().trim().min(1).max(500),
  demoScope: z.string().trim().min(1).max(600),
  demoTemplate: demoTemplateSchema,
});

export type LeadAnalysisOutput = z.infer<typeof leadAnalysisSchema>;

export const demoSpecSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(140),
  industry: z.string().trim().min(2).max(60),
  heroHeadline: z.string().trim().min(2).max(120),
  heroSubheadline: z.string().trim().min(2).max(280),
  ctaLabel: z.string().trim().min(2).max(40),
  palette: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  fontStyle: z.enum(["sans", "serif"]),
  services: z
    .array(
      z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().min(1).max(240) }),
    )
    .min(3)
    .max(6),
  features: z
    .array(
      z.object({ title: z.string().trim().min(1).max(80), description: z.string().trim().min(1).max(240) }),
    )
    .min(2)
    .max(4),
  faqs: z
    .array(
      z.object({ question: z.string().trim().min(1).max(140), answer: z.string().trim().min(1).max(320) }),
    )
    .min(2)
    .max(4),
  footerNote: z.string().trim().min(2).max(180),
  metaDescription: z.string().trim().min(10).max(160),
  serviceArea: z.string().trim().min(2).max(80),
});

export type DemoSpecOutput = z.infer<typeof demoSpecSchema>;

// ---------------------------------------------------------------------------
// Gemini responseSchema (OpenAPI subset). Kept explicit so the model is
// constrained before Zod validation runs.
// ---------------------------------------------------------------------------
const STRING = { type: "STRING" } as const;

export const leadAnalysisResponseSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    category: STRING,
    title: STRING,
    summary: STRING,
    requiredFeatures: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: STRING, quote: STRING },
        required: ["name", "quote"],
      },
    },
    suggestedFeatures: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: STRING, reason: STRING },
        required: ["name", "reason"],
      },
    },
    technologyPreferences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: STRING, quote: STRING },
        required: ["name", "quote"],
      },
    },
    budgetStatus: { type: "STRING", enum: ["unknown", "unclear", "stated", "range"] },
    budgetAmount: { type: "NUMBER" },
    budgetCurrency: STRING,
    budgetQuote: STRING,
    urgency: { type: "STRING", enum: ["unknown", "low", "medium", "high"] },
    urgencyQuote: STRING,
    hiringIntent: { type: "STRING", enum: ["unknown", "low", "medium", "high"] },
    hiringIntentQuote: STRING,
    requirementsClarity: { type: "INTEGER" },
    confidence: { type: "INTEGER" },
    evidence: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { claim: STRING, quote: STRING },
        required: ["claim", "quote"],
      },
    },
    suggestedNextAction: STRING,
    demoScope: STRING,
    demoTemplate: { type: "STRING", enum: ["local-service", "portfolio", "saas-landing"] },
  },
  required: [
    "category",
    "title",
    "summary",
    "requiredFeatures",
    "suggestedFeatures",
    "technologyPreferences",
    "budgetStatus",
    "urgency",
    "hiringIntent",
    "requirementsClarity",
    "confidence",
    "evidence",
    "suggestedNextAction",
    "demoScope",
    "demoTemplate",
  ],
};

export const demoSpecResponseSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    businessName: STRING,
    tagline: STRING,
    industry: STRING,
    heroHeadline: STRING,
    heroSubheadline: STRING,
    ctaLabel: STRING,
    palette: {
      type: "OBJECT",
      properties: { primary: STRING, accent: STRING, surface: STRING, text: STRING },
      required: ["primary", "accent", "surface", "text"],
    },
    fontStyle: { type: "STRING", enum: ["sans", "serif"] },
    services: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: STRING, description: STRING },
        required: ["name", "description"],
      },
    },
    features: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: STRING, description: STRING },
        required: ["title", "description"],
      },
    },
    faqs: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { question: STRING, answer: STRING },
        required: ["question", "answer"],
      },
    },
    footerNote: STRING,
    metaDescription: STRING,
    serviceArea: STRING,
  },
  required: [
    "businessName",
    "tagline",
    "industry",
    "heroHeadline",
    "heroSubheadline",
    "ctaLabel",
    "palette",
    "fontStyle",
    "services",
    "features",
    "faqs",
    "footerNote",
    "metaDescription",
    "serviceArea",
  ],
};
