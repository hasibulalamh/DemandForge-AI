import { randomBytes } from "node:crypto";

export function slugify(value: string, maxLength = 60): string {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return base || "demo";
}

/** Deterministic readable slug plus a short random suffix for uniqueness. */
export function uniqueSlug(value: string): string {
  return `${slugify(value, 52)}-${randomBytes(3).toString("hex")}`;
}
