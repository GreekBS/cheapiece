import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchMarketDiscoveryOffers } from "../queries/search-market-offers";
import type { MarketOfferDTO } from "../types/market-offer.dto";
import type { ProductAggregateDTO } from "../types/product-aggregate.dto";
import { buildProductAggregates } from "../utils/product-grouping";

import { mapDiscoveryRowsToOfferDTOs } from "./market-discovery-service";

export { groupOffersByProduct } from "../utils/product-grouping";

export function buildProductCardsFromOffers(offers: MarketOfferDTO[]): ProductAggregateDTO[] {
  return buildProductAggregates(offers);
}

const PRODUCT_FETCH_CAP = 200;

/**
 * All marketplace-visible offers for a single catalog product (single batched query + vendor map).
 */
export async function getProductWithOffers(
  db: SupabaseClient,
  productId: string,
  tenantId?: string,
): Promise<ProductAggregateDTO | null> {
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
  return buildProductAggregates(offers)[0] ?? null;
}

export const getProductMarketplaceView = getProductWithOffers;
