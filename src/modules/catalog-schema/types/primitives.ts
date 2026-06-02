/** Serializable primitive kinds — foundation of the schema engine. */
export type AttributePrimitive =
  | "text"
  | "rich_text"
  | "integer"
  | "decimal"
  | "boolean"
  | "enum_single"
  | "enum_multi"
  | "measurement"
  | "weight"
  | "dimension"
  | "color"
  | "identifier_gtin"
  | "identifier_mpn"
  | "media_gallery"
  | "url"
  | "date";

export const ATTRIBUTE_PRIMITIVES: readonly AttributePrimitive[] = [
  "text",
  "rich_text",
  "integer",
  "decimal",
  "boolean",
  "enum_single",
  "enum_multi",
  "measurement",
  "weight",
  "dimension",
  "color",
  "identifier_gtin",
  "identifier_mpn",
  "media_gallery",
  "url",
  "date",
] as const;

export function isAttributePrimitive(value: string): value is AttributePrimitive {
  return (ATTRIBUTE_PRIMITIVES as readonly string[]).includes(value);
}
