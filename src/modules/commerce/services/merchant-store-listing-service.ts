import type { SupabaseClient } from "@supabase/supabase-js";

import { listStoreProductsForVendorIds } from "@/modules/offers/queries/store-product-queries";
import type { StoreProductListRow } from "@/modules/offers/types/store-product";
import { listAccessibleVendorIds, listVendorsOwnedByUser } from "@/modules/vendors/queries/vendor-queries";

import type { StoreListingCondition, StoreListingUiState } from "../types/store-listing";

export type { StoreListingCondition, StoreListingUiState };

/**
 * Legacy listings read helpers. Merchant writes to `store_products` use OfferForm only
 * (`createOffer` / `updateOffer` in offer-mutation-service). Phase 4 D2 removed `upsertMerchantStoreListing`.
 */

/**
 * Owned vendor for `store_products` (RLS). Not the navigation primary-store resolver —
 * use `pickPrimaryAccessibleVendor` / `resolveMerchantDestination` for routing defaults.
 */
export async function resolvePrimaryOwnedVendorId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const vendors = await listVendorsOwnedByUser(supabase);
  const owned = vendors.find((v) => v.owner_user_id === userId);
  return owned?.id ?? null;
}

export async function listMerchantStoreListings(
  supabase: SupabaseClient,
  vendorIds: string[],
): Promise<StoreProductListRow[]> {
  return listStoreProductsForVendorIds(supabase, vendorIds);
}

export async function listMerchantStoreListingsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoreProductListRow[]> {
  const vendorIds = await listAccessibleVendorIds(supabase, userId);
  return listMerchantStoreListings(supabase, vendorIds);
}
