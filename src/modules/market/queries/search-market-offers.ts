import type { SupabaseClient } from "@supabase/supabase-js";

import { withMarketTiming } from "@/lib/observability/timing";

import type { MarketOfferListFilters } from "../types/market-offer.dto";

/** Single select for discovery + search (RLS-enforced like listMarketOffers). */
const DISCOVERY_SELECT = `
  id,
  vendor_id,
  product_id,
  state,
  price_amount,
  currency,
  stock_quantity,
  condition,
  listing_variant_key,
  updated_at,
  products!inner ( title, slug, state, brand, model )
`;

export type MarketDiscoveryRow = {
  id: string;
  vendor_id: string;
  product_id: string;
  state: string;
  price_amount: string | number;
  currency: string | null;
  stock_quantity: number | null;
  condition: string | null;
  listing_variant_key?: string;
  updated_at: string | null;
  products: {
    title: string;
    slug: string;
    state: string;
    brand: string | null;
    model: string | null;
  } | null;
};

function escapeIlikeToken(raw: string): string {
  /* Commas would break PostgREST `or=(...)` segments */
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ").trim();
}

/**
 * Fetches marketplace offers with optional text match on product title, slug, brand, model.
 * No description column exists on `products` in the current schema — those fields cover “search surface”.
 */
export async function fetchMarketDiscoveryOffers(
  supabase: SupabaseClient,
  filters: MarketOfferListFilters,
  options?: { searchText?: string },
): Promise<{ rows: MarketDiscoveryRow[]; count: number | null }> {
  return withMarketTiming("offers_list", async () => {
    const state = filters.state ?? "active";
    const limit = Math.min(Math.max(filters.limit ?? 24, 1), 48);
    const offset = Math.max(filters.offset ?? 0, 0);

    let q = supabase
      .from("store_products")
      .select(DISCOVERY_SELECT, { count: "exact" })
      .eq("state", state)
      .eq("products.state", "active");

    if (filters.tenantId) {
      q = q.eq("tenant_id", filters.tenantId);
    }

    if (filters.priceMin !== undefined && Number.isFinite(filters.priceMin)) {
      q = q.gte("price_amount", filters.priceMin);
    }
    if (filters.priceMax !== undefined && Number.isFinite(filters.priceMax)) {
      q = q.lte("price_amount", filters.priceMax);
    }
    if (filters.condition) {
      q = q.eq("condition", filters.condition);
    }
    if (filters.productId) {
      q = q.eq("product_id", filters.productId);
    }

    const term = options?.searchText?.trim() ?? "";
    if (term.length > 0) {
      const safe = escapeIlikeToken(term);
      const pattern = `%${safe}%`;
      q = q.or(
        `title.ilike.${pattern},slug.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern}`,
        { foreignTable: "products" },
      );
    }

    const { data, error, count } = await q
      .order("price_amount", { ascending: true })
      .order("stock_quantity", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return { rows: [], count: null };
    }

    return { rows: data as unknown as MarketDiscoveryRow[], count: count ?? null };
  });
}

export async function fetchMarketOfferDiscoveryDetail(
  supabase: SupabaseClient,
  offerId: string,
  tenantId?: string,
): Promise<MarketDiscoveryRow | null> {
  let q = supabase
    .from("store_products")
    .select(DISCOVERY_SELECT)
    .eq("id", offerId)
    .eq("state", "active")
    .eq("products.state", "active");

  if (tenantId) {
    q = q.eq("tenant_id", tenantId);
  }

  const { data, error } = await q.maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as unknown as MarketDiscoveryRow;
}
