import type { MarketOfferDTO } from "../types/market-offer.dto";
import type { CatalogProductViewDTO } from "../types/catalog-product-view.dto";
import { normalizedTupleKey } from "./product-identity-clustering";
import { pickBestOffer, sortOffersForProductPage } from "./best-offer";

function collapseDisplayTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function uniqueVendorNames(offers: MarketOfferDTO[]): number {
  return new Set(offers.map((o) => o.vendorName)).size;
}

function weakTupleEvidence(offer: MarketOfferDTO): boolean {
  const t = normalizedTupleKey(offer);
  const parts = t.split("|");
  const titleOnly = parts[0] ?? "";
  const brand = parts[1] ?? "";
  const model = parts[2] ?? "";
  return !brand && !model && titleOnly.length < 4;
}

/**
 * Deterministic 0–1 heuristic (not ML):
 * exact same catalog `productId` → 1.0;
 * cross-id merge via normalized (title+brand+model) → 0.7–0.9;
 * sparse identity (partial) → 0.4–0.6.
 */
export function computeIdentityConfidence(offers: MarketOfferDTO[]): number {
  if (offers.length === 0) {
    return 0;
  }
  const pids = new Set(offers.map((o) => o.productId));
  const sameCatalogId = pids.size === 1;

  if (sameCatalogId) {
    const weak = offers.some(weakTupleEvidence);
    if (offers.length === 1) {
      return weak ? 0.5 : 1;
    }
    return weak ? 0.55 : 1;
  }

  const tupleKeys = new Set(offers.map((o) => normalizedTupleKey(o)));
  if (tupleKeys.size !== 1) {
    return 0.45;
  }

  const weak = offers.some(weakTupleEvidence);
  if (weak) {
    return offers.length >= 3 ? 0.55 : 0.45;
  }
  return offers.length >= 4 ? 0.9 : 0.75;
}

export function mergeClusterToCatalogView(cluster: MarketOfferDTO[]): CatalogProductViewDTO | null {
  if (cluster.length === 0) {
    return null;
  }

  const sorted = sortOffersForProductPage(cluster);
  const best = pickBestOffer(sorted) ?? sorted[0]!;
  const prices = sorted.map((o) => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currency = best.currency;
  const stockTotal = sorted.reduce((s, o) => s + (Number.isFinite(o.stock) ? o.stock : 0), 0);
  const representativeProductId = [...new Set(sorted.map((o) => o.productId))].sort()[0]!;

  return {
    productId: representativeProductId,
    title: collapseDisplayTitle(best.title),
    brand: best.productBrand,
    model: best.productModel,
    category: null,
    offers: sorted,
    bestOffer: best,
    priceRange: { minPrice, maxPrice, currency },
    stockTotal,
    vendorCount: uniqueVendorNames(sorted),
    offerCount: sorted.length,
    identityConfidenceScore: computeIdentityConfidence(sorted),
  };
}

/** Merge two catalog clusters (same identity layer) into one. */
export function mergeProductClusters(a: CatalogProductViewDTO, b: CatalogProductViewDTO): CatalogProductViewDTO {
  return mergeClusterToCatalogView([...a.offers, ...b.offers])!;
}
