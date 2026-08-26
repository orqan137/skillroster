import { createHash, randomUUID } from "node:crypto";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertSlug(value: string, label = "value"): string {
  if (!SLUG_PATTERN.test(value)) {
    throw new Error(`${label} must match ${SLUG_PATTERN.source}: ${value}`);
  }
  return value;
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (!slug) {
    throw new Error(`Cannot create a slug from: ${value}`);
  }
  return slug;
}

export function createEventId(prefix = "event"): string {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
}

export function stableId(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 20);
}
