import { redirect } from "next/navigation";

import type { StoreOsActiveView } from "@/components/merchant-store/os/store-os-view-types";
import type { StoreOsProductTab } from "@/components/merchant-store/os/store-os-product-list-types";
import {
  merchantStoreHomePath,
  merchantStoreOffersPath,
  merchantStoreProductsPath,
  merchantStoreProductsPendingPath,
  merchantStoreSettingsPath,
} from "@/lib/merchant/merchant-store-paths";
import { parseStoreOsSearchParams } from "@/lib/merchant/parse-store-os-search-params";

export type LegacyStoreOsSearchParams = {
  [key: string]: string | string[] | undefined;
};

export function legacyStoreOsSearchParamsToUrlSearchParams(
  searchParams: LegacyStoreOsSearchParams,
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") sp.set(key, value);
    else if (Array.isArray(value) && value[0]) sp.set(key, value[0]);
  }
  return sp;
}

function hasExplicitViewQueryParam(searchParams: LegacyStoreOsSearchParams): boolean {
  const raw = searchParams.view;
  if (typeof raw === "string") return raw.trim().length > 0;
  if (Array.isArray(raw)) return Boolean(raw[0]?.trim());
  return false;
}

function redirectToCanonicalStoreOsView(
  vendorId: string,
  view: StoreOsActiveView,
  productTab: StoreOsProductTab | null,
): never {
  switch (view) {
    case "products":
      if (productTab === "pending") {
        redirect(merchantStoreProductsPendingPath(vendorId));
      }
      redirect(merchantStoreProductsPath(vendorId));
    case "offers":
      redirect(merchantStoreOffersPath(vendorId));
    case "settings":
      redirect(merchantStoreSettingsPath(vendorId));
    case "overview":
    default:
      redirect(merchantStoreHomePath(vendorId));
  }
}

/**
 * Phase 4 A1: legacy `?view=` → canonical Store OS path (server redirect).
 * No-op when `view` query param is absent. Preserves `?tab=pending` on products redirects.
 */
export function redirectLegacyStoreOsViewIfPresent(
  vendorId: string,
  searchParams: LegacyStoreOsSearchParams,
): void {
  if (!hasExplicitViewQueryParam(searchParams)) {
    return;
  }

  const parsed = parseStoreOsSearchParams(legacyStoreOsSearchParamsToUrlSearchParams(searchParams));
  if (!parsed.view) {
    return;
  }

  redirectToCanonicalStoreOsView(vendorId, parsed.view, parsed.productTab);
}
