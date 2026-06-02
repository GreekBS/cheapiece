import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductMarketStatsRow = {
  tenant_id: string;
  product_id: string;
  active_offer_count: number;
  buyable_offer_count: number;
  min_buyable_price: number | null;
  max_buyable_price: number | null;
  best_offer_id: string | null;
  best_offer_price: number | null;
  currency: string;
  stats_version: number;
  computed_at: string;
};

export async function fetchProductMarketStats(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
): Promise<ProductMarketStatsRow | null> {
  const { data, error } = await supabase
    .from("product_market_stats")
    .select(
      "tenant_id, product_id, active_offer_count, buyable_offer_count, min_buyable_price, max_buyable_price, best_offer_id, best_offer_price, currency, stats_version, computed_at",
    )
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ProductMarketStatsRow;
}

/** Sync recompute when stats row missing but product may have offers (e.g. worker lag). */
export async function recomputeProductMarketStatsRpc(
  supabase: SupabaseClient,
  productId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("recompute_product_market_stats", {
    p_product_id: productId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
