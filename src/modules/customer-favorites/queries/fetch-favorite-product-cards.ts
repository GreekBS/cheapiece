import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchActiveOffersForProductIds } from "@/modules/catalog-products-read/listing/queries/batch-listing-offers";
import { fetchPublicationsByProductIds } from "@/modules/catalog-products-read/listing/queries/batch-publications";
import { mergeProductAggregatesForListing } from "@/modules/catalog-products-read/listing/merge-listing-aggregates";
import type { ProductIdentityDTO } from "@/modules/catalog-products-read/types/product-aggregate.dto";
import type { ProductCardViewModel } from "@/modules/catalog-products-read/ui/dto/product-card.vm";
import { mapAggregateToProductCardVM } from "@/modules/catalog-products-read/ui/mappers/map-aggregate-to-card-vm";
import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";
import { mapDiscoveryRowsToOfferDTOs } from "@/modules/market/services/discovery-offer-mapper";
import { getPrimaryImagesMap } from "@/modules/product-images/server/resolve-public-product-images";

import { fetchFavoriteProductIdsForUser } from "./fetch-favorite-product-ids";

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

function mapProductRow(r: Record<string, unknown>): ProductIdentityDTO {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    title: r.title as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    slug: r.slug as string,
    categoryId: (r.category_id as string | null) ?? null,
    state: r.state as string,
  };
}

async function fetchActiveProductsByIds(
  supabase: SupabaseClient,
  productIds: string[],
  tenantId?: string,
): Promise<ProductIdentityDTO[]> {
  if (productIds.length === 0) {
    return [];
  }

  let q = supabase
    .from("products")
    .select("id, tenant_id, title, brand, model, slug, category_id, state")
    .in("id", productIds)
    .eq("state", "active");

  if (tenantId) {
    q = q.eq("tenant_id", tenantId);
  }

  const { data, error } = await q;
  if (error || !data) {
    return [];
  }

  return (data as Record<string, unknown>[]).map(mapProductRow);
}

/** Favorite products as listing cards, preserving favorite recency order. */
export async function fetchFavoriteProductCardsForUser(
  supabase: SupabaseClient,
  userId: string,
  tenantId?: string,
): Promise<ProductCardViewModel[]> {
  const favoriteIds = await fetchFavoriteProductIdsForUser(supabase, userId);
  if (favoriteIds.length === 0) {
    return [];
  }

  const products = await fetchActiveProductsByIds(supabase, favoriteIds, tenantId);
  if (products.length === 0) {
    return [];
  }

  const activeIds = products.map((p) => p.id);
  const productById = new Map(products.map((p) => [p.id, p]));

  const [publicationsByProductId, offerRows, primaryImageUrls] = await Promise.all([
    fetchPublicationsByProductIds(supabase, activeIds),
    fetchActiveOffersForProductIds(supabase, activeIds, tenantId),
    tenantId ? getPrimaryImagesMap(tenantId, activeIds, supabase) : Promise.resolve(new Map<string, string>()),
  ]);

  const offersByProductId = await mapOffersByProductId(supabase, offerRows);
  const aggregates = mergeProductAggregatesForListing({
    products,
    publicationsByProductId,
    offersByProductId,
  });
  const aggregateById = new Map(aggregates.map((a) => [a.product.id, a]));

  return favoriteIds
    .map((id) => {
      const aggregate = aggregateById.get(id);
      if (!aggregate || !productById.has(id)) {
        return null;
      }
      return mapAggregateToProductCardVM(aggregate, primaryImageUrls.get(id) ?? null);
    })
    .filter((card): card is ProductCardViewModel => card !== null);
}
