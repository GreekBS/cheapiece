/** Standard UI / admin section codes — not category-specific. */
export const STANDARD_ATTRIBUTE_GROUPS = [
  "general",
  "specifications",
  "dimensions",
  "connectivity",
  "identifiers",
  "media",
  "compliance",
] as const;

export type StandardAttributeGroupCode = (typeof STANDARD_ATTRIBUTE_GROUPS)[number];

export function isStandardAttributeGroupCode(value: string): boolean {
  return (STANDARD_ATTRIBUTE_GROUPS as readonly string[]).includes(value);
}
