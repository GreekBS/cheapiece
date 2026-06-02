import type { ProductAggregateDTO } from "../../types/product-aggregate.dto";

/** Facet filter — matched against `publication.facet_snapshot` only. */
export type FacetFilter = {
  code: string;
  value: string | number | boolean | string[];
};

/**
 * Category listing query (Phase 3B-2).
 * price sorting deferred to Phase 3B-2b (aggregation optimization layer)
 */
export type CategoryProductListQuery = {
  page: number;
  pageSize: number;
  sort: "newest" | "title_asc";
  /** Legacy scalar filter on `products.brand` — not a schema facet. */
  brand?: string | null;
  facetFilters?: FacetFilter[];
};

export type CategoryProductListResult = {
  items: ProductAggregateDTO[];
  /** Signed thumbnail URLs keyed by product id (marketplace `product_images`). */
  primaryImageUrls: Map<string, string>;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalCount: number | null;
};
