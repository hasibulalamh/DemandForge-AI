import { createHash, timingSafeEqual } from "node:crypto";

/** Normalize post text so formatting noise does not defeat duplicate detection. */
export function normalizeSourceText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .toLowerCase();
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function computeContentHash(text: string): string {
  return sha256Hex(normalizeSourceText(text));
}

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "igshid",
  "mkt_tok",
  "ref",
  "ref_src",
  "ref_url",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "utm_reader",
  "utm_social",
]);

/** Accept only absolute http(s) URLs. Rejects javascript:, data:, file:, etc. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Produces a stable identity URL: https, lower-case host, no tracking params,
 * no fragment, no trailing slash on the path. Returns null for unsafe input.
 */
export function canonicalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isSafeHttpUrl(value)) return null;

  const url = new URL(value);
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();

  let pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  url.pathname = pathname;

  const query = url.searchParams.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

export function checksumFiles(files: Record<string, string>): string {
  const payload = Object.keys(files)
    .sort()
    .map((path) => `${path}\u0000${sha256Hex(files[path] ?? "")}`)
    .join("\u0001");
  return sha256Hex(payload);
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Constant-time comparison for opaque tokens of equal length. */
export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
