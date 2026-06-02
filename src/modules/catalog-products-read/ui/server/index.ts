/**
 * Server-only UI loaders — import only from RSC, route handlers, or server actions.
 */

export { loadCatalogPdpPage, type CatalogPdpLoadResult, type LoadCatalogPdpPageArgs } from "./load-catalog-pdp";
export {
  loadCategoryFacetCatalog,
  type LoadCategoryFacetCatalogArgs,
} from "./load-category-facet-catalog";
export {
  loadCategoryBrandOptions,
  type LoadCategoryBrandOptionsArgs,
} from "./load-category-brand-options";
export { invalidateCategoryMarketplaceCaches } from "./invalidate-category-marketplace-caches";
export {
  brandOptionsTag,
  facetCatalogCategoryTag,
  facetCatalogVersionTag,
} from "./marketplace-cache-tags";
export {
  loadMerchantFormContract,
  type LoadMerchantFormContractArgs,
} from "./load-merchant-form-contract";
export { resolveActivePublishedSchemaVersion } from "./resolve-active-published-schema-version";
