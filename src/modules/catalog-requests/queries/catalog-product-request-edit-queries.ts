import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import { updateStoreProduct } from "@/modules/offers/queries/store-product-queries";

import { fetchCatalogProductRequestById } from "./catalog-product-request-queries";

export type CommercialOfferTarget = {
  offerId: string;
  vendorId: string;
  state: string;
};

export async function fetchCatalogRequestBaselineForEdit(
  supabase: SupabaseClient,
  requestId: string,
): Promise<CatalogProductRequestRow | null> {
  const res = await fetchCatalogProductRequestById(supabase, requestId);
  if (res.error || !res.data) return null;
  return res.data;
}

export async function resolveCommercialOfferTargetForRequest(
  supabase: SupabaseClient,
  args: { requestId: string; vendorId: string; resolvedProductId: string | null },
): Promise<CommercialOfferTarget | null> {
  const bySource = await supabase
    .from("store_products")
    .select("id, vendor_id, state")
    .eq("source_catalog_request_id", args.requestId)
    .eq("vendor_id", args.vendorId)
    .limit(1)
    .maybeSingle();

  if (!bySource.error && bySource.data) {
    return {
      offerId: (bySource.data as { id: string }).id,
      vendorId: (bySource.data as { vendor_id: string }).vendor_id,
      state: (bySource.data as { state: string }).state,
    };
  }

  if (!args.resolvedProductId) return null;

  const byProduct = await supabase
    .from("store_products")
    .select("id, vendor_id, state")
    .eq("vendor_id", args.vendorId)
    .eq("product_id", args.resolvedProductId)
    .eq("condition", "new")
    .eq("listing_variant_key", "")
    .neq("state", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byProduct.error || !byProduct.data) {
    return null;
  }

  return {
    offerId: (byProduct.data as { id: string }).id,
    vendorId: (byProduct.data as { vendor_id: string }).vendor_id,
    state: (byProduct.data as { state: string }).state,
  };
}

export async function applyMinorCommercialEdit(
  supabase: SupabaseClient,
  args: {
    offerId: string;
    vendorId: string;
    state: string;
    priceAmount: number;
    stockQuantity: number;
    updatedByUserId: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const patch = await updateStoreProduct(supabase, {
    offerId: args.offerId,
    vendorId: args.vendorId,
    priceAmount: args.priceAmount,
    stockQuantity: args.stockQuantity,
    state: args.state,
    updatedByUserId: args.updatedByUserId,
  });

  if (patch.error) {
    return { ok: false, message: patch.error.message };
  }
  return { ok: true };
}
