/** Deterministic merchant store URLs — all navigation under this prefix. */

export function merchantStoreBase(vendorId: string): string {

  return `/merchant/stores/${vendorId}`;

}

/** Canonical Store OS home (Phase 1 alias → `?view=overview`). */
export function merchantStoreHomePath(vendorId: string): string {
  return `${merchantStoreBase(vendorId)}/home`;
}

/** Canonical products module (Phase 1 alias → `?view=products`). */
export function merchantStoreProductsPath(vendorId: string): string {
  return `${merchantStoreBase(vendorId)}/products`;
}

/** Canonical catalog request form (Αίτηση νέου προϊόντος καταλόγου). */
export function merchantStoreProductsRequestNewPath(vendorId: string): string {
  return `${merchantStoreBase(vendorId)}/products/requests/new`;
}

/** Canonical settings module (Phase 1 alias → `?view=settings`). */
export function merchantStoreSettingsPath(vendorId: string): string {
  return `${merchantStoreBase(vendorId)}/settings`;
}

export type StoreOsRedirectTarget =
  | "home"
  | "products"
  | "offers"
  | "settings"
  | "catalog-request-new"
  | "offer-new"
  | "offer-edit";

export function buildStoreOsRedirectPath(
  vendorId: string,
  target: StoreOsRedirectTarget,
  options?: { productId?: string; offerId?: string },
): string {
  switch (target) {
    case "home":
      return merchantStoreHomePath(vendorId);
    case "products":
      return merchantStoreProductsPath(vendorId);
    case "offers":
      return merchantStoreOffersPath(vendorId);
    case "settings":
      return merchantStoreSettingsPath(vendorId);
    case "catalog-request-new":
      return merchantStoreProductsRequestNewPath(vendorId);
    case "offer-new": {
      const base = merchantStoreOffersNewPath(vendorId);
      const productId = options?.productId?.trim();
      if (!productId) return base;
      return `${base}?productId=${encodeURIComponent(productId)}`;
    }
    case "offer-edit": {
      const offerId = options?.offerId?.trim();
      if (!offerId) return merchantStoreOffersPath(vendorId);
      return merchantStoreOfferEditPath(vendorId, offerId);
    }
    default:
      return merchantStoreHomePath(vendorId);
  }
}

export function merchantStoreOffersPath(vendorId: string): string {

  return `${merchantStoreBase(vendorId)}/offers`;

}



export function merchantStoreOfferEditPath(vendorId: string, offerId: string): string {

  return `${merchantStoreBase(vendorId)}/offers/${offerId}/edit`;

}



export function merchantStoreOffersNewPath(vendorId: string): string {

  return `${merchantStoreBase(vendorId)}/offers/new`;

}



/** Legacy catalog-request URL — still routed; redirects to `merchantStoreProductsRequestNewPath`. */
export function merchantStoreCatalogRequestLegacyPath(vendorId: string): string {
  return `${merchantStoreBase(vendorId)}/catalog-requests/new`;
}

/** @deprecated Use `merchantStoreProductsRequestNewPath` — kept for call-site compatibility. */
export function merchantStoreCatalogRequestNewPath(vendorId: string): string {
  return merchantStoreProductsRequestNewPath(vendorId);
}

/** Products module with pending tab (post catalog-request submit). Legacy `?view=products&tab=pending` still works. */
export function merchantStoreProductsPendingPath(vendorId: string): string {
  return `${merchantStoreProductsPath(vendorId)}?tab=pending`;
}



/** Validates post-action redirect target: exactly `/merchant/stores/{uuid}/offers`. */

export function isMerchantStoreOffersListRedirect(path: string, vendorId: string): boolean {

  const expected = merchantStoreOffersPath(vendorId);

  return path === expected;

}



export const LEGACY_DASHBOARD_OFFERS_LIST_PATH = "/dashboard/offers";



/**

 * Allowlisted post-mutation redirect for offer forms: merchant offers list for this vendor, or legacy dashboard list.

 * Unknown values fall back to legacy list (dashboard forms without hidden field).

 */

export function resolveOffersPostActionRedirect(raw: unknown, vendorId: string): string {

  if (typeof raw !== "string") {

    return LEGACY_DASHBOARD_OFFERS_LIST_PATH;

  }

  const p = raw.trim();

  if (!p) {

    return merchantStoreOffersPath(vendorId);

  }

  if (p === LEGACY_DASHBOARD_OFFERS_LIST_PATH) {

    return merchantStoreOffersPath(vendorId);

  }

  if (isMerchantStoreOffersListRedirect(p, vendorId)) {

    return p;

  }

  return merchantStoreOffersPath(vendorId);

}

