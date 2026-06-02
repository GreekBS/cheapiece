import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import { pickBestProductOfferV1 } from "@/modules/market/utils/rank-product-offers-v1";



/**

 * Primary marketplace offer for a product card / PDP header (buyable offers only).

 */

export function pickPrimaryOffer(buyableOffers: MarketOfferDTO[]): MarketOfferDTO | null {

  return pickBestProductOfferV1(buyableOffers);

}


