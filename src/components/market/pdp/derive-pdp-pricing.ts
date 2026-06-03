import type { ProductMarketOfferVM, ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";
import { rankProductOffersV1 } from "@/modules/market/utils/rank-product-offers-v1";

export const PDP_UNAVAILABLE_MESSAGE =
  "Το προϊόν δεν είναι διαθέσιμο ακόμα σε κανένα κατάστημα";

export const PDP_HERO_PRICE_STACK_MAX = 5;

/** Merged buyable + OOS offers, sorted price ASC (defensive; VM arrays are already ranked). */
export function derivePdpShopRows(product: ProductMarketViewModel): ProductMarketOfferVM[] {
  return rankProductOffersV1([...product.buyableOffers, ...product.outOfStockOffers]);
}

export function showPdpPrimaryPrice(product: ProductMarketViewModel): boolean {
  return product.buyableOffers.length > 0 && product.primaryOffer !== null;
}

export function offerVendorKey(offer: Pick<ProductMarketOfferVM, "vendorId" | "vendorName">): string {
  return offer.vendorId || offer.vendorName;
}

export function countUniqueOfferVendors(offers: ProductMarketOfferVM[]): number {
  return new Set(offers.map(offerVendorKey)).size;
}

/** Hero stack: up to 5 cheapest offers; remaining hidden store count for "+X ακόμη". */
export function derivePdpHeroPriceStack(offers: ProductMarketOfferVM[]): {
  visibleOffers: ProductMarketOfferVM[];
  remainingStoreCount: number;
} {
  const visibleOffers = offers.slice(0, PDP_HERO_PRICE_STACK_MAX);
  const allVendorKeys = new Set(offers.map(offerVendorKey));
  const visibleVendorKeys = new Set(visibleOffers.map(offerVendorKey));
  const remainingStoreCount = Math.max(0, allVendorKeys.size - visibleVendorKeys.size);

  return { visibleOffers, remainingStoreCount };
}
