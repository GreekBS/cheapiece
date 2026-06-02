import type { ProductAggregateDTO } from "./product-aggregate.dto";

/** Facet filter — matched against `publication.facet_snapshot` only (3B-2). */
export type FacetFilter = {
  code: string;
  value: string | number | boolean | string[];
};

/**
 * Category listing query.
 * price sorting deferred to Phase 3B-2b (aggregation optimization layer)
 */
export type CategoryProductListQuery = {
  page: number;
  pageSize: number;
  sort: "newest" | "title_asc";
  facetFilters?: FacetFilter[];
};

export type CategoryProductListResult = {
  items: ProductAggregateDTO[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalCount: number | null;
};
