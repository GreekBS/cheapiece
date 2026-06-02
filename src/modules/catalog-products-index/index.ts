/**
 * Phase 3C read acceleration layer — write at publish, read via listing index-first path.
 * Source of truth: product_catalog_publications (facet_snapshot unchanged).
 */

export type {
  FacetIndexMap,
  ProductPublicationIndexRow,
  ProductPublicationIndexUpsert,
} from "./types/product-publication-index";

export { buildPublicationIndex, flattenFacetSnapshot } from "./build-publication-index";
export {
  applyIndexFacetFilters,
  facetFiltersToIndexContainsMap,
} from "./apply-index-facet-filters";
