import type { StoreOsActiveView } from "@/components/merchant-store/os/store-os-view-types";

import {
  merchantStoreBase,
  merchantStoreHomePath,
  merchantStoreOffersPath,
  merchantStoreProductsPath,
  merchantStoreSettingsPath,
} from "@/lib/merchant/merchant-store-paths";

/** Map URL path segment to Store OS view (Phase 2 URL-first; Phase 4 A4 pathname-only). */
export function viewFromStoreOsPathname(pathname: string, vendorId: string): StoreOsActiveView | null {
  if (pathname === merchantStoreHomePath(vendorId) || pathname === merchantStoreBase(vendorId)) {
    return "overview";
  }
  if (pathname === merchantStoreProductsPath(vendorId)) {
    return "products";
  }
  if (pathname === merchantStoreOffersPath(vendorId)) {
    return "offers";
  }
  if (pathname === merchantStoreSettingsPath(vendorId)) {
    return "settings";
  }
  return null;
}

export function storeOsViewToPath(vendorId: string, view: StoreOsActiveView): string {
  switch (view) {
    case "offers":
      return merchantStoreOffersPath(vendorId);
    case "products":
      return merchantStoreProductsPath(vendorId);
    case "settings":
      return merchantStoreSettingsPath(vendorId);
    case "overview":
    default:
      return merchantStoreHomePath(vendorId);
  }
}

/**
 * DEPRECATED — Phase 4 A4: `?view=` is no longer interpreted (see A1 redirect layer).
 * Active module is derived from pathname only.
 */
export function resolveActiveStoreOsView(
  pathname: string,
  vendorId: string,
  _searchParams?: URLSearchParams,
): StoreOsActiveView {
  return viewFromStoreOsPathname(pathname, vendorId) ?? "overview";
}
