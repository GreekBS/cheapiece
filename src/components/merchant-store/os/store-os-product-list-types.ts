import { resolveLinkedOfferForCatalogRequest } from "@/lib/merchant/resolve-linked-offer-for-catalog-request";
import { isCatalogRequestVisibleToMerchant } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import type { VendorDashboardOfferRow } from "@/modules/offers/queries/vendor-dashboard-offers";

/**
 * Store OS Products — UI list types for catalog product requests.
 *
 * `StoreOsProduct` rows are derived from `catalog_product_requests` (server snapshot).
 * See STORE_OS_PRODUCTS_GUARDRAILS.md in this folder.
 */

/** Tab keys mirror catalog request status buckets in the UI. */
export type StoreOsProductTab = "active" | "pending" | "inactive";

export type StoreOsProductStatus = StoreOsProductTab;

export type StoreOsProductStatusTransition =
  | { from: "pending"; to: "active" }
  | { from: "active"; to: "inactive" }
  | { from: "inactive"; to: "active" };

export const FUTURE_ADMIN_STATUS_TRANSITIONS: readonly StoreOsProductStatusTransition[] = [
  { from: "pending", to: "active" },
  { from: "active", to: "inactive" },
  { from: "inactive", to: "active" },
] as const;

export type StoreOsProductAttribute = { id: string; key: string; value: string };

export type StoreOsProduct = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  currency: string | null;
  stock: number | null;
  category: string;
  categoryId: string | null;
  brand: string | null;
  model: string | null;
  slugSuggestion: string;
  gtin: string | null;
  mpn: string | null;
  requestedAt: string;
  updatedAt: string;
  requestStatus: CatalogProductRequestRow["status"];
  adminNote: string | null;
  rejectionReason: string | null;
  attributes: StoreOsProductAttribute[];
  status: StoreOsProductStatus;
  /** Live store_products.state when a linked offer exists; otherwise null. */
  offerState: string | null;
};

export const PRODUCT_TAB_LABELS: Record<StoreOsProductTab, string> = {
  active: "Ενεργά προϊόντα",
  pending: "Σε αναμονή",
  inactive: "Μη ενεργά",
};

export const PRODUCT_STATUS_LABELS: Record<StoreOsProductStatus, string> = {
  active: "Ενεργό",
  pending: "Σε αναμονή",
  inactive: "Μη ενεργό",
};

export const OFFER_STATE_LABELS: Record<string, string> = {
  draft: "Πρόχειρο",
  active: "Ενεργή προσφορά",
  paused: "Σε παύση",
  archived: "Αρχειοθετημένο",
};

export const CATALOG_REJECTION_LABEL = "Απορρίφθηκε";

const VALID_STATUSES: ReadonlySet<StoreOsProductStatus> = new Set(["active", "pending", "inactive"]);

export function validateProductStatus(product: Pick<StoreOsProduct, "status">): StoreOsProductStatus {
  const raw = product.status;
  if (typeof raw === "string" && VALID_STATUSES.has(raw as StoreOsProductStatus)) {
    return raw as StoreOsProductStatus;
  }
  return "pending";
}

export function sanitizeProduct(product: StoreOsProduct): StoreOsProduct {
  return {
    id: product.id?.trim() || product.id,
    title: product.title?.trim() || "Χωρίς τίτλο",
    description: product.description ?? "",
    price: product.price ?? null,
    currency: product.currency ?? null,
    stock: product.stock ?? null,
    category: product.category ?? "",
    categoryId: product.categoryId ?? null,
    brand: product.brand ?? null,
    model: product.model ?? null,
    slugSuggestion: product.slugSuggestion ?? "",
    gtin: product.gtin ?? null,
    mpn: product.mpn ?? null,
    requestedAt: product.requestedAt ?? "",
    updatedAt: product.updatedAt ?? "",
    requestStatus: product.requestStatus,
    adminNote: product.adminNote ?? null,
    rejectionReason: product.rejectionReason ?? null,
    attributes: Array.isArray(product.attributes) ? product.attributes.map((a) => ({ ...a })) : [],
    status: validateProductStatus(product),
    offerState: product.offerState ?? null,
  };
}

function toAttributeList(
  payload: CatalogProductRequestRow["attribute_payload"],
): StoreOsProductAttribute[] {
  const values = payload?.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return [];
  }

  return Object.entries(values).map(([key, value], idx) => ({
    id: `${key}-${idx}`,
    key,
    value:
      value == null
        ? "—"
        : typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
            ? String(value)
            : JSON.stringify(value),
  }));
}

