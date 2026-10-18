import { afterEach } from "vitest";

// Keep environment variables deterministic for unit tests. No live service is
// contacted by this suite: services are injected as fakes.
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-test-model";

afterEach(() => {
  // Individual tests own any additional cleanup they need.
});
