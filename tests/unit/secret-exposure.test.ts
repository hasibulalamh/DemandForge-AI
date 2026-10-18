import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function listSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) listSourceFiles(path, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(path);
  }
  return files;
}

const files = listSourceFiles(SRC).map((path) => ({
  path: path.replace(`${process.cwd()}/`, ""),
  content: readFileSync(path, "utf8"),
}));

const SERVER_ONLY_MODULES = [
  "@/lib/env",
  "@/lib/supabase/admin",
  "@/lib/supabase/server",
  "@/lib/gemini/client",
  "@/lib/gemini/service",
  "@/lib/vercel/client",
  "@/lib/jobs/",
  "@/lib/auth",
  "@/lib/security/api-token",
  "@/lib/audit",
];

describe("secret exposure", () => {
  it("never references server secrets outside the modules allowed to read them", () => {
    const allowed = new Set(["src/lib/env.ts", "src/lib/supabase/admin.ts"]);
    const markers = ["SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "VERCEL_TOKEN", "CRON_SECRET"];

    for (const file of files) {
      if (allowed.has(file.path)) continue;
      for (const marker of markers) {
        // The setup UI is allowed to name a missing variable, but must not read it.
        const readsValue = new RegExp(`process\\.env\\.${marker}`).test(file.content);
        expect(readsValue, `${file.path} reads ${marker}`).toBe(false);
      }
    }
  });

  it("keeps server-only imports out of Client Components", () => {
    for (const file of files) {
      const isClientComponent = file.content.trimStart().startsWith('"use client"');
      if (!isClientComponent) continue;
      for (const serverModule of SERVER_ONLY_MODULES) {
        expect(
          file.content.includes(`from "${serverModule}"`),
          `${file.path} imports server-only module ${serverModule}`,
        ).toBe(false);
      }
    }
  });

  it("exposes only public Supabase configuration to the browser", () => {
    const publicConfig = files.find((file) => file.path === "src/lib/public-config.ts");
    expect(publicConfig).toBeDefined();
    expect(publicConfig!.content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(publicConfig!.content).not.toContain("SERVICE_ROLE");
    expect(publicConfig!.content).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("only contains empty values or known non-secret placeholders", () => {
    const template = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    const allowedValues = new Set([
      "http://localhost:3000",
      "https://your-project-ref.supabase.co",
      "sb_publishable_your_key",
      "your-service-role-key",
      "gemini-2.5-flash",
      "0.30",
      "2.50",
      "demandforge-demos",
    ]);

    const nonEmpty = template
      .split("\n")
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => line.slice(line.indexOf("=") + 1).trim())
      .filter(Boolean);

    for (const value of nonEmpty) {
      expect(allowedValues.has(value), `unexpected non-placeholder value: ${value}`).toBe(true);
    }
  });

  it("does not place secrets in the Chrome extension", () => {
    const extensionFiles = listSourceFiles(join(process.cwd(), "extension", "src")).map((path) => ({
      path,
      content: readFileSync(path, "utf8"),
    }));
    const manifest = readFileSync(join(process.cwd(), "extension", "manifest.json"), "utf8");

    for (const file of [...extensionFiles, { path: "extension/manifest.json", content: manifest }]) {
      for (const marker of ["service_role", "GEMINI_API_KEY", "VERCEL_TOKEN", "CRON_SECRET", "SUPABASE_"]) {
        expect(file.content, `${file.path} mentions ${marker}`).not.toContain(marker);
      }
    }
  });
});
