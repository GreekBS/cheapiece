import type { SupabaseClient } from "@supabase/supabase-js";

import type { MarketDiscoveryRow } from "@/modules/market/queries/search-market-offers";

/**
 * Batch active offers for listing — read-layer query (does not modify market/ module).
 * Products without offers return empty slice; listing still includes the product.
 */
const LISTING_OFFER_SELECT = `
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

export async function fetchActiveOffersForProductIds(
  supabase: SupabaseClient,
  productIds: string[],
  tenantId?: string,
): Promise<MarketDiscoveryRow[]> {
  if (productIds.length === 0) {
    return [];
  }

  let q = supabase
    .from("store_products")
    .select(LISTING_OFFER_SELECT)
    .eq("state", "active")
    .eq("products.state", "active")
    .in("product_id", productIds);

  if (tenantId) {
    q = q.eq("tenant_id", tenantId);
  }

  const { data, error } = await q
    .order("price_amount", { ascending: true })
    .order("stock_quantity", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as unknown as MarketDiscoveryRow[];
}

export function groupOffersByProductId(
  rows: MarketDiscoveryRow[],
): Map<string, MarketDiscoveryRow[]> {
  const map = new Map<string, MarketDiscoveryRow[]>();
  for (const row of rows) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}
