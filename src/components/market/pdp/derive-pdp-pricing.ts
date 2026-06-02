import type { ProductMarketOfferVM, ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";
import { rankProductOffersV1 } from "@/modules/market/utils/rank-product-offers-v1";

export const PDP_UNAVAILABLE_MESSAGE =
  "Το προϊόν δεν είναι διαθέσιμο ακόμα σε κανένα κατάστημα";

/** Merged buyable + OOS offers, sorted price ASC (defensive; VM arrays are already ranked). */
export function derivePdpShopRows(product: ProductMarketViewModel): ProductMarketOfferVM[] {
  return rankProductOffersV1([...product.buyableOffers, ...product.outOfStockOffers]);
}

export function showPdpPrimaryPrice(product: ProductMarketViewModel): boolean {
  return product.buyableOffers.length > 0 && product.primaryOffer !== null;
}
