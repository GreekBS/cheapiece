import type { SupabaseClient } from "@supabase/supabase-js";

import type { StoreOsWorkspaceData } from "@/components/merchant-store/os/store-os-view-types";
import { checkMerchantStoreOwnerPermission } from "@/lib/merchant/merchant-store-request-dedup";
import { buildStoreOverviewStats } from "@/lib/merchant/store-overview-stats";
import { listCatalogProductRequestsForVendor } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import {
  listVendorOffersDetailed,
  type VendorDashboardOfferRow,
} from "@/modules/offers/queries/vendor-dashboard-offers";
import type { VendorRow } from "@/modules/vendors/queries/vendor-queries";

/** Empty workspace payload — same contract/shape as loaded workspace data. */
export function createEmptyStoreOsWorkspaceData(vendorName: string): StoreOsWorkspaceData {
  const offers: VendorDashboardOfferRow[] = [];

  return {
    vendorName,
    offers,
    catalogRequests: [],
    catalogRequestsError: false,
    showEditAction: false,
    stats: buildStoreOverviewStats(offers),
  };
}

/** Workspace list/overview payload for home, offers, and products routes. */
export async function loadStoreOsWorkspaceData(
  supabase: SupabaseClient,
  vendor: VendorRow,
  userId: string,
  pathname: string | null,
): Promise<StoreOsWorkspaceData> {
  const [offers, catalogRequestsResult, showEditAction] = await Promise.all([
    listVendorOffersDetailed(supabase, vendor.id),
    listCatalogProductRequestsForVendor(supabase, vendor.id),
    checkMerchantStoreOwnerPermission(vendor.id, userId, {
      caller: "store-os-workspace-data",
      pathname,
    }),
  ]);

  return {
    vendorName: vendor.name,
    offers,
    catalogRequests: catalogRequestsResult.data,
    catalogRequestsError: catalogRequestsResult.error,
    catalogRequestsErrorMessage: catalogRequestsResult.errorMessage,
    showEditAction,
    stats: buildStoreOverviewStats(offers),
  };
}
