import type { MarketOfferDTO } from "./market-offer.dto";

/** Deduped catalog view built from `store_products` offers (same SoT as `products`). */
export type CatalogProductViewDTO = {
  /** Stable representative catalog id (deterministic within cluster). */
  productId: string;
  /** Human-readable title (trimmed / collapsed spaces). */
  title: string;
  brand: string | null;
  model: string | null;
  /** Reserved for future taxonomy fields; null without extra catalog columns. */
  category: string | null;
  offers: MarketOfferDTO[];
  bestOffer: MarketOfferDTO;
  priceRange: {
    minPrice: number;
    maxPrice: number;
    currency: string;
  };
  stockTotal: number;
  vendorCount: number;
  offerCount: number;
  /** Deterministic 0–1 heuristic (not ML). */
  identityConfidenceScore: number;
};
