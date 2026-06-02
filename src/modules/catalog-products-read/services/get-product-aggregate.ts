import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchProductCatalogPublicationByProductId } from "@/modules/catalog-products/queries/product-publication-queries";
import { fetchMarketDiscoveryOffers } from "@/modules/market/queries/search-market-offers";
import { mapDiscoveryRowsToOfferDTOs } from "@/modules/market/services/discovery-offer-mapper";

import { mergeProductAggregate } from "../application/merge-product-aggregate";
import type { ProductAggregateDTO } from "../types/product-aggregate.dto";
import { fetchActiveProductIdentityById } from "../queries/product-identity-read-queries";

const OFFER_FETCH_CAP = 200;

/**
 * Canonical single-product read path: identity + frozen publication + active offers.
 * No schema evaluation — snapshot consumption only.
 */
export async function getProductAggregate(
  supabase: SupabaseClient,
  productId: string,
  options?: { tenantId?: string },
): Promise<ProductAggregateDTO | null> {
  const tenantId = options?.tenantId;

  const [product, publication, offerResult] = await Promise.all([
    fetchActiveProductIdentityById(supabase, productId, tenantId),
    fetchProductCatalogPublicationByProductId(supabase, productId),
    fetchMarketDiscoveryOffers(
      supabase,
      {
        state: "active",
        productId,
        limit: OFFER_FETCH_CAP,
        offset: 0,
        ...(tenantId ? { tenantId } : {}),
      },
      undefined,
    ),
  ]);

  if (!product) {
    return null;
  }

  const offers =
    offerResult.rows.length > 0 ? await mapDiscoveryRowsToOfferDTOs(supabase, offerResult.rows) : [];

  return mergeProductAggregate({
    product,
    publication,
    offers,
  });
}
