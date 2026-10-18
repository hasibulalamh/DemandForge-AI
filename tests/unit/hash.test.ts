import { describe, expect, it } from "vitest";

import {
  canonicalizeUrl,
  checksumFiles,
  computeContentHash,
  isSafeHttpUrl,
  normalizeSourceText,
  safeEqualHex,
  safeEqualString,
  sha256Hex,
} from "@/lib/security/hash";

describe("normalizeSourceText", () => {
  it("collapses formatting noise so duplicates are detected", () => {
    const a = "Need   a website.\r\n\r\n\r\nBudget $500";
    const b = "need a website.\n\nBudget $500";
    expect(normalizeSourceText(a)).toBe(normalizeSourceText(b));
  });

  it("removes zero-width characters and normalizes unicode", () => {
    expect(normalizeSourceText("we\u200Bbsite\uFEFF")).toBe("website");
  });

  it("lowercases and trims", () => {
    expect(normalizeSourceText("  HELLO  ")).toBe("hello");
  });
});

describe("computeContentHash", () => {
  it("returns a 64 character hex digest", () => {
    const hash = computeContentHash("Looking for a developer to build a 5 page site");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across equivalent whitespace and blank lines", () => {
    expect(computeContentHash("A   b")).toBe(computeContentHash("a b"));
    expect(computeContentHash("a\n\n\n\nb")).toBe(computeContentHash("a\n\nb"));
  });

  it("changes when the content changes", () => {
    expect(computeContentHash("site for dentist")).not.toBe(computeContentHash("site for dentist!"));
  });

  it("matches a known sha256 of the normalized text", () => {
    expect(computeContentHash("HELLO")).toBe(sha256Hex("hello"));
  });
});

describe("canonicalizeUrl", () => {
  it("strips tracking parameters, fragments, and trailing slashes", () => {
    expect(
      canonicalizeUrl("https://www.facebook.com/groups/example/posts/1001/?utm_source=x&fbclid=abc#comment"),
    ).toBe("https://www.facebook.com/groups/example/posts/1001");
  });

  it("upgrades http to https and lowercases the host", () => {
    expect(canonicalizeUrl("http://WWW.Example.COM/Path/")).toBe("https://www.example.com/Path");
  });

  it("keeps meaningful query parameters in a stable order", () => {
    expect(canonicalizeUrl("https://example.com/p?b=2&a=1")).toBe("https://example.com/p?a=1&b=2");
  });

  it("rejects non http(s) and malformed URLs", () => {
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(canonicalizeUrl("file:///etc/passwd")).toBeNull();
    expect(canonicalizeUrl("not a url")).toBeNull();
    expect(canonicalizeUrl(null)).toBeNull();
    expect(canonicalizeUrl("")).toBeNull();
  });

  it("is idempotent", () => {
    const once = canonicalizeUrl("https://Example.com/a/?utm_campaign=z");
    expect(canonicalizeUrl(once)).toBe(once);
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http and https only", () => {
    expect(isSafeHttpUrl("https://example.com")).toBe(true);
    expect(isSafeHttpUrl("http://localhost:3000/x")).toBe(true);
    expect(isSafeHttpUrl("ftp://example.com")).toBe(false);
    expect(isSafeHttpUrl("javascript:void(0)")).toBe(false);
  });
});

describe("checksumFiles", () => {
  it("is independent of key order", () => {
    const a = checksumFiles({ "index.html": "a", "main.js": "b" });
    const b = checksumFiles({ "main.js": "b", "index.html": "a" });
    expect(a).toBe(b);
  });

  it("changes when any file changes", () => {
    expect(checksumFiles({ "index.html": "a" })).not.toBe(checksumFiles({ "index.html": "b" }));
  });
});

describe("constant time comparisons", () => {
  it("compares hex digests", () => {
    expect(safeEqualHex(sha256Hex("x"), sha256Hex("x"))).toBe(true);
    expect(safeEqualHex(sha256Hex("x"), sha256Hex("y"))).toBe(false);
    expect(safeEqualHex("abc", "abcd")).toBe(false);
  });

  it("compares opaque strings", () => {
    expect(safeEqualString("Bearer abc", "Bearer abc")).toBe(true);
    expect(safeEqualString("Bearer abc", "Bearer abd")).toBe(false);
    expect(safeEqualString("short", "longer")).toBe(false);
  });
});
