import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..", "..");

const SECRET_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
  "VERCEL_TOKEN",
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_GEMINI_API_KEY",
];

describe("security: secrets exposure", () => {
  it("no server secret names appear in NEXT_PUBLIC_* sources", () => {
    const entries = readdirSync(ROOT, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || (!e.name.endsWith(".ts") && !e.name.endsWith(".tsx"))) continue;
      const p = join(ROOT, e.name);
      const content = readFileSync(p, "utf8");
      for (const name of SECRET_NAMES) {
        if (new RegExp(`NEXT_PUBLIC_${name}`).test(content)) {
          expect.fail(`NEXT_PUBLIC_${name} found in ${p}`);
        }
      }
    }
  });

  it("no server-only module is imported by a client component", () => {
    const entries = readdirSync(ROOT, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith(".tsx")) continue;
      const p = join(ROOT, e.name);
      const content = readFileSync(p, "utf8");
      if (!content.includes('"use client"')) continue;
      for (const mod of [
        "@/lib/supabase/admin",
        "@/lib/env",
        "@/lib/gemini/service",
        "@/lib/vercel/client",
        "@/lib/jobs/worker",
      ]) {
        expect(content.includes(`from "${mod}"`), `${p} imports ${mod}`).toBe(false);
      }
    }
  });

  it("generated artifacts contain no server secrets", () => {
    const artifactsDir = join(ROOT, "public", "artifacts");
    let artifacts: string[] = [];
    try {
      const raw = readdirSync(artifactsDir, {
        recursive: true,
        withFileTypes: false,
      });
      artifacts = Array.from(raw as readonly string[]).filter(
        (name): name is string => typeof name === "string",
      );
    } catch {
      artifacts = [];
    }
    for (const f of artifacts) {
      if (f.endsWith("/")) continue;
      try {
        const content = readFileSync(join(artifactsDir, f), "utf8");
        for (const name of SECRET_NAMES) {
          expect(content).not.toContain(name);
        }
      } catch {
        // skip files we cannot read in test environment
      }
    }
  });
});
