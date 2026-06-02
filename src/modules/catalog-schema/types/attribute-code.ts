/** Namespace pattern: segment.segment (lowercase snake segments). */
const ATTRIBUTE_CODE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

export function isValidAttributeCode(code: string): boolean {
  return ATTRIBUTE_CODE_PATTERN.test(code);
}

export function getAttributeNamespace(code: string): string {
  const idx = code.indexOf(".");
  return idx === -1 ? "" : code.slice(0, idx);
}

/** System-reserved codes — cannot be removed from published schemas. */
export const RESERVED_SYSTEM_ATTRIBUTE_CODES = [
  "core.title",
  "core.brand",
  "core.model",
  "core.slug",
  "core.gtin",
  "core.mpn",
] as const;

export type ReservedSystemAttributeCode = (typeof RESERVED_SYSTEM_ATTRIBUTE_CODES)[number];

export function isReservedSystemAttributeCode(code: string): code is ReservedSystemAttributeCode {
  return (RESERVED_SYSTEM_ATTRIBUTE_CODES as readonly string[]).includes(code);
}
