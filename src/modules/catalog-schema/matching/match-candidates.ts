import type { CatalogMatchIndex, MatchCandidate, MatchCandidatesResult } from "../types/matching";
import type { MatchingConfig } from "../types/category-schema-document";
import { brandModelKey } from "./build-index";
import { normalizeGtin, normalizeMpn } from "../normalization/identifiers";
import { tupleKeyFromFields } from "./build-index";

const TIER_ORDER = ["T0", "T1", "T2", "T3", "T4"] as const;
const TIER_BASE_CONFIDENCE: Record<(typeof TIER_ORDER)[number], number> = {
  T0: 1.0,
  T1: 0.95,
  T2: 0.85,
  T3: 0.75,
  T4: 0.5,
};

export function findMatchCandidates(
  index: CatalogMatchIndex,
  config: MatchingConfig,
  values: Record<string, unknown>,
  denormalized: { brand?: string; model?: string; gtin?: string; mpn?: string; tupleKey: string },
  categoryId: string,
): MatchCandidatesResult {
  const candidates: MatchCandidate[] = [];
  const seen = new Set<string>();

  const tryAdd = (productId: string | undefined, tier: MatchCandidate["tier"], reason: string, confidence: number) => {
    if (!productId || seen.has(productId)) return;
    const product = index.products.find((p) => p.id === productId);
    if (!product || product.categoryId !== categoryId) return;
    seen.add(productId);
    candidates.push({ productId, tier, confidence, reasons: [reason] });
  };

  for (const field of config.identifierFields) {
    const raw = values[field];
    if (typeof raw === "string" && field.includes("gtin")) {
      const gtin = normalizeGtin(raw);
      if (gtin) tryAdd(index.byGtin.get(gtin), "T0", `GTIN exact match (${field})`, TIER_BASE_CONFIDENCE.T0);
    }
    if (typeof raw === "string" && field.includes("mpn")) {
      const mpn = normalizeMpn(raw);
      if (mpn) tryAdd(index.byMpn.get(mpn), "T1", `MPN exact match (${field})`, TIER_BASE_CONFIDENCE.T1);
    }
  }

  if (denormalized.gtin) {
    tryAdd(index.byGtin.get(denormalized.gtin), "T0", "GTIN exact match (denormalized)", TIER_BASE_CONFIDENCE.T0);
  }
  if (denormalized.mpn) {
    tryAdd(index.byMpn.get(denormalized.mpn), "T1", "MPN exact match (denormalized)", TIER_BASE_CONFIDENCE.T1);
  }

  const brand = denormalized.brand ?? "";
  const model = denormalized.model ?? "";
  if (brand && model) {
    tryAdd(
      index.byBrandModel.get(brandModelKey(brand, model)),
      "T2",
      "Brand + model match",
      TIER_BASE_CONFIDENCE.T2,
    );
  }

  const tupleKey =
    config.tupleFields.length > 0
      ? tupleKeyFromFields(values, config.tupleFields)
      : denormalized.tupleKey;
  if (tupleKey.replace(/\|/g, "").length > 0) {
    tryAdd(index.byTupleKey.get(tupleKey), "T3", "Tuple key match", TIER_BASE_CONFIDENCE.T3);
  }

  if (config.weightedFields.length > 0) {
    for (const product of index.products) {
      if (product.categoryId !== categoryId) continue;
      const score = weightedSimilarity(values, product.attributes, config);
      if (score >= 0.6) {
        tryAdd(product.id, "T4", `Weighted attribute similarity (${score.toFixed(2)})`, score * TIER_BASE_CONFIDENCE.T4);
      }
    }
  }

  candidates.sort((a, b) => {
    const tierDiff = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    if (tierDiff !== 0) return tierDiff;
    return b.confidence - a.confidence;
  });

  return {
    candidates,
    bestConfidence: candidates[0]?.confidence ?? 0,
  };
}

function weightedSimilarity(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  config: MatchingConfig,
): number {
  let total = 0;
  let matched = 0;
  for (const { code, weight } of config.weightedFields) {
    total += weight;
    const av = serializeMatchValue(a[code]);
    const bv = serializeMatchValue(b[code]);
    if (av && bv && av === bv) matched += weight;
  }
  return total === 0 ? 0 : matched / total;
}

function serializeMatchValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.toLowerCase().trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(serializeMatchValue).sort().join(",");
  if (typeof value === "object" && "code" in value) {
    return String((value as { code: unknown }).code).toLowerCase().trim();
  }
  if (typeof value === "object" && "value" in value && "unit" in value) {
    const m = value as { value: number; unit: string };
    return `${m.value}:${m.unit}`;
  }
  return JSON.stringify(value);
}
