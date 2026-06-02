/**

 * Canonical marketplace READ model (Phase 3B).

 *

 * BOUNDARY:

 * - Consumes frozen `product_catalog_publications` snapshots only — no catalog-schema kernel.

 * - Reuses `market/` offer DTOs/queries for store_products — commerce stays in market/.

 * - Frontend marketplace MUST import from this module, never from `market/ProductAggregateDTO`.

 */



export type { ProductAggregateDTO, ProductIdentityDTO } from "./types/product-aggregate.dto";

export type { ProductPublicationReadDTO, ProductDisplayReadSnapshot } from "./types/product-publication-read.dto";



export type {

  CategoryProductListQuery,

  CategoryProductListResult,

  FacetFilter,

} from "./listing/types/category-product-list.dto";



export { mergeProductAggregate } from "./application/merge-product-aggregate";

export { pickPrimaryOffer } from "./application/pick-primary-offer";

export { getProductAggregate } from "./services/get-product-aggregate";



export { getCategoryProductList } from "./listing/get-category-product-list";

export { mergeProductAggregatesForListing } from "./listing/merge-listing-aggregates";

export { applyFacetFilters } from "./listing/apply-facet-filters";

export {

  facetFilterToContainsFragment,

} from "./listing/facet-filter-rules";


