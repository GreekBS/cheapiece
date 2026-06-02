import type { CanonicalAttributesSnapshot } from "../types/payload";
import type { EffectiveCategorySchema } from "../types/effective-schema";
import type { DenormalizeMap } from "../types/category-schema-document";
import { normalizeTextPart, buildTupleKey } from "./text";
import { normalizeGtin, normalizeMpn } from "./identifiers";

export type NormalizedPayload = {
  values: Record<string, unknown>;
  normalized: Record<string, unknown>;
  denormalized: {
    title?: string;
    brand?: string;
    model?: string;
    gtin?: string;
    mpn?: string;
    slug?: string;
    tupleKey: string;
  };
};

export function normalizePayload(
  schema: EffectiveCategorySchema,
  sanitizedValues: Record<string, unknown>,
  denormalize: DenormalizeMap,
): NormalizedPayload {
  const normalized: Record<string, unknown> = {};
  const values = { ...sanitizedValues };

  for (const field of schema.fields) {
    const code = field.definition.code;
    const raw = values[code];
    if (raw === undefined) continue;
    normalized[code] = normalizeAttributeValue(field.definition.primitive, raw);
  }

  const title = pickString(values, denormalize.title ?? "core.title");
  const brand = pickString(values, denormalize.brand ?? "core.brand");
  const model = pickString(values, denormalize.model ?? "core.model");
  const gtin = pickString(values, denormalize.gtin ?? "core.gtin");
  const mpn = pickString(values, denormalize.mpn ?? "core.mpn");

  const tupleKey = buildTupleKey([brand, model]);

  return {
    values,
    normalized,
    denormalized: {
      title: title ? normalizeTextPart(title) : undefined,
      brand: brand ? normalizeTextPart(brand) : undefined,
      model: model ? normalizeTextPart(model) : undefined,
      gtin: gtin ? normalizeGtin(gtin) : undefined,
      mpn: mpn ? normalizeMpn(mpn) : undefined,
      slug: title ? normalizeTextPart(title).replace(/\s+/g, "-") : undefined,
      tupleKey,
    },
  };
}

export function toCanonicalSnapshot(
  schemaVersionId: string,
  normalized: NormalizedPayload,
): CanonicalAttributesSnapshot {
  return {
    schemaVersionId,
    values: normalized.values,
    normalized: normalized.normalized,
  };
}

function pickString(values: Record<string, unknown>, code: string): string | undefined {
  const v = values[code];
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "code" in v) {
    return String((v as { code: unknown }).code);
  }
  return String(v);
}

function normalizeAttributeValue(primitive: string, value: unknown): unknown {
  if (primitive === "identifier_gtin" && typeof value === "string") return normalizeGtin(value);
  if (primitive === "identifier_mpn" && typeof value === "string") return normalizeMpn(value);
  if (typeof value === "string") return normalizeTextPart(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? normalizeTextPart(v) : v));
  if (typeof value === "object" && value !== null) {
    if ("code" in value && typeof (value as { code: unknown }).code === "string") {
      return { code: normalizeTextPart((value as { code: string }).code) };
    }
    if ("value" in value && "unit" in value) {
      const m = value as { value: number; unit: string };
      return { value: m.value, unit: m.unit.toLowerCase() };
    }
  }
  return value;
}