/** Composite tab bucket: catalog approval + live offer state. */
export function resolveStoreOsProductTab(
  product: Pick<StoreOsProduct, "requestStatus" | "offerState">,
): StoreOsProductTab {
  if (product.requestStatus === "pending") return "pending";
  if (product.requestStatus === "rejected") return "inactive";

  const offerState = (product.offerState ?? "").toLowerCase();
  if (offerState === "active") return "active";
  if (offerState === "paused" || offerState === "draft") return "inactive";

  return "active";
}

export function canDeactivateOffer(product: StoreOsProduct): boolean {
  return product.requestStatus === "approved" && product.offerState === "active";
}

export function canActivateOffer(product: StoreOsProduct): boolean {
  return product.requestStatus === "approved" && product.offerState === "paused";
}

/** Owner-only merchant delete — available on all visible product rows. */
export function canRemoveMerchantProduct(_product: StoreOsProduct): boolean {
  return true;
}

function applyProductTabBucket(product: StoreOsProduct): StoreOsProduct {
  return sanitizeProduct({
    ...product,
    status: resolveStoreOsProductTab(product),
  });
}

export function mapCatalogRequestToStoreOsProduct(request: CatalogProductRequestRow): StoreOsProduct {
  return sanitizeProduct({
    id: request.id,
    title: request.title,
    description: request.model?.trim() ?? "",
    price: request.requested_price_amount ?? null,
    currency: request.requested_price_currency ?? null,
    stock: request.requested_stock_quantity ?? null,
    category: request.brand?.trim() ?? "",
    categoryId: request.category_id ?? null,
    brand: request.brand ?? null,
    model: request.model ?? null,
    slugSuggestion: request.slug_suggestion,
    gtin: request.gtin ?? null,
    mpn: request.mpn ?? null,
    requestedAt: request.created_at,
    updatedAt: request.updated_at,
    requestStatus: request.status,
    adminNote: request.admin_note ?? null,
    rejectionReason: request.rejection_reason ?? null,
    attributes: toAttributeList(request.attribute_payload),
    status: "pending",
    offerState: null,
  });
}

/** @deprecated Use resolveStoreOsProductTab after offer overlay. */
export function mapCatalogRequestStatus(
  status: CatalogProductRequestRow["status"],
): StoreOsProductStatus {
  if (status === "approved") return "active";
  if (status === "rejected") return "inactive";
  return "pending";
}

function parseOfferPrice(amount: string | number | null | undefined): number | null {
  if (amount == null) return null;
  const parsed = typeof amount === "number" ? amount : Number(String(amount));
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function overlayLiveOfferCommerce(
  product: StoreOsProduct,
  offer: VendorDashboardOfferRow,
): StoreOsProduct {
  return sanitizeProduct({
    ...product,
    price: parseOfferPrice(offer.price_amount),
    stock: offer.stock_quantity ?? null,
    offerState: offer.state,
  });
}

export type BuildProductsFromCatalogRequestsOptions = {
  offers: VendorDashboardOfferRow[];
  vendorId: string;
};

/** Builds Products tab list from catalog requests, overlaying live offer commerce when linked. */
export function buildProductsFromCatalogRequests(
  requests: CatalogProductRequestRow[],
  options?: BuildProductsFromCatalogRequestsOptions,
): StoreOsProduct[] {
  return requests
    .filter(isCatalogRequestVisibleToMerchant)
    .map((request) => {
      const product = mapCatalogRequestToStoreOsProduct(request);
      if (!options) {
        return applyProductTabBucket(product);
      }

      const liveOffer = resolveLinkedOfferForCatalogRequest(request, options.offers, options.vendorId);
      if (!liveOffer) {
        return applyProductTabBucket(product);
      }

      return applyProductTabBucket(overlayLiveOfferCommerce(product, liveOffer));
    });
}

export function filterProductsByTab(products: StoreOsProduct[], tab: StoreOsProductTab): StoreOsProduct[] {
  return products.filter((p) => resolveStoreOsProductTab(p) === tab);
}

export function countProductsByTab(products: StoreOsProduct[]): Record<StoreOsProductTab, number> {
  return {
    active: products.filter((p) => resolveStoreOsProductTab(p) === "active").length,
    pending: products.filter((p) => resolveStoreOsProductTab(p) === "pending").length,
    inactive: products.filter((p) => resolveStoreOsProductTab(p) === "inactive").length,
  };
}
