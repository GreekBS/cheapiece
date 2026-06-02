import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getPdpFromCache, setPdpCache } from "@/lib/cache/pdp-cache";
import { getProductGalleryWithPrimary } from "@/modules/product-images/server/resolve-public-product-images";

import { getProductAggregate } from "../../services/get-product-aggregate";
import { fetchProductMarketStats } from "../../queries/product-market-stats-queries";
import { mapAggregateToPublicProductMarketVM } from "../mappers/map-aggregate-to-market-vm";
import { resolveMarketplaceProductAccess } from "../policy/marketplace-product-access";
import type { ProductMarketViewModel } from "../dto/product-market.vm";
import { normalizePdpViewModelFromCache } from "./normalize-pdp-view-model";

export type CatalogPdpLoadResult = { kind: "not_found" } | { kind: "ok"; viewModel: ProductMarketViewModel };

export type LoadCatalogPdpPageArgs = {
  productId: string;
  tenantId: string;
};

/**
 * Marketplace PDP: product gate → aggregate → optional stats → cache v2 → VM.
 * 404 only when product missing, inactive, or wrong tenant (never stats/offer count).
 */
export async function loadCatalogPdpPage(
  supabase: SupabaseClient,
  args: LoadCatalogPdpPageArgs,
): Promise<CatalogPdpLoadResult> {
  const { productId, tenantId } = args;

  const aggregate = await getProductAggregate(supabase, productId, { tenantId });
  const access = resolveMarketplaceProductAccess(aggregate, { tenantId });
  if (access.kind === "not_found") {
    return { kind: "not_found" };
  }

  const stats = await fetchProductMarketStats(supabase, tenantId, productId);
  const cacheVersion = stats?.stats_version ?? 0;

  const { primaryImageUrl, galleryImages } = await getProductGalleryWithPrimary(
    tenantId,
    productId,
    supabase,
  );

  const cached = await getPdpFromCache(tenantId, productId, cacheVersion);
  const baseViewModel = cached
    ? normalizePdpViewModelFromCache(cached, aggregate!, stats)
    : mapAggregateToPublicProductMarketVM(aggregate!, stats);

  if (!cached) {
    await setPdpCache(tenantId, productId, baseViewModel);
  }

  const viewModel: ProductMarketViewModel = {
    ...baseViewModel,
    primaryImageUrl,
    galleryImages,
  };

  return { kind: "ok", viewModel };
}
