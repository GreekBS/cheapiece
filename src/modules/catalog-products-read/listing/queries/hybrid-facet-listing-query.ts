import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";

import type { ProductIdentityDTO } from "../../types/product-aggregate.dto";
import type { CategoryProductListQuery, FacetFilter } from "../types/category-product-list.dto";

import {
  fetchIndexFacetListingPage,
  fetchIndexedProductIdsInCategory,
} from "./index-facet-listing-query";
import { fetchPublicationFacetListingPage } from "./publication-facet-listing-query";

const LEGACY_CANDIDATE_CAP = 200;

export type HybridFacetListingPage = {
  products: ProductIdentityDTO[];
  publicationsByProductId: Map<string, ProductCatalogPublicationRow>;
  hasMore: boolean;
  totalCount: number | null;
};

/**
 * Index-first facet listing with publication.facet_snapshot fallback.
 * - Indexed products: product_publication_index.facet_index (GIN hot path)
 * - Legacy (no index row): publication.facet_snapshot via applyFacetFilters
 */
export async function fetchHybridFacetListingPage(
  supabase: SupabaseClient,
  categoryId: string,
  query: CategoryProductListQuery,
  facetFilters: FacetFilter[],
  tenantId?: string,
): Promise<HybridFacetListingPage> {
  const indexPage = await fetchIndexFacetListingPage(
    supabase,
    categoryId,
    query,
    facetFilters,
    tenantId,
  );

  const indexedIds = await fetchIndexedProductIdsInCategory(supabase, categoryId, tenantId);

  const legacyMatches = await fetchLegacyPublicationFacetMatches(
    supabase,
    categoryId,
    facetFilters,
    tenantId,
    indexedIds,
  );

  if (indexPage.products.length === 0 && legacyMatches.products.length === 0) {
    return {
      products: [],
      publicationsByProductId: new Map(),
      hasMore: false,
      totalCount: 0,
    };
  }

  if (indexPage.products.length === 0) {
    return legacyMatches;
  }

  const pageSize = Math.min(Math.max(query.pageSize, 1), 48);
  const products = [...indexPage.products];
  const publicationsByProductId = new Map(legacyMatches.publicationsByProductId);

  if (products.length < pageSize && legacyMatches.products.length > 0) {
    const room = pageSize - products.length;
    for (const legacyProduct of legacyMatches.products.slice(0, room)) {
      products.push(legacyProduct);
    }
  }

  return {
    products,
    publicationsByProductId,
    hasMore: indexPage.hasMore || legacyMatches.hasMore,
    totalCount: indexPage.totalCount,
  };
}

async function fetchLegacyPublicationFacetMatches(
  supabase: SupabaseClient,
  categoryId: string,
  facetFilters: FacetFilter[],
  tenantId: string | undefined,
  indexedProductIds: Set<string>,
): Promise<HybridFacetListingPage> {
  const legacyQuery: CategoryProductListQuery = {
    page: 1,
    pageSize: LEGACY_CANDIDATE_CAP,
    sort: "newest",
    facetFilters,
  };

  const raw = await fetchPublicationFacetListingPage(
    supabase,
    categoryId,
    legacyQuery,
    facetFilters,
    tenantId,
  );

  const products: ProductIdentityDTO[] = [];
  const publicationsByProductId = new Map<string, ProductCatalogPublicationRow>();

  for (const product of raw.products) {
    if (indexedProductIds.has(product.id)) {
      continue;
    }
    products.push(product);
    const pub = raw.publicationsByProductId.get(product.id);
    if (pub) {
      publicationsByProductId.set(product.id, pub);
    }
  }

  return {
    products,
    publicationsByProductId,
    hasMore: products.length > 0,
    totalCount: null,
  };
}
