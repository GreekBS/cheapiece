/** Deterministic text normalization for matching — no heuristics. */
export function normalizeTextPart(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTupleKey(parts: (string | null | undefined)[]): string {
  return parts.map((p) => normalizeTextPart(p)).join("|");
}
