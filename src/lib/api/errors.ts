import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const unauthorized = () => new ApiError(401, "UNAUTHORIZED", "You must sign in to do that.");
export const forbidden = (message = "You do not have access to this resource.") =>
  new ApiError(403, "FORBIDDEN", message);
export const notFound = (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found.`);
export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, "CONFLICT", message, details);
export const configError = (message: string) => new ApiError(503, "NOT_CONFIGURED", message);

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(
    { data },
    {
      ...init,
      headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
    },
  );
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid data.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Never leak stack traces or provider payloads to the caller.
  console.error("[api] unhandled error", {
    name: error instanceof Error ? error.name : "Unknown",
    message: error instanceof Error ? error.message : "Unknown error",
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

/** Wrap a route body so every thrown ApiError/ZodError becomes a consistent response. */
export async function safeRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    return jsonError(error);
  }
}
