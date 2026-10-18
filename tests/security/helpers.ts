import { isIP } from "node:net";

import { importLeadSchema } from "@/lib/validation/schemas";
import { isSafeHttpUrl } from "@/lib/security/hash";

export function validateImportPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return importLeadSchema.safeParse(payload);
  }

  const value = payload as Record<string, unknown>;
  return importLeadSchema.safeParse({
    sourceId: value.source_id,
    canonicalUrl: value.canonical_url,
    originalText: value.original_text,
    externalReference: value.external_reference,
    publishedAt: value.published_at,
  });
}

export function sanitizeUrl(value: string): {
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
} | null {
  if (/(?:^|[/\\])\.\.(?:[/\\]|$)/.test(value) || /%2f|%5c/i.test(value) || !isSafeHttpUrl(value)) {
    return null;
  }

  const url = new URL(value);
  return {
    protocol: url.protocol,
    host: url.host,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function resolveAllowedHost(value: string, allowedHosts: string[]): boolean {
  if (!isSafeHttpUrl(value)) return false;

  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || isIP(hostname) > 0) {
    return false;
  }
  if (isPrivateIpv4(hostname) || hostname === "::" || hostname === "::1") {
    return false;
  }
  return allowedHosts.includes(hostname);
}

/** Browser escaping replacement used by the security suites. */
export function cleanHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allows a small, explicit set of safe tags/attributes; strips everything else. */
export function sanitizeHtml(
  value: string,
  _options: { allowedTags: string[]; allowedAttributes: Record<string, string[]> },
): string {
  const tags = new Set(_options.allowedTags);
  const attrs = new Map<string, string[]>();
  for (const [k, vs] of Object.entries(_options.allowedAttributes)) {
    attrs.set(k, vs);
  }
  let out = "";
  let i = 0;
  while (i < value.length) {
    const open = value.indexOf("<", i);
    out += cleanHtml(value.slice(i, open < 0 ? undefined : open));
    if (open < 0) break;
    const close = value.indexOf(">", open);
    if (close < 0) {
      out += "<";
      i = open + 1;
      continue;
    }
    const tag = value
      .slice(open + 1, close)
      .trim()
      .toLowerCase();
    const isEnd = tag.startsWith("/");
    const name = isEnd ? tag.slice(1) : tag;
    if (!isEnd && !tags.has(name)) {
      i = close + 1;
      continue;
    }
    out += "<" + (isEnd ? "/" : "") + tag + ">";
    i = close + 1;
  }
  return out;
}
