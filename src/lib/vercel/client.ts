import "server-only";

import { serverEnv } from "@/lib/env";

const API_BASE = "https://api.vercel.com";

export type VercelErrorCode =
  | "not_configured"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "api_error"
  | "timeout"
  | "build_failed"
  | "invalid_response";

export class VercelError extends Error {
  readonly code: VercelErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(code: VercelErrorCode, message: string, options?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "VercelError";
    this.code = code;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

export type VercelReadyState = "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED";

export interface VercelDeployment {
  id: string;
  url: string;
  state: VercelReadyState;
  projectId: string | null;
  errorMessage: string | null;
}

export interface VercelServiceOptions {
  token?: string;
  teamId?: string;
  projectId?: string;
  projectName?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

function normalizeState(value: unknown): VercelReadyState {
  if (typeof value !== "string") return "QUEUED";
  const upper = value.toUpperCase();
  if (upper === "READY" || upper === "ERROR" || upper === "CANCELED" || upper === "BUILDING") {
    return upper;
  }
  return upper === "QUEUED" || upper === "INITIALIZING" ? upper : "QUEUED";
}

function deploymentUrl(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new VercelError("invalid_response", "Vercel did not return a deployment URL.");
  }
  const url = value.startsWith("http") ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new VercelError("invalid_response", "Vercel returned an invalid deployment URL.");
  }
  // Only trust URLs that Vercel controls.
  if (!parsed.hostname.endsWith(".vercel.app")) {
    throw new VercelError("invalid_response", "Vercel returned an unexpected deployment host.");
  }
  return parsed.toString().replace(/\/$/, "");
}

/** Vercel REST client for static, file-based deployments into one dedicated project. */
export class VercelDeploymentService {
  private readonly token: string;
  private readonly teamId: string;
  private readonly projectId: string;
  private readonly projectName: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(options: VercelServiceOptions = {}) {
    this.token = options.token ?? serverEnv.vercelToken;
    this.teamId = options.teamId ?? serverEnv.vercelTeamId;
    this.projectId = options.projectId ?? serverEnv.vercelProjectId;
    this.projectName = options.projectName ?? serverEnv.vercelProjectName;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.now = options.now ?? Date.now;
  }

  isConfigured(): boolean {
    return Boolean(this.token && (this.projectId || this.projectName));
  }

  private endpoint(path: string): string {
    const url = new URL(`${API_BASE}${path}`);
    if (this.teamId) url.searchParams.set("teamId", this.teamId);
    return url.toString();
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new VercelError(
        "not_configured",
        "Vercel deployment is not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID.",
      );
    }
  }

  private ensureProjectScope(): void {
    // Deployment names are never user controlled: they always come from the
    // dedicated demo project, preventing accidental writes to other projects.
    if (this.projectName && this.projectName !== serverEnv.vercelProjectName && !this.projectId) {
      throw new VercelError("forbidden", "Refusing to deploy outside the configured demo project.");
    }
  }

  async createDeployment(input: {
    demoId: string;
    files: Record<string, string>;
  }): Promise<VercelDeployment> {
    this.assertConfigured();
    this.ensureProjectScope();

    const fileEntries = Object.entries(input.files).map(([file, data]) => ({ file, data }));
    if (fileEntries.length === 0) throw new VercelError("api_error", "No files to deploy.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await this.fetchImpl(this.endpoint("/v13/deployments"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          name: this.projectName,
          ...(this.projectId ? { project: this.projectId } : {}),
          target: "production",
          files: fileEntries,
          projectSettings: {
            framework: null,
            buildCommand: null,
            installCommand: null,
            outputDirectory: null,
          },
          meta: { demandforge: "true", demoId: input.demoId },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await this.mapHttpError(response);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const id = typeof payload.id === "string" ? payload.id : null;
      if (!id) throw new VercelError("invalid_response", "Vercel did not return a deployment id.");

      return {
        id,
        url: deploymentUrl(payload.url),
        state: normalizeState(payload.readyState ?? payload.status),
        projectId: typeof payload.projectId === "string" ? payload.projectId : this.projectId || null,
        errorMessage: null,
      };
    } catch (error) {
      if (error instanceof VercelError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new VercelError("timeout", "Vercel deployment request timed out.");
      }
      throw new VercelError("api_error", "Could not reach Vercel.", { retryable: true });
    } finally {
      clearTimeout(timer);
    }
  }

  async getDeployment(id: string): Promise<VercelDeployment> {
    this.assertConfigured();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await this.fetchImpl(this.endpoint(`/v13/deployments/${encodeURIComponent(id)}`), {
        method: "GET",
        headers: this.headers(),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) throw await this.mapHttpError(response);

      const payload = (await response.json()) as Record<string, unknown>;
      return {
        id,
        url: deploymentUrl(payload.url),
        state: normalizeState(payload.readyState ?? payload.status),
        projectId: typeof payload.projectId === "string" ? payload.projectId : this.projectId || null,
        errorMessage:
          typeof payload.errorMessage === "string"
            ? payload.errorMessage
            : typeof payload.errorCode === "string"
              ? payload.errorCode
              : null,
      };
    } catch (error) {
      if (error instanceof VercelError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new VercelError("timeout", "Vercel status request timed out.", { retryable: true });
      }
      throw new VercelError("api_error", "Could not reach Vercel.", { retryable: true });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Polls until the deployment is ready or the bounded deadline is reached.
   * Returns the real immutable deployment URL only after Vercel reports READY.
   */
  async waitForReady(
    id: string,
    options: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<VercelDeployment> {
    const timeoutMs = options.timeoutMs ?? 150_000;
    const intervalMs = options.intervalMs ?? 4_000;
    const deadline = this.now() + timeoutMs;
    let last: VercelDeployment | null = null;

    while (this.now() < deadline) {
      last = await this.getDeployment(id);

      if (last.state === "READY") return last;
      if (last.state === "ERROR" || last.state === "CANCELED") {
        throw new VercelError(
          "build_failed",
          last.errorMessage ? `Vercel build failed: ${last.errorMessage}` : "Vercel build failed.",
        );
      }

      await this.sleep(intervalMs);
    }

    throw new VercelError(
      "timeout",
      `Deployment ${id} did not become ready in time. Last state: ${last?.state ?? "unknown"}.`,
      { retryable: true },
    );
  }

  private async mapHttpError(response: Response): Promise<VercelError> {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = typeof body.error?.message === "string" ? body.error.message : "";
    } catch {
      // ignore non-JSON error bodies
    }

    if (response.status === 401) {
      return new VercelError("unauthorized", "Vercel rejected the access token.", { status: 401 });
    }
    if (response.status === 403) {
      return new VercelError("forbidden", "The Vercel token cannot access the configured project.", {
        status: 403,
      });
    }
    if (response.status === 429) {
      return new VercelError("rate_limited", "Vercel rate limit reached.", { retryable: true, status: 429 });
    }
    if (response.status >= 500) {
      return new VercelError("api_error", "Vercel is temporarily unavailable.", {
        retryable: true,
        status: response.status,
      });
    }
    return new VercelError(
      "api_error",
      `Vercel API error (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}.`,
      { status: response.status },
    );
  }
}

export function createVercelService(overrides?: VercelServiceOptions): VercelDeploymentService {
  return new VercelDeploymentService(overrides);
}
