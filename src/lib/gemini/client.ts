import "server-only";

import { serverEnv } from "@/lib/env";
import {
  GeminiError,
  type GeminiUsage,
  type StructuredGenerationArgs,
  type StructuredGenerator,
} from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiClientOptions {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractText(payload: unknown): string {
  if (!isRecord(payload)) throw new GeminiError("invalid_response", "Gemini returned an unexpected payload.");
  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new GeminiError("blocked", "Gemini returned no candidates. The prompt may have been blocked.");
  }
  const first = candidates[0];
  if (!isRecord(first)) throw new GeminiError("invalid_response", "Gemini candidate was malformed.");
  const content = first.content;
  if (!isRecord(content) || !Array.isArray(content.parts)) {
    throw new GeminiError("invalid_response", "Gemini response had no content parts.");
  }
  const text = content.parts
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("");
  if (!text.trim()) throw new GeminiError("invalid_response", "Gemini returned an empty response.");
  return text;
}

function extractUsage(payload: unknown): GeminiUsage {
  if (!isRecord(payload) || !isRecord(payload.usageMetadata)) return { inputTokens: 0, outputTokens: 0 };
  const meta = payload.usageMetadata;
  const inputTokens = typeof meta.promptTokenCount === "number" ? meta.promptTokenCount : 0;
  const outputTokens = typeof meta.candidatesTokenCount === "number" ? meta.candidatesTokenCount : 0;
  return { inputTokens, outputTokens };
}

function parseJsonText(text: string): unknown {
  const withoutFences = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFences);
  } catch {
    throw new GeminiError("invalid_response", "Gemini returned malformed JSON.", { retryable: true });
  }
}

/**
 * Minimal, dependency-free Gemini client using the documented REST interface.
 * The API key stays on the server. Every request is bounded by a timeout and a
 * small number of retries with exponential backoff and jitter.
 */
export class GeminiClient implements StructuredGenerator {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxAttempts: number;
  private readonly timeoutMs: number;
  private readonly baseDelayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: GeminiClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, 5));
    this.timeoutMs = Math.max(5_000, options.timeoutMs ?? 60_000);
    this.baseDelayMs = options.baseDelayMs ?? 800;
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  get modelName(): string {
    return this.model;
  }

  async generateStructured<T>(args: StructuredGenerationArgs<T>): Promise<{ data: T; usage: GeminiUsage }> {
    if (!this.apiKey) {
      throw new GeminiError("not_configured", "GEMINI_API_KEY is not configured.", { retryable: false });
    }

    let lastError: GeminiError | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const payload = await this.requestOnce(args);
        const text = extractText(payload);
        const parsed = parseJsonText(text);
        const data = args.validate(parsed);
        return { data, usage: extractUsage(payload) };
      } catch (error) {
        const geminiError =
          error instanceof GeminiError
            ? error
            : new GeminiError("invalid_response", "Gemini response failed validation.", {
                retryable: true,
              });
        lastError = geminiError;

        if (!geminiError.retryable || attempt === this.maxAttempts) break;

        const backoff = this.baseDelayMs * 2 ** (attempt - 1);
        const jitter = Math.floor(this.random() * this.baseDelayMs);
        await this.sleep(backoff + jitter);
      }
    }

    throw lastError ?? new GeminiError("invalid_response", "Gemini request failed.");
  }

  private async requestOnce<T>(args: StructuredGenerationArgs<T>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(
        `${API_BASE}/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: args.systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: args.prompt }] }],
            generationConfig: {
              temperature: args.temperature ?? 0.2,
              maxOutputTokens: args.maxOutputTokens ?? 4096,
              responseMimeType: "application/json",
              responseSchema: args.responseSchema,
            },
          }),
          signal: controller.signal,
        },
      );

      if (response.status === 429) {
        throw new GeminiError("rate_limited", "Gemini rate limit reached.", {
          retryable: true,
          status: 429,
        });
      }

      if (response.status >= 500) {
        throw new GeminiError("http_error", "Gemini is temporarily unavailable.", {
          retryable: true,
          status: response.status,
        });
      }

      if (!response.ok) {
        throw new GeminiError("http_error", `Gemini rejected the request (HTTP ${response.status}).`, {
          retryable: false,
          status: response.status,
        });
      }

      return (await response.json()) as unknown;
    } catch (error) {
      if (error instanceof GeminiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GeminiError("timeout", "Gemini request timed out.", { retryable: true });
      }
      throw new GeminiError("http_error", "Could not reach Gemini.", { retryable: true });
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createGeminiClient(overrides?: Partial<GeminiClientOptions>): GeminiClient {
  return new GeminiClient({
    apiKey: serverEnv.geminiApiKey,
    model: serverEnv.geminiModel,
    ...overrides,
  });
}
