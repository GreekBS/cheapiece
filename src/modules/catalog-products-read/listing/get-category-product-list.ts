import type { SupabaseClient } from "@supabase/supabase-js";

import { mapDiscoveryRowsToOfferDTOs } from "@/modules/market/services/discovery-offer-mapper";
import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import type { CategoryProductListQuery, CategoryProductListResult } from "./types/category-product-list.dto";
import { mergeProductAggregatesForListing } from "./merge-listing-aggregates";
import { fetchActiveOffersForProductIds } from "./queries/batch-listing-offers";
import { fetchPublicationsByProductIds } from "./queries/batch-publications";
import { getPrimaryImagesMap } from "@/modules/product-images/server/resolve-public-product-images";

import { fetchCategoryProductsPage } from "./queries/category-products-query";
import { fetchHybridFacetListingPage } from "./queries/hybrid-facet-listing-query";

/**
 * Category listing read engine (Phase 3B-2).
 *
 * - Publication is the facet filtering layer; products are identity-only join.
 * - Unfiltered listings: products drive pagination (includes items without publication).
 * - Facet filters: index-first (product_publication_index.facet_index), legacy publication.facet_snapshot fallback.
 *
 * // Products are not filtered by offer availability (marketplace completeness rule)
 * // price sorting deferred to Phase 3B-2b (aggregation optimization layer)
 *
 * NO schema kernel, NO attribute_payload, NO getProductAggregate in loops.
 */
export async function getCategoryProductList(
  supabase: SupabaseClient,
  categoryId: string,
  query: CategoryProductListQuery,
  options?: { tenantId?: string },
): Promise<CategoryProductListResult> {
  const page = Math.max(query.page, 1);
  const pageSize = Math.min(Math.max(query.pageSize, 1), 48);
  const facetFilters = query.facetFilters?.filter((f) => f.code.trim().length > 0) ?? [];
  const tenantId = options?.tenantId;

  if (facetFilters.length > 0) {
    return listWithPublicationFacetFilters(supabase, categoryId, { ...query, page, pageSize }, facetFilters, tenantId);
  }

  return listUnfilteredCategoryProducts(supabase, categoryId, { ...query, page, pageSize }, tenantId);
}

async function listUnfilteredCategoryProducts(
  supabase: SupabaseClient,
  categoryId: string,
  query: CategoryProductListQuery,
  tenantId?: string,
): Promise<CategoryProductListResult> {
  const { products, hasMore, totalCount } = await fetchCategoryProductsPage(
    supabase,
    categoryId,
    query,
    tenantId,
  );

  if (products.length === 0) {
    return {
      items: [],
      primaryImageUrls: new Map(),
      page: query.page,
      pageSize: query.pageSize,
      hasMore: false,
      totalCount,
    };
  }

  const productIds = products.map((p) => p.id);

  const [publicationsByProductId, offerRows, primaryImageUrls] = await Promise.all([
    fetchPublicationsByProductIds(supabase, productIds),
    fetchActiveOffersForProductIds(supabase, productIds, tenantId),
    tenantId ? getPrimaryImagesMap(tenantId, productIds, supabase) : Promise.resolve(new Map<string, string>()),
  ]);

  const offersByProductId = await mapOffersByProductId(supabase, offerRows);

  const items = mergeProductAggregatesForListing({
    products,
    publicationsByProductId,
    offersByProductId,
  });

  return {
    items,
    primaryImageUrls,
    page: query.page,
    pageSize: query.pageSize,
    hasMore,
    totalCount,
  };
}

async function listWithPublicationFacetFilters(
  supabase: SupabaseClient,
  categoryId: string,
  query: CategoryProductListQuery,
  facetFilters: NonNullable<CategoryProductListQuery["facetFilters"]>,
  tenantId?: string,
): Promise<CategoryProductListResult> {
  const { products, publicationsByProductId, hasMore, totalCount } =
    await fetchHybridFacetListingPage(supabase, categoryId, query, facetFilters, tenantId);

  if (products.length === 0) {
    return {
      items: [],
      primaryImageUrls: new Map(),
      page: query.page,
      pageSize: query.pageSize,
      hasMore: false,
      totalCount,
    };
  }

  const productIds = products.map((p) => p.id);

  const [batchPublications, offerRows, primaryImageUrls] = await Promise.all([
    fetchPublicationsByProductIds(supabase, productIds),
    fetchActiveOffersForProductIds(supabase, productIds, tenantId),
    tenantId ? getPrimaryImagesMap(tenantId, productIds, supabase) : Promise.resolve(new Map<string, string>()),
  ]);

  const mergedPublications = new Map(publicationsByProductId);
  for (const [id, row] of batchPublications.entries()) {
    mergedPublications.set(id, row);
  }

  const offersByProductId = await mapOffersByProductId(supabase, offerRows);

  const items = mergeProductAggregatesForListing({
    products,
    publicationsByProductId: mergedPublications,
    offersByProductId,
  });

  return {
    items,
    primaryImageUrls,
    page: query.page,
    pageSize: query.pageSize,
    hasMore,
    totalCount,
  };
}

async function mapOffersByProductId(
  supabase: SupabaseClient,
  offerRows: Awaited<ReturnType<typeof fetchActiveOffersForProductIds>>,
): Promise<Map<string, MarketOfferDTO[]>> {
  const out = new Map<string, MarketOfferDTO[]>();
  if (offerRows.length === 0) {
    return out;
  }

  const dtos = await mapDiscoveryRowsToOfferDTOs(supabase, offerRows);
  for (const dto of dtos) {
    const list = out.get(dto.productId) ?? [];
    list.push(dto);
    out.set(dto.productId, list);
  }
  return out;
}
