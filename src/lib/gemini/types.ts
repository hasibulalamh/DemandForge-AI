export type GeminiErrorCode =
  "not_configured" | "rate_limited" | "timeout" | "http_error" | "invalid_response" | "blocked";

export class GeminiError extends Error {
  readonly code: GeminiErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(code: GeminiErrorCode, message: string, options?: { retryable?: boolean; status?: number }) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.status = options?.status;
  }
}

export interface GeminiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredGenerationArgs<T> {
  operation: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  validate: (data: unknown) => T;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface StructuredGenerator {
  generateStructured<T>(args: StructuredGenerationArgs<T>): Promise<{ data: T; usage: GeminiUsage }>;
}

export type UsageRecorder = (usage: {
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  status: "success" | "error";
  errorCode?: string;
}) => Promise<void>;
