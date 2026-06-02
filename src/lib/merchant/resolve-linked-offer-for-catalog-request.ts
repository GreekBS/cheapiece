import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import type { VendorDashboardOfferRow } from "@/modules/offers/queries/vendor-dashboard-offers";

/**
 * Client-side mirror of resolveCommercialOfferTargetForRequest lookup order:
 * 1) source_catalog_request_id
 * 2) resolved_product_id + default listing (new, empty variant key, non-archived)
 */
export function resolveLinkedOfferForCatalogRequest(
  request: CatalogProductRequestRow,
  offers: VendorDashboardOfferRow[],
  vendorId: string,
): VendorDashboardOfferRow | null {
  const bySource = offers.find(
    (offer) => offer.vendor_id === vendorId && offer.source_catalog_request_id === request.id,
  );
  if (bySource) {
    return bySource;
  }

  if (!request.resolved_product_id) {
    return null;
  }

  const matches = offers.filter(
    (offer) =>
      offer.vendor_id === vendorId &&
      offer.product_id === request.resolved_product_id &&
      (offer.condition ?? "new") === "new" &&
      (offer.listing_variant_key ?? "") === "" &&
      offer.state !== "archived",
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0] ?? null;
}
