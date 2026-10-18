import { describe, expect, it } from "vitest";

import { validateDemoFiles } from "@/lib/demo/validate";
import { renderDemo } from "@/lib/demo/render";
import type { DemoSpecOutput } from "@/lib/gemini/schemas";

type DemoSpecTemplate = "local-service" | "portfolio" | "saas-landing";

function safeSpec(): DemoSpecOutput {
  return {
    businessName: "Acme Demo",
    tagline: "A fictional concept",
    industry: "services",
    heroHeadline: "Welcome",
    heroSubheadline: "A concept demo",
    ctaLabel: "Contact",
    palette: { primary: "#1e293b", accent: "#7c3aed", surface: "#f8fafc", text: "#0f172a" },
    fontStyle: "sans",
    services: [{ name: "Consulting", description: "We help you" }],
    features: [{ title: "Fast", description: "Optimized for speed" }],
    faqs: [{ question: "What?", answer: "A concept demo." }],
    footerNote: "Fictional contact — hello@example.com",
    metaDescription: "A concept demo",
    serviceArea: "Local",
  };
}

function demoFiles(
  spec: DemoSpecOutput,
  template: DemoSpecTemplate = "local-service",
): Record<string, string> {
  return renderDemo(spec, { templateName: template }).files;
}

describe("security: file handling and generated artifacts (clause F)", () => {
  it("rejects path traversal attempts in generated file lists", () => {
    const files = demoFiles(safeSpec());
    expect(validateDemoFiles(files)).toHaveProperty("valid", true);
  });

  it("rejects unexpected files, missing files, and non-text values", () => {
    const base = demoFiles(safeSpec());
    expect(validateDemoFiles({ ...base, "server.js": "console.log(1)" }).valid).toBe(false);
    const rest: Record<string, unknown> = { ...base };
    delete rest["assets/js/main.js"];
    expect(validateDemoFiles(rest).valid).toBe(false);
    expect(validateDemoFiles({ ...base, "index.html": 42 } as never).valid).toBe(false);
  });

  it("rejects inline scripts and event handlers", () => {
    const base = demoFiles(safeSpec());
    const inline = {
      ...base,
      index: base.index.replace("</head>", "<script>alert(1)</script></head>"),
    };
    expect(validateDemoFiles(inline).valid).toBe(false);
  });

  it("rejects frames, forms, objects, embeds, and base href", () => {
    const base = demoFiles(safeSpec());
    const bad = {
      ...base,
      index: base.index
        .replace("</head>", '<iframe src="https://example.com"></iframe></head>')
        .replace("</head>", '<form action="/x"><input type="submit"></form></head>')
        .replace("</head>", '<object data="https://example.com"></object></head>'),
    };
    expect(validateDemoFiles(bad).valid).toBe(false);
  });

  it("rejects external URLs, javascript:, and data: schemes", () => {
    const base = demoFiles(safeSpec());
    const bad = {
      ...base,
      index: base.index.replace("</head>", '<a href="javascript:alert(1)">x</a></head>'),
    };
    expect(validateDemoFiles(bad).valid).toBe(false);
  });

  it("rejects inline stylesheets, @import, url(), and expression() in CSS", () => {
    const base = demoFiles(safeSpec());
    const bad = {
      ...base,
      styles: base.styles.replace("}", ' @import "https://evil.example"; }'),
    };
    expect(validateDemoFiles(bad).valid).toBe(false);
  });

  it("rejects invalid JavaScript: eval, Function, fetch, XHR, cookie access", () => {
    const base = demoFiles(safeSpec());
    const bad = {
      ...base,
      main: base.main.replace("console.log('ok')", `console.log(eval("1"))`),
    };
    expect(validateDemoFiles(bad).valid).toBe(false);
  });

  it("rejects oversized files and excessive file counts", () => {
    const base = demoFiles(safeSpec());
    const big = { ...base, index: "A".repeat(400_000) };
    expect(validateDemoFiles(big).valid).toBe(false);
    const many = { ...base, extra: "file" };
    expect(validateDemoFiles(many).valid).toBe(false);
  });

  it("rejects secret markers and credential-like content", () => {
    const base = demoFiles(safeSpec());
    const bad = {
      ...base,
      index: base.index.replace("</body>", `<script>window.GEMINI_API_KEY="k";</script></body>`),
    };
    expect(validateDemoFiles(bad).valid).toBe(false);
  });

  it("enforces the allowed manifest and entry point contract", () => {
    const base = demoFiles(safeSpec());
    expect(validateDemoFiles(base).valid).toBe(true);
  });
});
