import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import { mapAggregateToPublicProductMarketVM } from "../ui/mappers/map-aggregate-to-market-vm";
import { mergeProductAggregate } from "../application/merge-product-aggregate";

const product = {
  id: "p1",
  tenantId: "t1",
  title: "Phone",
  brand: "Acme",
  model: "X",
  slug: "phone",
  categoryId: "c1",
  state: "active",
};

const offer = (id: string, stock: number): MarketOfferDTO => ({
  id,
  productId: "p1",
  title: "Phone",
  slug: "phone",
  productBrand: "Acme",
  productModel: "X",
  price: 10,
  currency: "EUR",
  condition: "new",
  stock,
  vendorName: "V",
  updatedAt: null,
});

describe("mapAggregateToPublicProductMarketVM", () => {
  it("sets offerless flags when aggregate has no offers and stats is null", () => {
    const aggregate = mergeProductAggregate({ product, publication: null, offers: [] });
    const vm = mapAggregateToPublicProductMarketVM(aggregate, null);

    assert.equal(vm.isOfferless, true);
    assert.equal(vm.hasActiveOffers, false);
    assert.equal(vm.hasBuyableOffers, false);
    assert.equal(vm.hasStatsSnapshot, false);
    assert.equal(vm.activeOfferCount, 0);
    assert.equal(vm.statsVersion, 0);
    assert.equal(vm.computedAt, null);
  });

  it("uses stats counts when snapshot present", () => {
    const aggregate = mergeProductAggregate({ product, publication: null, offers: [offer("o1", 5)] });
    const vm = mapAggregateToPublicProductMarketVM(aggregate, {
      active_offer_count: 3,
      buyable_offer_count: 2,
      stats_version: 7,
      computed_at: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(vm.hasActiveOffers, true);
    assert.equal(vm.isOfferless, false);
    assert.equal(vm.hasStatsSnapshot, true);
    assert.equal(vm.activeOfferCount, 3);
    assert.equal(vm.buyableOfferCount, 2);
    assert.equal(vm.statsVersion, 7);
    assert.equal(vm.computedAt, "2026-01-01T00:00:00.000Z");
    assert.equal(vm.buyableOffers.length, 1);
  });
});
