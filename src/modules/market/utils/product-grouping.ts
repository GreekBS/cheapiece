import type { MarketOfferDTO } from "../types/market-offer.dto";
import type { ProductAggregateDTO } from "../types/product-aggregate.dto";
import { rankMarketOffers } from "./ranking";
import { pickBestOffer } from "./best-offer";

function dtoToRankable(d: MarketOfferDTO) {
  return {
    id: d.id,
    state: "active",
    price_amount: d.price,
    stock_quantity: d.stock,
    updated_at: d.updatedAt,
  };
}

/** Group offers by catalog `products.id`. */
export function groupOffersByProduct(offers: MarketOfferDTO[]): Map<string, MarketOfferDTO[]> {
  const map = new Map<string, MarketOfferDTO[]>();
  for (const o of offers) {
    const pid = o.productId;
    const list = map.get(pid) ?? [];
    list.push(o);
    map.set(pid, list);
  }
  return map;
}

function sortGroupByRanking(offers: MarketOfferDTO[]): MarketOfferDTO[] {
  const rankables = offers.map((d) => dtoToRankable(d));
  const sorted = rankMarketOffers(rankables);
  const byId = new Map(offers.map((x) => [x.id, x]));
  return sorted.map((r) => byId.get(r.id!)).filter((x): x is MarketOfferDTO => x != null);
}

function buildOneAggregate(sortedOffers: MarketOfferDTO[]): ProductAggregateDTO | null {
  if (sortedOffers.length === 0) {
    return null;
  }
  const first = sortedOffers[0]!;
  const prices = sortedOffers.map((o) => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const best = pickBestOffer(sortedOffers) ?? first;
  const currency = best.currency;
  const availableStockTotal = sortedOffers.reduce((sum, o) => sum + (Number.isFinite(o.stock) ? o.stock : 0), 0);

  return {
    productId: first.productId,
    productTitle: first.title,
    productBrand: first.productBrand,
    productModel: first.productModel,
    offers: sortedOffers,
    bestOffer: best,
    priceRange: { minPrice, maxPrice, currency },
    totalOffers: sortedOffers.length,
    availableStockTotal,
  };
}

/** Build product cards from a flat offer feed (server-side). */
export function buildProductAggregates(offers: MarketOfferDTO[]): ProductAggregateDTO[] {
  const groups = groupOffersByProduct(offers);
  const out: ProductAggregateDTO[] = [];
  for (const group of groups.values()) {
    const sorted = sortGroupByRanking(group);
    const agg = buildOneAggregate(sorted);
    if (agg) {
      out.push(agg);
    }
  }
  /* Stable product card order: best (lowest) price first, then title */
  out.sort((a, b) => {
    if (a.bestOffer.price !== b.bestOffer.price) {
      return a.bestOffer.price - b.bestOffer.price;
    }
    return a.productTitle.localeCompare(b.productTitle);
  });
  return out;
}
