import { describe, expect, it, vi } from "vitest";

import { VercelDeploymentService, VercelError } from "@/lib/vercel/client";

const files = {
  "index.html": "<!doctype html><title>Demo</title>",
  "assets/css/styles.css": "body { color: black; }",
  "assets/js/main.js": "",
  README: "# demo",
};

function service(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
  return new VercelDeploymentService({
    token: "vercel-token",
    projectId: "prj_demos",
    projectName: "demandforge-demos",
    teamId: "team_1",
    fetchImpl,
    sleep: async () => {},
    now: () => 0,
    ...overrides,
  });
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("VercelDeploymentService configuration", () => {
  it("reports missing credentials instead of faking success", async () => {
    const fetchImpl = vi.fn();
    const client = service(fetchImpl as unknown as typeof fetch, { token: "", projectId: "" });

    expect(client.isConfigured()).toBe(false);
    await expect(client.createDeployment({ demoId: "d1", files })).rejects.toMatchObject({
      code: "not_configured",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses to deploy outside the configured dedicated project", async () => {
    const fetchImpl = vi.fn();
    const client = service(fetchImpl as unknown as typeof fetch, {
      projectId: "",
      projectName: "someone-elses-project",
    });

    await expect(client.createDeployment({ demoId: "d1", files })).rejects.toBeInstanceOf(VercelError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("VercelDeploymentService.createDeployment", () => {
  it("posts an inline-files deployment into the dedicated project", async () => {
    const fetchImpl = vi.fn(async () =>
      response({
        id: "dpl_1",
        url: "demandforge-demos-abc.vercel.app",
        readyState: "QUEUED",
        projectId: "prj_demos",
      }),
    );
    const client = service(fetchImpl as unknown as typeof fetch);

    const deployment = await client.createDeployment({ demoId: "demo-1", files });

    expect(deployment).toMatchObject({
      id: "dpl_1",
      url: "https://demandforge-demos-abc.vercel.app",
      state: "QUEUED",
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v13/deployments");
    expect(url).toContain("teamId=team_1");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer vercel-token");

    const body = JSON.parse(String(init.body));
    expect(body.name).toBe("demandforge-demos");
    expect(body.project).toBe("prj_demos");
    expect(body.target).toBe("production");
    expect(body.files).toEqual(Object.entries(files).map(([file, data]) => ({ file, data })));
    expect(body.meta.demoId).toBe("demo-1");
  });

  it("rejects URLs that are not Vercel-controlled", async () => {
    const fetchImpl = vi.fn(async () =>
      response({ id: "dpl_1", url: "https://evil.example.com", readyState: "QUEUED" }),
    );
    const client = service(fetchImpl as unknown as typeof fetch);

    await expect(client.createDeployment({ demoId: "d1", files })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("maps authentication and rate-limit errors", async () => {
    for (const [status, code] of [
      [401, "unauthorized"],
      [403, "forbidden"],
      [429, "rate_limited"],
      [500, "api_error"],
    ] as const) {
      const fetchImpl = vi.fn(async () => response({ error: { message: "nope" } }, status));
      const client = service(fetchImpl as unknown as typeof fetch);
      await expect(client.createDeployment({ demoId: "d1", files })).rejects.toMatchObject({ code, status });
    }
  });

  it("reports an error when Vercel omits the deployment id", async () => {
    const fetchImpl = vi.fn(async () => response({ url: "demos.vercel.app" }));
    const client = service(fetchImpl as unknown as typeof fetch);
    await expect(client.createDeployment({ demoId: "d1", files })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
});

describe("VercelDeploymentService.waitForReady", () => {
  it("polls until READY and returns the real URL", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return response({
        id: "dpl_1",
        url: "demandforge-demos-abc.vercel.app",
        readyState: calls < 3 ? "BUILDING" : "READY",
      });
    });
    const client = service(fetchImpl as unknown as typeof fetch);

    const deployment = await client.waitForReady("dpl_1");
    expect(deployment.state).toBe("READY");
    expect(deployment.url).toBe("https://demandforge-demos-abc.vercel.app");
    expect(calls).toBe(3);
  });

  it("fails with build_failed when Vercel reports ERROR", async () => {
    const fetchImpl = vi.fn(async () =>
      response({ id: "dpl_1", url: "demos.vercel.app", readyState: "ERROR", errorMessage: "build failed" }),
    );
    const client = service(fetchImpl as unknown as typeof fetch);

    await expect(client.waitForReady("dpl_1")).rejects.toMatchObject({
      code: "build_failed",
      message: expect.stringContaining("build failed"),
    });
  });

  it("times out rather than pretending a deployment is live", async () => {
    let clock = 0;
    const fetchImpl = vi.fn(async () =>
      response({ id: "dpl_1", url: "demos.vercel.app", readyState: "BUILDING" }),
    );
    const client = service(fetchImpl as unknown as typeof fetch, {
      now: () => clock,
      sleep: async () => {
        clock += 60_000;
      },
    });

    await expect(client.waitForReady("dpl_1", { timeoutMs: 120_000 })).rejects.toMatchObject({
      code: "timeout",
      message: expect.stringContaining("did not become ready"),
    });
  });
});
