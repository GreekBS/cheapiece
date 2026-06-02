import type { StoreOverviewStats } from "@/lib/merchant/store-overview-stats";
import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import type { VendorDashboardOfferRow } from "@/modules/offers/queries/vendor-dashboard-offers";

export type StoreOsActiveView = "overview" | "offers" | "products" | "settings";

export type StoreOsWorkspaceData = {
  vendorName: string;
  offers: VendorDashboardOfferRow[];
  catalogRequests: CatalogProductRequestRow[];
  catalogRequestsError: boolean;
  catalogRequestsErrorMessage?: string;
  showEditAction: boolean;
  stats: StoreOverviewStats;
};
