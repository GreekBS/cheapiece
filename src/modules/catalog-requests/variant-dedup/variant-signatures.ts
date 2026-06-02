import { createHash } from "crypto";

import {
  normalizeBrandModel,
  normalizeGtinMpn,
  normalizeVariantAttributes,
} from "./normalize-variant-attributes";
import type { MerchantVariantSignatureInput, VariantSignatureInput } from "./types";

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

export function hashVariantSignature(material: unknown): string {
  return createHash("sha256").update(stableStringify(material)).digest("hex").slice(0, 16);
}

function extractAttributeValues(
  attribute_payload: VariantSignatureInput["attribute_payload"],
): Record<string, unknown> {
  if (!attribute_payload || typeof attribute_payload !== "object") return {};
  const values = (attribute_payload as { values?: unknown }).values;
  if (!values || typeof values !== "object" || Array.isArray(values)) return {};
  return values as Record<string, unknown>;
}

/**
 * Global variant identity — no vendor/tenant scope.
 * Used for admin approval dedup and canonical matching consistency.
 */
export function computeCanonicalVariantSignature(input: VariantSignatureInput): string {
  const material = {
    category_id: input.category_id ?? null,
    gtin: normalizeGtinMpn(input.gtin),
    mpn: normalizeGtinMpn(input.mpn),
    brand: normalizeBrandModel(input.brand),
    model: normalizeBrandModel(input.model),
    variant_attributes: normalizeVariantAttributes(extractAttributeValues(input.attribute_payload)),
  };

  return hashVariantSignature(material);
}

/**
 * Merchant submission fingerprint — includes vendor scope.
 * Used ONLY for L1 duplicate submission detection (soft warning).
 */
export function computeMerchantVariantSignature(input: MerchantVariantSignatureInput): string {
  const attributeValues = extractAttributeValues(input.attribute_payload);
  const normalizedAttributes = normalizeVariantAttributes(attributeValues);

  const material = {
    vendor_id: input.vendor_id,
    category_id: input.category_id ?? null,
    title: normalizeBrandModel(input.title ?? null),
    slug_suggestion: normalizeBrandModel(input.slug_suggestion ?? null),
    brand: normalizeBrandModel(input.brand),
    model: normalizeBrandModel(input.model),
    gtin: normalizeGtinMpn(input.gtin),
    mpn: normalizeGtinMpn(input.mpn),
    variant_attributes: normalizedAttributes,
    attribute_snapshot: stableStringify(
      Object.keys(attributeValues)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = attributeValues[key];
          return acc;
        }, {}),
    ),
  };

  return hashVariantSignature(material);
}

export function isSparseVariantMetadata(input: VariantSignatureInput): boolean {
  const attrs = normalizeVariantAttributes(extractAttributeValues(input.attribute_payload));
  const hasStrongId = Boolean(normalizeGtinMpn(input.gtin) || normalizeGtinMpn(input.mpn));
  const hasVariantAttrs = Object.keys(attrs).length > 0;
  return !hasStrongId && !hasVariantAttrs;
}

/**
 * Weak identity for sparse metadata hints only — never used for auto-link.
 */
export function computeWeakCanonicalVariantSignature(input: VariantSignatureInput): string {
  const material = {
    category_id: input.category_id ?? null,
    brand: normalizeBrandModel(input.brand),
    model: normalizeBrandModel(input.model),
  };
  return hashVariantSignature(material);
}

export function canonicalSignaturesMatch(requestHash: string, productHash: string): boolean {
  return requestHash.length > 0 && requestHash === productHash;
}
