import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchMarketDiscoveryOffers } from "../queries/search-market-offers";
import type { CatalogProductViewDTO } from "../types/catalog-product-view.dto";
import type { MarketOfferDTO } from "../types/market-offer.dto";
import { clusterOffersByIdentity } from "../utils/product-identity-clustering";
import { mergeClusterToCatalogView, mergeProductClusters } from "../utils/product-merger";

import { mapDiscoveryRowsToOfferDTOs } from "./discovery-offer-mapper";

const PRODUCT_FETCH_CAP = 200;

/**
 * Resolve flat offer feed into catalog product views (deduped clusters; SoT remains `products` / `store_products`).
 */
export function resolveCatalogProductViewsFromOffers(offers: MarketOfferDTO[]): CatalogProductViewDTO[] {
  const clusters = clusterOffersByIdentity(offers);
  const views = clusters.map((c) => mergeClusterToCatalogView(c)).filter((x): x is CatalogProductViewDTO => x != null);
  views.sort((a, b) => {
    if (a.bestOffer.price !== b.bestOffer.price) {
      return a.bestOffer.price - b.bestOffer.price;
    }
    return a.title.localeCompare(b.title);
  });
  return views;
}

export function getProductCatalogView(offers: MarketOfferDTO[]): CatalogProductViewDTO[] {
  return resolveCatalogProductViewsFromOffers(offers);
}

/**
 * Catalog view for one `products.id` (batched fetch + identity pass).
 * When multiple DB product rows share normalized identity with this slice only, they appear merged.
 */
export async function getProductIdentity(
  db: SupabaseClient,
  productId: string,
  tenantId?: string,
): Promise<CatalogProductViewDTO | null> {
  const { rows } = await fetchMarketDiscoveryOffers(
    db,
    {
      state: "active",
      productId,
      limit: PRODUCT_FETCH_CAP,
      offset: 0,
      ...(tenantId ? { tenantId } : {}),
    },
    undefined,
  );
  if (rows.length === 0) {
    return null;
  }
  const offers = await mapDiscoveryRowsToOfferDTOs(db, rows);
  const list = resolveCatalogProductViewsFromOffers(offers);
  const hit =
    list.find((c) => c.productId === productId) ??
    list.find((c) => c.offers.some((o) => o.productId === productId)) ??
    list[0] ??
    null;
  return hit;
}

export { mergeProductClusters };
