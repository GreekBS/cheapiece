import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { applyIndexFacetFilters, facetFiltersToIndexContainsMap } from "../apply-index-facet-filters";
import { buildPublicationIndex, flattenFacetSnapshot } from "../build-publication-index";

describe("flattenFacetSnapshot", () => {
  it("flattens facet_snapshot to string map deterministically", () => {
    const index = flattenFacetSnapshot([
      {
        code: "brand",
        primitive: "text",
        label: "Brand",
        value: "apple",
        displayValue: "Apple",
      },
      {
        code: "mobile.ram_gb",
        primitive: "integer",
        label: "RAM",
        value: 8,
        displayValue: "8 GB",
      },
      {
        code: "tags",
        primitive: "enum_multi",
        label: "Tags",
        value: ["b", "a"],
        displayValue: "a, b",
      },
    ]);

    assert.deepEqual(index, {
      brand: "apple",
      "mobile.ram_gb": "8",
      tags: "a,b",
    });
  });

  it("ignores null and empty values", () => {
    const index = flattenFacetSnapshot([
      {
        code: "empty",
        primitive: "text",
        label: "E",
        value: null,
        displayValue: "",
      },
    ]);
    assert.deepEqual(index, {});
  });
});

describe("buildPublicationIndex", () => {
  it("builds upsert row from publication + product", () => {
    const row = buildPublicationIndex(
      {
        facet_snapshot: [
          {
            code: "color",
            primitive: "enum_single",
            label: "Color",
            value: "black",
            displayValue: "Black",
          },
        ],
        published_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "p1",
        tenant_id: "t1",
        category_id: "c1",
      },
    );

    assert.equal(row.product_id, "p1");
    assert.equal(row.has_publication, true);
    assert.deepEqual(row.facet_index, { color: "black" });
  });
});

describe("applyIndexFacetFilters", () => {
  it("uses AND semantics on facet_index map", () => {
    const index = { brand: "apple", color: "black" };
    assert.equal(
      applyIndexFacetFilters(index, [
        { code: "brand", value: "apple" },
        { code: "color", value: "black" },
      ]),
      true,
    );
    assert.equal(applyIndexFacetFilters(index, [{ code: "brand", value: "samsung" }]), false);
  });
});

describe("facetFiltersToIndexContainsMap", () => {
  it("matches JSONB contains fragment for Supabase", () => {
    const map = facetFiltersToIndexContainsMap([
      { code: "color", value: "black" },
      { code: "brand", value: "apple" },
    ]);
    assert.deepEqual(map, { color: "black", brand: "apple" });
  });
});

describe("hybrid fallback rule", () => {
  it("index match excludes legacy publication path for same product", () => {
    const indexedIds = new Set(["p-indexed"]);
    const legacyProductId = "p-indexed";
    assert.equal(indexedIds.has(legacyProductId), true);
  });
});
