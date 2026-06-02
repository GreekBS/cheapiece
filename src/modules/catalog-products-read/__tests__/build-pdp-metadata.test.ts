import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildPdpMetadata } from "../ui/server/build-pdp-metadata";
import type { ProductMarketViewModel } from "../ui/dto/product-market.vm";

function baseVm(overrides: Partial<ProductMarketViewModel>): ProductMarketViewModel {
  return {
    productId: "p1",
    tenantId: "t1",
    title: "Test Phone",
    brand: null,
    model: null,
    slug: "test-phone",
    categoryId: null,
    hasPublication: false,
    isSchemaDriven: false,
    locale: null,
    scalars: null,
    specGroups: [],
    buyableOffers: [],
    outOfStockOffers: [],
    primaryOffer: null,
    activeOfferCount: 0,
    buyableOfferCount: 0,
    statsVersion: 0,
    computedAt: null,
    hasActiveOffers: false,
    hasBuyableOffers: false,
    isOfferless: true,
    hasStatsSnapshot: false,
    primaryImageUrl: null,
    galleryImages: [],
    ...overrides,
  };
}

function robotsFlags(meta: ReturnType<typeof buildPdpMetadata>) {
  const robots = meta.robots;
  assert.ok(robots && typeof robots === "object");
  return robots as { index?: boolean; follow?: boolean };
}

describe("buildPdpMetadata", () => {
  it("indexes listed PDPs with buyable offers", () => {
    const meta = buildPdpMetadata(
      baseVm({ hasBuyableOffers: true, hasActiveOffers: true, isOfferless: false }),
    );
    assert.equal(robotsFlags(meta).index, true);
    assert.match(String(meta.title), /compare prices/i);
  });

  it("noindexes thin offerless PDPs", () => {
    const meta = buildPdpMetadata(baseVm({ isOfferless: true, hasPublication: false }));
    assert.equal(robotsFlags(meta).index, false);
    assert.equal(robotsFlags(meta).follow, true);
  });

  it("indexes content-rich offerless PDPs", () => {
    const meta = buildPdpMetadata(
      baseVm({
        isOfferless: true,
        hasPublication: true,
        specGroups: [{ code: "g", label: "G", sortOrder: 0, fields: [] }],
      }),
    );
    assert.equal(robotsFlags(meta).index, true);
    assert.match(String(meta.title), /product details/i);
  });
});
