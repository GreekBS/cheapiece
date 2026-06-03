import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";
import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

import { mergeProductAggregate } from "../application/merge-product-aggregate";
import { pickPrimaryOffer } from "../application/pick-primary-offer";
import { facetSnapshotMatchesFilters } from "../application/facet-filter-rules";

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

const offer = (id: string, price: number, stock: number): MarketOfferDTO => ({
  id,
  productId: "p1",
  title: "Phone",
  slug: "phone",
  productBrand: "Acme",
  productModel: "X",
  price,
  currency: "EUR",
  condition: "new",
  stock,
  vendorId: "v1",
  vendorName: "V",
  vendorLogoUrl: null,
  updatedAt: null,
});

const publicationRow: ProductCatalogPublicationRow = {
  product_id: "p1",
  tenant_id: "t1",
  source_request_id: "r1",
  schema_version_id: "00000000-0000-4000-8000-000000000001",
  validation_mode: "STRICT",
  locale: "el",
  attribute_values: { "mobile.ram_gb": 8 },
  display_snapshot: {
    locale: "el",
    validationMode: "STRICT",
    scalars: { title: "Phone", brand: "Acme", model: "X", gtin: null, mpn: null },
    groups: [
      {
        code: "specs",
        label: "Specs",
        sortOrder: 0,
        fields: [
          {
            code: "mobile.ram_gb",
            label: "RAM",
            primitive: "integer",
            formattedValue: "8 GB",
            rawValue: 8,
          },
        ],
      },
    ],
  },
  facet_snapshot: [
    {
      code: "mobile.ram_gb",
      primitive: "integer",
      label: "RAM",
      value: 8,
      displayValue: "8 GB",
    },
  ],
  published_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("mergeProductAggregate", () => {
  it("merges product without publication or offers", () => {
    const agg = mergeProductAggregate({ product, publication: null, offers: [] });
    assert.equal(agg.hasPublication, false);
    assert.equal(agg.isSchemaDriven, false);
    assert.equal(agg.publication, null);
    assert.equal(agg.primaryOffer, null);
    assert.equal(agg.offers.length, 0);
  });

  it("sets isSchemaDriven from display groups only", () => {
    const agg = mergeProductAggregate({
      product,
      publication: publicationRow,
      offers: [offer("o1", 10, 1)],
    });
    assert.equal(agg.hasPublication, true);
    assert.equal(agg.isSchemaDriven, true);
    assert.equal(agg.publication?.displaySnapshot.groups.length, 1);
    assert.equal(
      (agg.publication?.displaySnapshot as { validationMode?: string }).validationMode,
      undefined,
    );
  });
});

describe("pickPrimaryOffer", () => {
  it("prefers in-stock offer by price", () => {
    const primary = pickPrimaryOffer([
      offer("cheap-oos", 5, 0),
      offer("expensive-stock", 20, 3),
      offer("cheap-stock", 10, 2),
    ]);
    assert.equal(primary?.id, "cheap-stock");
  });

  it("returns null when no offers", () => {
    assert.equal(pickPrimaryOffer([]), null);
  });
});

describe("facetSnapshotMatchesFilters", () => {
  it("matches publication facet_snapshot only", () => {
    const facets = publicationRow.facet_snapshot;
    assert.equal(
      facetSnapshotMatchesFilters(facets, [{ code: "mobile.ram_gb", value: 8 }]),
      true,
    );
    assert.equal(
      facetSnapshotMatchesFilters(facets, [{ code: "mobile.ram_gb", value: 16 }]),
      false,
    );
  });
});
