import type { StoreOsActiveView } from "@/components/merchant-store/os/store-os-view-types";
import type { StoreOsProductTab } from "@/components/merchant-store/os/store-os-product-list-types";

const STORE_VIEWS: ReadonlySet<StoreOsActiveView> = new Set(["overview", "offers", "products", "settings"]);
const PRODUCT_TABS: ReadonlySet<StoreOsProductTab> = new Set(["active", "pending", "inactive"]);

export type ParsedStoreOsSearchParams = {
  /**
   * DEPRECATED — Phase 4 A4: not used by Store OS client island (pathname-only).
   * Still populated when `view` is present for server redirect helper (A1) only.
   */
  view: StoreOsActiveView | null;
  productTab: StoreOsProductTab | null;
};

/** Parses `?tab=pending` for products module. `view` is read only for legacy redirect (A1), not client routing. */
export function parseStoreOsSearchParams(searchParams: URLSearchParams): ParsedStoreOsSearchParams {
  const tabRaw = searchParams.get("tab");
  const viewRaw = searchParams.get("view");

  let productTab: StoreOsProductTab | null = null;
  if (tabRaw && PRODUCT_TABS.has(tabRaw as StoreOsProductTab)) {
    productTab = tabRaw as StoreOsProductTab;
  }

  let view: StoreOsActiveView | null = null;
  if (viewRaw && STORE_VIEWS.has(viewRaw as StoreOsActiveView)) {
    view = viewRaw as StoreOsActiveView;
  }

  return { view, productTab };
}
