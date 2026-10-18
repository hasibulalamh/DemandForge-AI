import { describe, expect, it, vi } from "vitest";

import { GeminiClient } from "@/lib/gemini/client";
import { GeminiError } from "@/lib/gemini/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function geminiPayload(data: unknown, usage = { promptTokenCount: 11, candidatesTokenCount: 7 }) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }],
    usageMetadata: usage,
  };
}

const args = {
  operation: "test",
  systemInstruction: "system",
  prompt: "prompt",
  responseSchema: { type: "OBJECT" },
  validate: (value: unknown) => value as { ok: boolean },
};

function createClient(
  fetchImpl: typeof fetch,
  overrides: Partial<ConstructorParameters<typeof GeminiClient>[0]> = {},
) {
  const sleep = vi.fn(async (delayMs: number) => {
    void delayMs;
  });
  const client = new GeminiClient({
    apiKey: "test-key",
    model: "gemini-test",
    fetchImpl,
    sleep,
    random: () => 0,
    maxAttempts: 3,
    ...overrides,
  });
  return { client, sleep };
}

describe("GeminiClient", () => {
  it("sends the key in a header (never the URL) and returns validated data", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(geminiPayload({ ok: true })));
    const { client } = createClient(fetchImpl as unknown as typeof fetch);

    const result = await client.generateStructured(args);

    expect(result.data).toEqual({ ok: true });
    expect(result.usage).toEqual({ inputTokens: 11, outputTokens: 7 });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toEqual({ type: "OBJECT" });
  });

  it("retries rate limits with backoff and then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "quota" }, 429))
      .mockResolvedValueOnce(jsonResponse(geminiPayload({ ok: true })));
    const { client, sleep } = createClient(fetchImpl as unknown as typeof fetch);

    const result = await client.generateStructured(args);

    expect(result.data).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(800);
  });

  it("retries malformed JSON and reports the last error", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "not json at all" }] } }] }),
    })) as unknown as typeof fetch;
    const { client } = createClient(fetchImpl);

    await expect(client.generateStructured(args)).rejects.toMatchObject({
      code: "invalid_response",
      name: "GeminiError",
    });
  });

  it("strips markdown fences around JSON", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '```json\n{"ok":true}\n```' }] } }],
      }),
    })) as unknown as typeof fetch;
    const { client } = createClient(fetchImpl);

    await expect(client.generateStructured(args)).resolves.toMatchObject({ data: { ok: true } });
  });

  it("retries when validation fails and succeeds on a later attempt", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return jsonResponse(geminiPayload(calls === 1 ? { wrong: true } : { ok: true }));
    }) as unknown as typeof fetch;

    const { client, sleep } = createClient(fetchImpl);
    const result = await client.generateStructured({
      ...args,
      validate: (value) => {
        const record = value as { ok?: boolean };
        if (record.ok !== true) throw new Error("missing ok");
        return { ok: true };
      },
    });

    expect(result.data).toEqual({ ok: true });
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("does not retry client errors (HTTP 400)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "bad request" } }, 400));
    const { client, sleep } = createClient(fetchImpl as unknown as typeof fetch);

    await expect(client.generateStructured(args)).rejects.toMatchObject({
      code: "http_error",
      retryable: false,
      status: 400,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("maps request timeouts to a retryable timeout error", async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }) as unknown as typeof fetch;
    const { client } = createClient(fetchImpl, { maxAttempts: 1 });

    await expect(client.generateStructured(args)).rejects.toMatchObject({ code: "timeout" });
  });

  it("reports blocked prompts without retrying", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ candidates: [] }));
    const { client } = createClient(fetchImpl as unknown as typeof fetch);

    await expect(client.generateStructured(args)).rejects.toMatchObject({ code: "blocked" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails fast when no API key is configured", async () => {
    const fetchImpl = vi.fn();
    const { client } = createClient(fetchImpl as unknown as typeof fetch, { apiKey: "" });

    await expect(client.generateStructured(args)).rejects.toBeInstanceOf(GeminiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
