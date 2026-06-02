import type { CatalogProductViewDTO } from "./catalog-product-view.dto";
import type { MarketOfferDTO } from "./market-offer.dto";

/** Alias for product-page contract (same shape as marketplace offer DTO). */
export type OfferDTO = MarketOfferDTO;

/**
 * Product-centric page contract — mapped from `CatalogProductViewDTO` / identity layer only.
 * Currency for money display comes from `bestOffer.currency` (single-currency assumption per cluster).
 */
export type ProductPageDTO = {
  productId: string;
  title: string;
  brand?: string;
  model?: string;
  identityConfidenceScore: number;
  priceRange: {
    min: number;
    max: number;
  };
  bestOffer: OfferDTO;
  offers: OfferDTO[];
  vendorCount: number;
  offerCount: number;
};

export function toProductPageDTO(view: CatalogProductViewDTO): ProductPageDTO {
  return {
    productId: view.productId,
    title: view.title,
    brand: view.brand ?? undefined,
    model: view.model ?? undefined,
    identityConfidenceScore: view.identityConfidenceScore,
    priceRange: {
      min: view.priceRange.minPrice,
      max: view.priceRange.maxPrice,
    },
    bestOffer: view.bestOffer,
    offers: view.offers,
    vendorCount: view.vendorCount,
    offerCount: view.offerCount,
  };
}
