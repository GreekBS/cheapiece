import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";
import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import { applyFacetFilters } from "../apply-facet-filters";
import { facetFilterToContainsFragment } from "../facet-filter-rules";
import { mergeProductAggregatesForListing } from "../merge-listing-aggregates";

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

describe("applyFacetFilters", () => {
  it("uses AND semantics on facet_snapshot", () => {
    const facets = [
      { code: "a", primitive: "integer", label: "A", value: 1, displayValue: "1" },
      { code: "b", primitive: "enum_single", label: "B", value: "x", displayValue: "X" },
    ];
    assert.equal(applyFacetFilters(facets, [{ code: "a", value: 1 }]), true);
    assert.equal(
      applyFacetFilters(facets, [
        { code: "a", value: 1 },
        { code: "b", value: "x" },
      ]),
      true,
    );
    assert.equal(applyFacetFilters(facets, [{ code: "a", value: 2 }]), false);
  });
});

describe("facetFilterToContainsFragment", () => {
  it("builds minimal code/value objects for JSONB contains", () => {
    const frag = facetFilterToContainsFragment([{ code: "ram", value: 8 }]);
    assert.deepEqual(frag, [{ code: "ram", value: 8 }]);
  });
});

describe("mergeProductAggregatesForListing", () => {
  it("merges batch without per-product fetches", () => {
    const publication: ProductCatalogPublicationRow = {
      product_id: "p1",
      tenant_id: "t1",
      source_request_id: "r1",
      schema_version_id: null,
      validation_mode: "LEGACY_SAFE",
      locale: "el",
      attribute_values: {},
      display_snapshot: {
        locale: "el",
        validationMode: "LEGACY_SAFE",
        scalars: { title: "Phone", brand: "Acme", model: "X", gtin: null, mpn: null },
        groups: [],
      },
      facet_snapshot: [],
      published_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const offer: MarketOfferDTO = {
      id: "o1",
      productId: "p1",
      title: "Phone",
      slug: "phone",
      productBrand: "Acme",
      productModel: "X",
      price: 9,
      currency: "EUR",
      condition: "new",
      stock: 0,
      vendorId: "v1",
      vendorName: "V",
      vendorLogoUrl: null,
      updatedAt: null,
    };

    const items = mergeProductAggregatesForListing({
      products: [product],
      publicationsByProductId: new Map([["p1", publication]]),
      offersByProductId: new Map([["p1", [offer]]]),
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].hasPublication, true);
    assert.equal(items[0].primaryOffer, null);
  });
});
