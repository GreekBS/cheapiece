import { formatMoney } from "@/lib/format-money";
import {
  pickVendorDisplayProfile,
  type VendorDisplayProfile,
} from "@/modules/market/services/vendor-display-resolver";

import { UNAVAILABLE_CART_LINE_TITLE } from "../constants";
import type { CartOfferSnapshot } from "../queries/fetch-offers-for-cart-validation";
import type { CartRow } from "../queries/fetch-cart-rows-for-user";
import type { CartLineViewModel } from "../types/cart-line.vm";

function resolveUnavailabilityReason(
  offer: CartOfferSnapshot | undefined,
  quantity: number,
  tenantId: string,
): string | undefined {
  if (!offer) {
    return "Η προσφορά δεν είναι πλέον διαθέσιμη.";
  }
  if (offer.tenantId !== tenantId) {
    return "Η προσφορά δεν είναι πλέον διαθέσιμη.";
  }
  if (offer.state !== "active" || offer.productState !== "active") {
    return "Η προσφορά δεν είναι πλέον διαθέσιμη.";
  }
  if (quantity > offer.stockQuantity) {
    return "Δεν υπάρχει επαρκές απόθεμα.";
  }
  if (offer.stockQuantity <= 0) {
    return "Δεν υπάρχει επαρκές απόθεμα.";
  }
  return undefined;
}

function isCartLineAvailable(
  offer: CartOfferSnapshot | undefined,
  quantity: number,
  tenantId: string,
): boolean {
  if (!offer) {
    return false;
  }
  if (offer.tenantId !== tenantId) {
    return false;
  }
  if (offer.state !== "active" || offer.productState !== "active") {
    return false;
  }
  if (offer.stockQuantity <= 0 || quantity > offer.stockQuantity) {
    return false;
  }
  return true;
}

export function mapCartLineViewModel(params: {
  row: CartRow;
  offer: CartOfferSnapshot | undefined;
  tenantId: string;
  imageUrl: string | null;
  vendor: VendorDisplayProfile;
}): CartLineViewModel {
  const { row, offer, tenantId, imageUrl, vendor } = params;
  const unitPrice = offer?.priceAmount ?? 0;
  const currency = offer?.currency ?? "EUR";
  const lineTotal = unitPrice * row.quantity;
  const available = isCartLineAvailable(offer, row.quantity, tenantId);
  const unavailabilityReason = available
    ? undefined
    : resolveUnavailabilityReason(offer, row.quantity, tenantId);

  return {
    offerId: row.offerId,
    productId: offer?.productId ?? "",
    quantity: row.quantity,
    title: offer?.productTitle ?? UNAVAILABLE_CART_LINE_TITLE,
    vendorName: vendor.name,
    vendorLogoUrl: vendor.logoUrl,
    imageUrl,
    unitPrice,
    currency,
    unitPriceLabel: formatMoney(unitPrice, currency),
    lineTotalLabel: formatMoney(lineTotal, currency),
    stock: offer?.stockQuantity ?? 0,
    isAvailable: available,
    unavailabilityReason,
    productHref: offer?.productId ? `/products/${offer.productId}` : "#",
    addedAt: row.createdAt,
  };
}

export function pickVendorForOffer(
  offer: CartOfferSnapshot | undefined,
  vendorMap: Map<string, VendorDisplayProfile>,
): VendorDisplayProfile {
  if (!offer) {
    return pickVendorDisplayProfile("", vendorMap);
  }
  return pickVendorDisplayProfile(offer.vendorId, vendorMap);
}
