import type { MarketOfferDTO } from "../types/market-offer.dto";

/**
 * Best offer for comparison UX: lowest price, then higher stock, then fresher updated_at.
 * (Aligned with marketplace ranking; active-only offers are expected upstream.)
 */
export function pickBestOffer(offers: MarketOfferDTO[]): MarketOfferDTO | null {
  if (offers.length === 0) {
    return null;
  }
  return [...offers].sort(compareOffersForBest)[0] ?? null;
}

/** Display order for PDP / compare tables (same ordering rules). */
export function sortOffersForProductPage(offers: MarketOfferDTO[]): MarketOfferDTO[] {
  return [...offers].sort(compareOffersForBest);
}

function compareOffersForBest(a: MarketOfferDTO, b: MarketOfferDTO): number {
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
