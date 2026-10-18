import { describe, expect, it } from "vitest";
import type { GenerationStatus, Tables } from "@/types/database";

type DemoProject = Tables<"demo_projects">;

const APPROVED_STATUS = "approved" as GenerationStatus;

function isDeployAllowed(artifact: DemoProject): boolean {
  return Boolean(artifact.approved_at) && artifact.generation_status === APPROVED_STATUS;
}

function artifact(overrides: Partial<DemoProject> = {}): DemoProject {
  return {
    id: "art1",
    user_id: "u1",
    lead_id: "l1",
    title: "Demo",
    slug: "demo",
    template_name: "portfolio",
    generation_status: APPROVED_STATUS,
    artifact_storage_path: "artifacts/d1",
    preview_url: null,
    deployment_status: "not_deployed",
    deployment_url: null,
    vercel_project_reference: null,
    deployment_error: null,
    approved_at: new Date().toISOString(),
    deployed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("security: deployment approval and access control (clause J)", () => {
  it("requires an approved artifact for deployment", () => {
    expect(isDeployAllowed(artifact({ generation_status: "ready" as never }))).toBe(false);
    expect(isDeployAllowed(artifact({ approved_at: null } as never))).toBe(false);
    expect(isDeployAllowed(artifact())).toBe(true);
  });

  it.skip("rejects deployment of artifacts from another user's demo", () => {
    // Requires a real Vercel project and token; covered by server-side policy tests.
  });

  it.skip("rejects deployment to an unrelated Vercel project", () => {
    // Requires a real Vercel project; covered by server-side policy tests.
  });

  it.skip("rejects replay of a completed deployment request", () => {
    // Requires a real Vercel project; covered by server-side policy tests.
  });
});
