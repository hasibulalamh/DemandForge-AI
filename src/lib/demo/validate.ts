import { Script } from "node:vm";

import {
  DEMO_FILE_PATHS,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  type DemoFiles,
  type ValidationResult,
} from "./types";

const SCRIPT_TAG = /<script\b[^>]*>/gi;
const LINK_TAG = /<link\b[^>]*>/gi;
const INLINE_HANDLER = /<[^>]+\son[a-z]+\s*=/i;
const FORBIDDEN_HTML_TAGS = /<(iframe|object|embed|base|frame|frameset|form|style)\b/i;
const EXTERNAL_URL = /https?:\/\//i;
const SCRIPT_PROTOCOL = /(?:javascript|vbscript|data:text\/html)\s*:/i;

const FORBIDDEN_JS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\beval\s*\(/, label: "eval()" },
  { pattern: /\bnew\s+Function\b/, label: "new Function()" },
  { pattern: /document\s*\.\s*cookie/, label: "document.cookie" },
  { pattern: /\b(?:localStorage|sessionStorage|indexedDB)\b/, label: "browser storage" },
  { pattern: /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\b/, label: "network access" },
  { pattern: /navigator\s*\.\s*sendBeacon/, label: "network access" },
  { pattern: /\bwindow\s*\.\s*open\b/, label: "window.open" },
  { pattern: /\.\s*postMessage\b/, label: "postMessage" },
  { pattern: /\b(?:parent|top|opener)\s*\./, label: "cross-frame access" },
  { pattern: /document\s*\.\s*domain/, label: "document.domain" },
  { pattern: /\b(?:require|import)\s*\(/, label: "dynamic import" },
  { pattern: /location\s*\.\s*(?:href|assign|replace)\s*=/, label: "navigation" },
];

const SECRET_MARKERS = [
  "service_role",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "VERCEL_TOKEN",
  "CRON_SECRET",
  "sb_secret_",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countMatches(value: string, pattern: RegExp): number {
  const matches = value.match(pattern);
  return matches ? matches.length : 0;
}

function balanced(value: string, open: string, close: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === open) depth += 1;
    if (char === close) depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export interface DemoValidation extends ValidationResult {
  files?: DemoFiles;
}

/** Validates an untrusted generated manifest before it is stored or previewed. */
export function validateDemoFiles(input: unknown): DemoValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: ["Artifact must be an object of file path -> contents."], warnings };
  }

  const allowed = new Set<string>(DEMO_FILE_PATHS);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors.push(`Unexpected file in manifest: ${key}`);
  }

  for (const path of DEMO_FILE_PATHS) {
    const content = input[path];
    if (typeof content !== "string") {
      errors.push(`Missing or non-text file: ${path}`);
      continue;
    }
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
      errors.push(`${path} exceeds the ${MAX_FILE_BYTES / 1024}KB per-file limit.`);
    }
    for (const marker of SECRET_MARKERS) {
      if (content.includes(marker)) errors.push(`${path} contains a secret-like marker.`);
    }
    if (content.includes("..\\") || content.includes("../")) {
      warnings.push(`${path} contains a path-traversal sequence.`);
    }
  }

  const files = input as Partial<DemoFiles>;
  const html = files["index.html"];
  const css = files["assets/css/styles.css"];
  const js = files["assets/js/main.js"];
  const readme = files["README.md"];

  if (typeof html === "string") {
    if (!/^\s*<!doctype html>/i.test(html)) errors.push("index.html must start with <!doctype html>.");
    if (!/<meta\s+charset=["']utf-8["']/i.test(html)) errors.push("index.html must declare UTF-8.");
    if (!/<meta\s+name=["']viewport["']/i.test(html)) errors.push("index.html must declare a viewport.");
    if (!/<title>[^<]{1,200}<\/title>/i.test(html)) errors.push("index.html must have a non-empty title.");

    const scriptCount = countMatches(html, SCRIPT_TAG);
    const hasExpectedScript = /<script\b[^>]*src=["']assets\/js\/main\.js["'][^>]*>\s*<\/script>/i.test(html);
    if (scriptCount !== 1 || !hasExpectedScript) {
      errors.push("index.html must contain exactly one script tag: assets/js/main.js.");
    }
    if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(html)) errors.push("Inline scripts are not allowed.");
    if (INLINE_HANDLER.test(html)) errors.push("Inline event handlers are not allowed.");
    if (FORBIDDEN_HTML_TAGS.test(html))
      errors.push("Frames, forms, objects, base and inline styles are not allowed.");
    if (EXTERNAL_URL.test(html)) errors.push("External URLs are not allowed in index.html.");
    if (SCRIPT_PROTOCOL.test(html)) errors.push("javascript:/data: script URLs are not allowed.");
    if (countMatches(html, LINK_TAG) !== 1 || !/href=["']assets\/css\/styles\.css["']/i.test(html)) {
      errors.push("index.html must link exactly assets/css/styles.css.");
    }
  }

  if (typeof css === "string") {
    if (!balanced(css, "{", "}")) errors.push("styles.css has unbalanced braces.");
    if (/@import/i.test(css)) errors.push("@import is not allowed in styles.css.");
    if (/url\s*\(/i.test(css)) errors.push("External or embedded url() resources are not allowed.");
    if (/\bexpression\s*\(/i.test(css)) errors.push("CSS expressions are not allowed.");
    if (SCRIPT_PROTOCOL.test(css)) errors.push("javascript: URLs are not allowed in CSS.");
  }

  if (typeof js === "string") {
    try {
      new Script(js, { filename: "main.js" });
    } catch (error) {
      errors.push(`main.js has a syntax error: ${error instanceof Error ? error.message : "unknown"}`);
    }
    for (const rule of FORBIDDEN_JS) {
      if (rule.pattern.test(js)) errors.push(`main.js must not use ${rule.label}.`);
    }
    if (EXTERNAL_URL.test(js)) errors.push("External URLs are not allowed in main.js.");
  }

  if (typeof readme === "string" && !/concept/i.test(readme)) {
    warnings.push("README.md does not label the demo as a concept.");
  }

  const totalBytes = Object.values(files).reduce(
    (sum, value) => sum + (typeof value === "string" ? Buffer.byteLength(value, "utf8") : 0),
    0,
  );
  if (totalBytes > MAX_TOTAL_BYTES) errors.push("Artifact exceeds the total size limit.");

  if (errors.length === 0 && totalBytes === 0) errors.push("Artifact is empty.");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    files: errors.length === 0 ? (files as DemoFiles) : undefined,
  };
}
