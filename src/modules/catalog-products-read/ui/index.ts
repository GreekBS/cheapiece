/**
 * Phase 3 UI contract layer.
 *
 * Import boundary:
 * - Client components: `@/modules/catalog-products-read/ui/client` (DTOs only)
 * - Server RSC / actions: `@/modules/catalog-products-read/ui/server` (loaders)
 * - Pure transforms (RSC): mappers exported below — NOT `to-merchant-form-contract` / `to-admin-request-preview.vm`
 * - Never import catalog-schema kernel from client components.
 */

export {
  resolveMarketplaceProductAccess,
  type MarketplaceProductAccessContext,
  type MarketplaceProductAccessResult,
} from "./policy/marketplace-product-access";

export {
  pickActivePublishedSchemaVersion,
  type ActivePublishedSchemaVersion,
  type PublishedSchemaVersionCandidate,
} from "./policy/active-published-schema";

export type {
  ProductMarketViewModel,
  ProductMarketOfferVM,
} from "./dto/product-market.vm";

export type { ProductCardViewModel } from "./dto/product-card.vm";

export type {
  CategoryFacetCatalogDTO,
  CategoryFacetDefinitionDTO,
  CategoryFacetEnumOptionDTO,
  FacetCatalogSchemaInput,
  FacetCatalogSchemaFieldInput,
  FacetControlKind,
  FacetPrimitive,
} from "./dto/category-facet-catalog.dto";

export type {
  MerchantFormContractDTO,
  MerchantFormFieldDTO,
  MerchantFormGroupDTO,
} from "./dto/merchant-form-contract.dto";

export type {
  MerchantFormLoadResult,
  MerchantFormLoadMode,
  MerchantFormLoadResultLegacy,
  MerchantFormLoadResultPartial,
  MerchantFormLoadResultStrict,
} from "./dto/merchant-form-load-result.dto";

export type {
  AdminRequestPreviewVM,
  AdminRequestPreviewMode,
  AdminRequestPreviewScalars,
  AdminRequestPreviewDisplayGroup,
  AdminRequestPreviewDisplayField,
  AdminRequestValidationModeDisplay,
} from "./dto/admin-request-preview.vm";

export { mapAggregateToProductMarketVM } from "./mappers/map-aggregate-to-market-vm";
export { mapAggregateToProductCardVM } from "./mappers/map-aggregate-to-card-vm";
export { buildCategoryFacetCatalogFromPublishedSchema } from "./mappers/build-category-facet-catalog";
