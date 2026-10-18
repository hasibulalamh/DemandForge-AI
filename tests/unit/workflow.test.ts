import { describe, expect, it, vi } from "vitest";

import { importLead } from "@/features/leads/import";
import { renderDemo } from "@/lib/demo/render";
import { validateDemoFiles } from "@/lib/demo/validate";
import { analyzeLead } from "@/lib/gemini/analysis";
import {
  demoSpecSchema,
  leadAnalysisSchema,
  type DemoSpecOutput,
  type LeadAnalysisOutput,
} from "@/lib/gemini/schemas";
import type { StructuredGenerator } from "@/lib/gemini/types";
import type { AdminClient, JobContext } from "@/lib/jobs/context";
import { handleDeployDemo } from "@/lib/jobs/handlers/deploy-demo";
import { NonRetryableJobError } from "@/lib/jobs/types";
import type { Tables } from "@/types/database";
import { createFakeAdmin, type FakeAdmin } from "./fakes/admin";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "99999999-9999-4999-8999-999999999999";
const LEAD = "22222222-2222-4222-8222-222222222222";
const DEMO = "44444444-4444-4444-8444-444444444444";
const DEPLOYMENT = "55555555-5555-4555-8555-555555555555";

const analysisOutput: LeadAnalysisOutput = leadAnalysisSchema.parse({
  category: "web_development",
  title: "Dental clinic website",
  summary: "Five page site with online booking.",
  requiredFeatures: [{ name: "Booking", quote: "online appointment booking" }],
  suggestedFeatures: [],
  technologyPreferences: [{ name: "WordPress", quote: "WordPress" }],
  budgetStatus: "stated",
  budgetAmount: 1200,
  budgetCurrency: "USD",
  budgetQuote: "Budget around $1200",
  urgency: "high",
  urgencyQuote: "3 weeks",
  hiringIntent: "high",
  hiringIntentQuote: "Please DM",
  requirementsClarity: 80,
  confidence: 82,
  evidence: [{ claim: "Budget", quote: "Budget around $1200" }],
  suggestedNextAction: "Send a concept of the booking flow.",
  demoScope: "One page concept.",
  demoTemplate: "local-service",
});

const demoSpec: DemoSpecOutput = demoSpecSchema.parse({
  businessName: "Bright Path Dental",
  tagline: "Calm dentistry",
  industry: "dental care",
  heroHeadline: "Dentistry that fits your week",
  heroSubheadline: "Book online with a team that explains each step clearly.",
  ctaLabel: "Book a visit",
  palette: { primary: "#3f51b5", accent: "#ff7043", surface: "#f6f7fb", text: "#1d1b26" },
  fontStyle: "sans",
  services: [
    { name: "Routine care", description: "Check-ups for the whole family." },
    { name: "Cosmetic", description: "Whitening and veneers." },
    { name: "Emergency", description: "Same-week appointments." },
  ],
  features: [
    { title: "Online booking", description: "No phone tag." },
    { title: "Clear pricing", description: "Know the cost first." },
  ],
  faqs: [
    { question: "New patients?", answer: "Yes, every week." },
    { question: "First visit length?", answer: "About forty minutes." },
  ],
  footerNote: "Serving Riverside.",
  metaDescription: "Concept dental site with online booking and clear pricing.",
  serviceArea: "Riverside",
});

