import type { CatalogPayload } from "../types/payload";
import type { EffectiveCategorySchema } from "../types/effective-schema";
import type { AttributePrimitive } from "../types/primitives";

const SAMPLE_BY_PRIMITIVE: Record<AttributePrimitive, unknown> = {
  text: "Sample text",
  rich_text: "Sample rich text",
  integer: 8,
  decimal: 6.4,
  boolean: true,
  enum_single: null,
  enum_multi: [],
  measurement: { value: 128, unit: "gb" },
  weight: { value: 200, unit: "g" },
  dimension: { length: 10, width: 5, height: 2, unit: "cm" },
  color: { code: "black" },
  identifier_gtin: "8806095041234",
  identifier_mpn: "MPN-001",
  media_gallery: { items: [{ url: "https://example.com/image.jpg", sortOrder: 0 }] },
  url: "https://example.com",
  date: "2026-01-01",
};

export function sampleValueForPrimitive(
  primitive: AttributePrimitive,
  enumCodes?: string[],
): unknown {
  if (primitive === "enum_single" && enumCodes?.length) return enumCodes[0];
  if (primitive === "enum_multi" && enumCodes?.length) return enumCodes.slice(0, 1);
  if (primitive === "color" && enumCodes?.length) return { code: enumCodes[0] };
  return SAMPLE_BY_PRIMITIVE[primitive];
}

export function buildSamplePayload(
  schemaVersionId: string,
  categoryId: string,
  effective: EffectiveCategorySchema,
  locale: string,
): CatalogPayload {
  const values: Record<string, unknown> = {};

  for (const field of effective.fields) {
    if (!field.merchantVisible || field.overrides?.hide) continue;
    const def = field.definition;
    const enumCodes = def.enumOptions?.filter((o) => o.state !== "archived").map((o) => o.code);
    const subset = field.overrides?.enumOptionsSubset;
    const allowed = subset?.length ? subset : enumCodes;
    values[def.code] = sampleValueForPrimitive(def.primitive, allowed);
  }

  return {
    schemaVersionId,
    categoryId,
    values,
    meta: { locale },
  };
}
