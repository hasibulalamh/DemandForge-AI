import { z } from "zod";

import { canonicalizeUrl, isSafeHttpUrl } from "@/lib/security/hash";

export const uuidSchema = z.string().uuid("Must be a valid UUID");

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || isSafeHttpUrl(value), "Must be an absolute http(s) URL");

const keywordArray = z.array(z.string().trim().min(1).max(80)).max(100);

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------
export const sourceTypeSchema = z.enum(["manual", "chrome_extension"]);

export const createSourceSchema = z.object({
  sourceType: sourceTypeSchema.default("manual"),
  sourceName: z.string().trim().min(1).max(160),
  sourceUrl: optionalHttpUrl,
});

export const updateSourceSchema = z.object({
  sourceName: z.string().trim().min(1).max(160).optional(),
  sourceUrl: optionalHttpUrl.optional(),
  connectionStatus: z.enum(["manual_only", "connected", "disconnected", "error"]).optional(),
});

// ---------------------------------------------------------------------------
// Collection rules
// ---------------------------------------------------------------------------
export const createCollectionRuleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  keywords: keywordArray.default([]),
  excludedKeywords: keywordArray.default([]),
  projectCategories: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  isEnabled: z.boolean().default(true),
});

export const updateCollectionRuleSchema = createCollectionRuleSchema.partial();

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export const importLeadSchema = z.object({
  sourceId: uuidSchema.optional().nullable(),
  canonicalUrl: optionalHttpUrl,
  originalText: z.string().trim().min(20, "Paste at least 20 characters").max(20000),
  externalReference: z.string().trim().max(200).optional().nullable(),
  publishedAt: z.string().trim().max(40).optional().nullable(),
});

export const leadListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  pipeline: z
    .enum([
      "new",
      "shortlisted",
      "rejected",
      "demo_generated",
      "deployed",
      "contacted",
      "replied",
      "won",
      "lost",
      "archived",
    ])
    .optional(),
  analysis: z.enum(["pending", "queued", "analyzing", "analyzed", "failed"]).optional(),
  category: z.string().trim().max(80).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["newest", "score", "oldest"]).default("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const updateLeadSchema = z.object({
  pipelineStatus: z
    .enum([
      "new",
      "shortlisted",
      "rejected",
      "demo_generated",
      "deployed",
      "contacted",
      "replied",
      "won",
      "lost",
      "archived",
    ])
    .optional(),
});

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------
export const demoTemplateSchema = z.enum(["local-service", "portfolio", "saas-landing"]);

export const createDemoSchema = z.object({
  leadId: uuidSchema,
  templateName: demoTemplateSchema.default("local-service"),
  title: z.string().trim().min(3).max(160).optional(),
  styleNotes: z.string().trim().max(500).optional(),
});

export const approveDemoSchema = z.object({
  approved: z.literal(true),
});

// ---------------------------------------------------------------------------
// Outreach
// ---------------------------------------------------------------------------
export const outreachChannelSchema = z.enum(["facebook_message", "email", "other"]);
export const outreachStatusSchema = z.enum([
  "draft",
  "ready",
  "sent",
  "replied",
  "no_response",
  "converted",
  "archived",
]);

export const createOutreachSchema = z.object({
  leadId: uuidSchema,
  demoProjectId: uuidSchema.optional().nullable(),
  channel: outreachChannelSchema.default("facebook_message"),
  draftContent: z.string().trim().min(1).max(8000),
  status: outreachStatusSchema.default("draft"),
});

export const updateOutreachSchema = z.object({
  draftContent: z.string().trim().min(1).max(8000).optional(),
  status: outreachStatusSchema.optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
  sentAt: z.string().trim().max(40).optional().nullable(),
  responseAt: z.string().trim().max(40).optional().nullable(),
});

// ---------------------------------------------------------------------------
// API tokens and settings
// ---------------------------------------------------------------------------
export const createTokenSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
});

// One-time owner setup (server-side only).
export const setupOwnerSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  displayName: z.string().trim().max(120).optional(),
});

export const otpEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
});

export const otpCodeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  code: z.string().trim().min(1, "Enter the email code.").max(10),
});

export function canonicalUrlFromInput(value: string | null | undefined): string | null {
  return canonicalizeUrl(value);
}

export const positiveInt = z.coerce.number().int().min(1).max(100);
