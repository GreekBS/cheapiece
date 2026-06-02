import type { SupabaseClient } from "@supabase/supabase-js";

/** Dashboard listing: offers + catalog fields (RLS-scoped). */
const dashboardSelect = `
  id,
  vendor_id,
  product_id,
  source_catalog_request_id,
  state,
  price_amount,
  stock_quantity,
  condition,
  listing_variant_key,
  updated_at,
  products ( title, slug, brand, model )
`;

export type VendorDashboardOfferRow = {
  id: string;
  vendor_id: string;
  product_id: string;
  source_catalog_request_id: string | null;
  state: string;
  price_amount: string | number;
  stock_quantity: number | null;
  condition: string | null;
  listing_variant_key?: string;
  updated_at: string | null;
  products: {
    title: string;
    slug: string;
    brand: string | null;
    model: string | null;
  } | null;
};

export async function listVendorOffersDetailed(
  supabase: SupabaseClient,
  vendorId: string,
): Promise<VendorDashboardOfferRow[]> {
  const { data, error } = await supabase
    .from("store_products")
    .select(dashboardSelect)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return data as unknown as VendorDashboardOfferRow[];
}
