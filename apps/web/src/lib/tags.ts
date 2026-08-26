export function normalizeTag(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function parseTags(value: string): string[] {
  return [...new Set(
    value
      .split(/[,;\n\r\t ]+/)
      .map(normalizeTag)
      .filter(Boolean),
  )];
}

export function mergeTags(current: string[], input: string): string[] {
  return [...new Set([...current, ...parseTags(input)])];
}
