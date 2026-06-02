import type { MarketOfferDTO } from "../types/market-offer.dto";

export type RankableProductOffer = {
  id: string;
  price: number;
  stock: number;
  updatedAt: string | null;
};

/**
 * Marketplace V1 ranking (P1): price ASC → stock DESC → updated_at DESC → id ASC.
 */
export function rankProductOffersV1<T extends RankableProductOffer>(offers: T[]): T[] {
  return [...offers].sort(compareProductOffersV1);
}

export function compareProductOffersV1(a: RankableProductOffer, b: RankableProductOffer): number {
  if (a.price !== b.price) {
    return a.price - b.price;
  }
  if (b.stock !== a.stock) {
    return b.stock - a.stock;
  }
  const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
  const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
  if (ta !== tb) {
    return tb - ta;
  }
  return a.id.localeCompare(b.id);
}

export function pickBestProductOfferV1<T extends RankableProductOffer>(offers: T[]): T | null {
  const ranked = rankProductOffersV1(offers);
  return ranked[0] ?? null;
}

export function splitActiveOffersByStock(offers: MarketOfferDTO[]): {
  buyableOffers: MarketOfferDTO[];
  outOfStockOffers: MarketOfferDTO[];
} {
  const buyableOffers: MarketOfferDTO[] = [];
  const outOfStockOffers: MarketOfferDTO[] = [];

  for (const offer of offers) {
    if (offer.stock > 0) {
      buyableOffers.push(offer);
    } else {
      outOfStockOffers.push(offer);
    }
  }

  return {
    buyableOffers: rankProductOffersV1(buyableOffers),
    outOfStockOffers: rankProductOffersV1(outOfStockOffers),
  };
}
