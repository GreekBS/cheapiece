import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchMarketDiscoveryOffers, fetchMarketOfferDiscoveryDetail } from "../queries/search-market-offers";
import type {
  MarketOfferDTO,
  MarketOfferListFilters,
  MarketOfferListResult,
  MarketplaceStatsDTO,
} from "../types/market-offer.dto";
import type { CatalogProductViewDTO } from "../types/catalog-product-view.dto";
import { resolveCatalogProductViewsFromOffers } from "./product-identity-service";

import { mapDiscoveryRowsToOfferDTOs } from "./discovery-offer-mapper";

export { mapDiscoveryRowsToOfferDTOs } from "./discovery-offer-mapper";

const DEFAULT_PAGE_SIZE = 24;

function normalizePaging(filters: MarketOfferListFilters): { limit: number; offset: number; page: number } {
  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_PAGE_SIZE, 1), 48);
  let page = 1;
  let offset = 0;

  if (filters.offset != null && filters.offset >= 0) {
    offset = filters.offset;
    page = Math.floor(offset / limit) + 1;
  } else if (filters.page != null && filters.page > 0) {
    page = filters.page;
    offset = (page - 1) * limit;
  }

  return { limit, offset, page };
}

async function listCore(
  db: SupabaseClient,
  filters: MarketOfferListFilters,
  searchText?: string,
): Promise<MarketOfferListResult> {
  const { limit, offset, page } = normalizePaging(filters);
  const payload: MarketOfferListFilters = { ...filters, limit, offset };

  const { rows, count } = await fetchMarketDiscoveryOffers(db, payload, {
    searchText: searchText?.trim() || undefined,
  });
  const offers = await mapDiscoveryRowsToOfferDTOs(db, rows);
  const totalCount = count;
  const hasMore = totalCount != null ? offset + offers.length < totalCount : offers.length === limit;

  return { offers, totalCount, page, pageSize: limit, hasMore };
}

export type CatalogMarketplaceViewResult = MarketOfferListResult & {
  catalogProductViews: CatalogProductViewDTO[];
};

/**
 * Offer-level pagination + batched vendor resolve, then server-side catalog identity clustering.
 */
export async function getCatalogMarketplaceView(
  db: SupabaseClient,
  filters: MarketOfferListFilters,
  searchText?: string,
): Promise<CatalogMarketplaceViewResult> {
  const base = await listCore(db, filters, searchText);
  const catalogProductViews = resolveCatalogProductViewsFromOffers(base.offers);
  return { ...base, catalogProductViews };
}

export async function getMarketOffers(
  db: SupabaseClient,
  filters: MarketOfferListFilters,
): Promise<MarketOfferListResult> {
  return listCore(db, filters, undefined);
}

export async function searchMarketOffers(
  db: SupabaseClient,
  query: string,
  filters: MarketOfferListFilters,
): Promise<MarketOfferListResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return getMarketOffers(db, filters);
  }
  return listCore(db, filters, trimmed);
}

export async function getOfferById(db: SupabaseClient, id: string, tenantId?: string): Promise<MarketOfferDTO | null> {
  const row = await fetchMarketOfferDiscoveryDetail(db, id, tenantId);
  if (!row) {
    return null;
  }
  const [dto] = await mapDiscoveryRowsToOfferDTOs(db, [row]);
  return dto ?? null;
}

export async function getMarketplaceStats(db: SupabaseClient, tenantId?: string): Promise<MarketplaceStatsDTO> {
  let q = db
    .from("store_products")
    .select("id, products!inner(state)", { count: "exact", head: true })
    .eq("state", "active")
    .eq("products.state", "active");

  if (tenantId) {
    q = q.eq("tenant_id", tenantId);
  }

  const { count, error } = await q;

  if (error) {
    return { totalActiveOffers: 0 };
  }

  return { totalActiveOffers: count ?? 0 };
}
