import type { CatalogMatchIndex, CatalogMatchProduct } from "../types/matching";
import type { MatchingConfig } from "../types/category-schema-document";
import { normalizeGtin, normalizeMpn } from "../normalization/identifiers";
import { buildTupleKey, normalizeTextPart } from "../normalization/text";

export function buildCatalogMatchIndex(
  products: CatalogMatchProduct[],
  config: MatchingConfig,
): CatalogMatchIndex {
  const byGtin = new Map<string, string>();
  const byMpn = new Map<string, string>();
  const byBrandModel = new Map<string, string>();
  const byTupleKey = new Map<string, string>();

  for (const product of products) {
    const gtinField = config.identifierFields.find((c) => c.includes("gtin"));
    const mpnField = config.identifierFields.find((c) => c.includes("mpn"));

    if (gtinField) {
      const raw = product.attributes[gtinField];
      const gtin = typeof raw === "string" ? normalizeGtin(raw) : "";
      if (gtin) byGtin.set(gtin, product.id);
    }

    if (mpnField) {
      const raw = product.attributes[mpnField];
      const mpn = typeof raw === "string" ? normalizeMpn(raw) : "";
      if (mpn) byMpn.set(mpn, product.id);
    }

    const brand = product.brand ?? "";
    const model = product.model ?? "";
    if (brand && model) {
      byBrandModel.set(`${brand}|${model}`, product.id);
    }

    byTupleKey.set(product.tupleKey, product.id);
  }

  return { byGtin, byMpn, byBrandModel, byTupleKey, products };
}

export function productFromNormalized(
  id: string,
  categoryId: string,
  values: Record<string, unknown>,
  denormalized: { brand?: string; model?: string; gtin?: string; mpn?: string; tupleKey: string },
): CatalogMatchProduct {
  return {
    id,
    categoryId,
    brand: denormalized.brand ?? null,
    model: denormalized.model ?? null,
    tupleKey: denormalized.tupleKey,
    attributes: values,
  };
}

export function brandModelKey(brand: string | null | undefined, model: string | null | undefined): string {
  return `${normalizeTextPart(brand)}|${normalizeTextPart(model)}`;
}

export function tupleKeyFromFields(
  values: Record<string, unknown>,
  tupleFields: string[],
): string {
  return buildTupleKey(tupleFields.map((code) => {
    const v = values[code];
    if (typeof v === "string") return v;
    if (typeof v === "object" && v !== null && "code" in v) return String((v as { code: unknown }).code);
    return v === null || v === undefined ? "" : String(v);
  }));
}