function jobRow(overrides: Partial<Tables<"jobs">>): Tables<"jobs"> {
  const now = new Date().toISOString();
  return {
    id: "job-1",
    user_id: USER,
    job_type: "deploy_demo",
    status: "running",
    payload: {},
    idempotency_key: null,
    attempt_count: 1,
    max_attempts: 3,
    scheduled_at: now,
    started_at: null,
    completed_at: null,
    last_error: null,
    locked_by: "worker-test",
    locked_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

const generator: StructuredGenerator = {
  generateStructured: async ({ validate }) => ({
    data: validate(analysisOutput),
    usage: { inputTokens: 120, outputTokens: 60 },
  }),
};

describe("mocked lead-to-demo workflow", () => {
  it("imports, analyses, renders, and validates an artifact for one lead", async () => {
    const fake = createFakeAdmin({
      leads: [],
      sources: [],
      audit_events: [],
      demo_projects: [],
      demo_artifacts: [],
    }) as FakeAdmin;
    const admin = fake as unknown as AdminClient;

    // 1. Import with duplicate protection
    const imported = await importLead(admin, USER, {
      originalText: "Looking for a developer to build a dental website with online appointment booking.",
      canonicalUrl: "https://www.facebook.com/groups/example/posts/7?utm_source=fb",
    });
    expect(imported.duplicate).toBe(false);
    expect(imported.analysisStatus).toBe("pending");

    const duplicate = await importLead(admin, USER, {
      originalText: "Looking for a developer to build a dental website with online appointment booking.",
    });
    expect(duplicate.duplicate).toBe(true);
    expect(fake.__tables.leads).toHaveLength(1);

    const leadRow = fake.__tables.leads[0];
    const leadId = String(leadRow.id);

    // 2. Analysis produces a scored, evidence-backed update
    const analysis = await analyzeLead(
      { originalText: String(leadRow.original_text), canonicalUrl: null },
      generator,
    );
    Object.assign(leadRow, analysis.dbUpdate);
    expect(leadRow.analysis_status).toBe("analyzed");
    expect(Number(leadRow.lead_score)).toBeGreaterThan(40);
    expect(leadRow.budget_amount).toBe(1200);

    // 3. Demo render + self-validation
    const rendered = renderDemo(demoSpec, { templateName: "local-service" });
    expect(validateDemoFiles(rendered.files).valid).toBe(true);

    fake.__tables.demo_artifacts.push({
      id: "artifact-1",
      demo_id: DEMO,
      files: rendered.files,
      manifest: rendered.manifest,
      byte_size: rendered.manifest.totalBytes,
      checksum: rendered.manifest.checksum,
    });
    fake.__tables.demo_projects.push({
      id: DEMO,
      user_id: USER,
      lead_id: leadId,
      title: "Dental concept site",
      slug: "dental-concept-site",
      template_name: "local-service",
      generation_status: "ready",
      approved_at: null,
      deployment_status: "not_deployed",
      deployment_url: null,
      deployment_error: null,
    });

    // 4. Approval is a human gate: nothing is deployable yet
    const demo = fake.__tables.demo_projects[0];
    expect(demo.approved_at).toBeNull();
    expect(demo.deployment_url).toBeNull();
  });
});

describe("deployment gating", () => {
  it("refuses to deploy an unapproved demo", async () => {
    const fake = createFakeAdmin({
      demo_projects: [
        {
          id: DEMO,
          user_id: USER,
          lead_id: LEAD,
          title: "Demo",
          generation_status: "ready",
          approved_at: null,
          deployment_url: null,
        },
      ],
      demo_artifacts: [],
      deployments: [],
      audit_events: [],
    }) as FakeAdmin;

    await expect(
      handleDeployDemo({
        job: jobRow({ payload: { demoId: DEMO, deploymentId: DEPLOYMENT } }),
        admin: fake as unknown as AdminClient,
        workerId: "worker-test",
      }),
    ).rejects.toBeInstanceOf(NonRetryableJobError);
  });

  it("does not deploy an artifact owned by another user", async () => {
    const fake = createFakeAdmin({
      demo_projects: [
        {
          id: DEMO,
          user_id: OTHER_USER,
          lead_id: LEAD,
          title: "Demo",
          generation_status: "approved",
          approved_at: new Date().toISOString(),
        },
      ],
      demo_artifacts: [],
      deployments: [],
      audit_events: [],
    }) as FakeAdmin;

    await expect(
      handleDeployDemo({
        job: jobRow({ payload: { demoId: DEMO, deploymentId: DEPLOYMENT } }),
        admin: fake as unknown as AdminClient,
        workerId: "worker-test",
      }),
    ).rejects.toBeInstanceOf(NonRetryableJobError);
  });

  it("reports missing Vercel configuration instead of a fake success", async () => {
    vi.stubEnv("VERCEL_TOKEN", "");
    vi.stubEnv("VERCEL_PROJECT_ID", "");
    vi.stubEnv("VERCEL_PROJECT_NAME", "");

    try {
      const fake = createFakeAdmin({
        demo_projects: [
          {
            id: DEMO,
            user_id: USER,
            lead_id: LEAD,
            title: "Demo",
            generation_status: "approved",
            approved_at: new Date().toISOString(),
            deployment_url: null,
          },
        ],
        demo_artifacts: [
          {
            id: "artifact-1",
            demo_id: DEMO,
            files: renderDemo(demoSpec, { templateName: "portfolio" }).files,
          },
        ],
        deployments: [
          {
            id: DEPLOYMENT,
            user_id: USER,
            demo_project_id: DEMO,
            status: "queued",
            vercel_deployment_id: null,
          },
        ],
        audit_events: [],
      }) as FakeAdmin;

      const context: JobContext = {
        job: jobRow({ payload: { demoId: DEMO, deploymentId: DEPLOYMENT } }),
        admin: fake as unknown as AdminClient,
        workerId: "worker-test",
      };

      await expect(handleDeployDemo(context)).rejects.toMatchObject({
        name: "NonRetryableJobError",
        message: expect.stringContaining("Vercel is not configured"),
      });

      expect(fake.__tables.deployments[0].status).toBe("error");
      expect(fake.__tables.deployments[0].error_message).toContain("Vercel is not configured");
      expect(fake.__tables.demo_projects[0].deployment_status).toBe("failed");
      expect(fake.__tables.demo_projects[0].deployment_url).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("analysis job handler", () => {
  it("fails clearly when Gemini is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.resetModules();

    try {
      const fake = createFakeAdmin({
        leads: [
          {
            id: LEAD,
            user_id: USER,
            original_text: "Looking for a developer to build a website for a dental clinic.",
            canonical_url: null,
            analysis_status: "pending",
          },
        ],
        audit_events: [],
      }) as FakeAdmin;

      const { handleAnalyzeLead } = await import("@/lib/jobs/handlers/analyze-lead");

      await expect(
        handleAnalyzeLead({
          job: jobRow({ job_type: "analyze_lead", payload: { leadId: LEAD } }),
          admin: fake as unknown as AdminClient,
          workerId: "worker-test",
        }),
      ).rejects.toMatchObject({
        name: "NonRetryableJobError",
        message: expect.stringContaining("GEMINI_API_KEY"),
      });

      expect(fake.__tables.leads[0].analysis_status).toBe("failed");
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("ignores leads owned by another user", async () => {
    const fake = createFakeAdmin({
      leads: [{ id: LEAD, user_id: OTHER_USER, original_text: "text", canonical_url: null }],
      audit_events: [],
    }) as FakeAdmin;

    const { handleAnalyzeLead } = await import("@/lib/jobs/handlers/analyze-lead");

    await expect(
      handleAnalyzeLead({
        job: jobRow({ user_id: USER, job_type: "analyze_lead", payload: { leadId: LEAD } }),
        admin: fake as unknown as AdminClient,
        workerId: "worker-test",
      }),
    ).rejects.toThrow(/not found|no longer belongs|not configured/i);
  });
});
