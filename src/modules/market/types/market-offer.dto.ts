/**
 * Normalized marketplace listing for buyer UI (RLS-scoped source rows).
 */
export type MarketOfferDTO = {
  id: string;
  /** Catalog product id (`store_products.product_id` → `products.id`) for aggregation. */
  productId: string;
  title: string;
  slug: string | null;
  productBrand: string | null;
  productModel: string | null;
  price: number;
  currency: string;
  condition: string;
  stock: number;
  vendorName: string;
  updatedAt: string | null;
};

export type MarketplaceStatsDTO = {
  totalActiveOffers: number;
};

export type MarketOfferListFilters = {
  /** When set, restricts `store_products` to this tenant (public marketplace). */
  tenantId?: string;
  priceMin?: number;
  priceMax?: number;
  /** When set, restricts store_products.condition */
  condition?: "new" | "used" | "refurbished";
  /** Listing state; default active-only for discovery */
  state?: string;
  /** Restrict to a single catalog product (application filter; no schema change). */
  productId?: string;
  limit?: number;
  offset?: number;
  /** 1-based page when `offset` is not provided */
  page?: number;
};

export type MarketOfferListResult = {
  offers: MarketOfferDTO[];
  totalCount: number | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
