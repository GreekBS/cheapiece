/**
 * Client-safe Phase 3 UI surface.
 *
 * Use this entry from `"use client"` components instead of `@/modules/catalog-products-read/ui/server`.
 * Never import server-only mappers (`to-merchant-form-contract`, `to-admin-request-preview.vm`) here.
 */

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
