import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { pickBestProductOfferV1, rankProductOffersV1, splitActiveOffersByStock } from "../utils/rank-product-offers-v1";
import type { MarketOfferDTO } from "../types/market-offer.dto";

function offer(id: string, price: number, stock: number, updatedAt: string | null = null): MarketOfferDTO {
  return {
    id,
    productId: "p1",
    title: "T",
    slug: "t",
    productBrand: null,
    productModel: null,
    price,
    currency: "EUR",
    condition: "new",
    stock,
    vendorName: "V",
    updatedAt,
  };
}

describe("rankProductOffersV1", () => {
  it("sorts price ASC then stock DESC then updated_at DESC then id", () => {
    const ranked = rankProductOffersV1([
      offer("b", 20, 1, "2026-01-01T00:00:00Z"),
      offer("a", 10, 5, "2026-01-02T00:00:00Z"),
      offer("c", 10, 2, "2026-01-03T00:00:00Z"),
    ]);
    assert.deepEqual(ranked.map((o) => o.id), ["a", "c", "b"]);
  });

  it("pickBestProductOfferV1 returns first ranked buyable row", () => {
    const best = pickBestProductOfferV1([offer("x", 15, 0), offer("y", 10, 3)]);
    assert.equal(best?.id, "y");
  });

  it("splitActiveOffersByStock separates and ranks each list", () => {
    const { buyableOffers, outOfStockOffers } = splitActiveOffersByStock([
      offer("oos", 5, 0),
      offer("buy", 10, 2),
    ]);
    assert.equal(buyableOffers.length, 1);
    assert.equal(buyableOffers[0]?.id, "buy");
    assert.equal(outOfStockOffers.length, 1);
    assert.equal(outOfStockOffers[0]?.id, "oos");
  });
});
