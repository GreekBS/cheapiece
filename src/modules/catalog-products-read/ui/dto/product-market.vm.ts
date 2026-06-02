import type { ProductDisplayGroup, ProductDisplayScalars } from "@/modules/catalog-products/types/display-snapshot";

export type ProductMarketOfferVM = {
  id: string;
  productId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  stock: number;
  vendorName: string;
  updatedAt: string | null;
};

/** Marketplace PDP view model — snapshot + split offers; no kernel types. */
export type ProductMarketViewModel = {
  productId: string;
  tenantId: string;
  title: string;
  brand: string | null;
  model: string | null;
  slug: string;
  categoryId: string | null;
  hasPublication: boolean;
  isSchemaDriven: boolean;
  locale: string | null;
  scalars: ProductDisplayScalars | null;
  specGroups: ProductDisplayGroup[];
  buyableOffers: ProductMarketOfferVM[];
  outOfStockOffers: ProductMarketOfferVM[];
  primaryOffer: ProductMarketOfferVM | null;
  activeOfferCount: number;
  buyableOfferCount: number;
  statsVersion: number;
  computedAt: string | null;
  /** Derived from aggregate.offers (UI truth). */
  hasActiveOffers: boolean;
  hasBuyableOffers: boolean;
  isOfferless: boolean;
  /** True when header counts came from product_market_stats. */
  hasStatsSnapshot: boolean;
  /** Signed URL from `product_images` (not stored in PDP cache). */
  primaryImageUrl: string | null;
  galleryImages: { url: string; sortOrder: number }[];
};
