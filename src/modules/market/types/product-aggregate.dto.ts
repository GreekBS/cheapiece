/**
 * LEGACY commerce-only aggregate (offers / store_products domain).
 *
 * BOUNDARY: Frontend marketplace pages MUST use
 * `@/modules/catalog-products-read` `ProductAggregateDTO` — not this type.
 * This DTO remains internal to `market/` for offer grouping and discovery cards.
 */
import type { MarketOfferDTO } from "./market-offer.dto";

export type ProductAggregateDTO = {
  productId: string;
  productTitle: string;
  productBrand: string | null;
  productModel: string | null;
  offers: MarketOfferDTO[];
  bestOffer: MarketOfferDTO;
  priceRange: {
    minPrice: number;
    maxPrice: number;
    currency: string;
  };
  totalOffers: number;
  availableStockTotal: number;
};
