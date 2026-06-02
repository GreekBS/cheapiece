import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { SchemaDescriptor } from "@/modules/catalog-schema/types/schema-descriptor";

import { buildProductDisplaySnapshot } from "../application/build-product-display-snapshot";
import { buildProductFacetSnapshot } from "../application/build-product-facet-snapshot";

const descriptor: SchemaDescriptor = {
  schemaVersionId: "00000000-0000-4000-8000-000000000001",
  categoryId: "cat.test",
  categoryPath: "test",
  version: 1,
  locale: "el",
  groups: [{ code: "specs", label: "Specs", sortOrder: 0 }],
  fields: [
    {
      code: "mobile.ram_gb",
      primitive: "integer",
      groupCode: "specs",
      label: "RAM",
      requiredLevel: "optional",
      sortOrder: 0,
      filterable: true,
      searchable: false,
      comparable: true,
      variantAxis: false,
      merchantVisible: true,
      unit: "GB",
    },
    {
      code: "apparel.gender",
      primitive: "enum_single",
      groupCode: "specs",
      label: "Gender",
      requiredLevel: "optional",
      sortOrder: 1,
      enumOptions: [
        { code: "men", label: "Men" },
        { code: "women", label: "Women" },
      ],
      filterable: true,
      searchable: false,
      comparable: false,
      variantAxis: false,
      merchantVisible: true,
    },
  ],
  matching: { identifierFields: [], tupleFields: [], weightedFields: [] },
  denormalize: {},
};

describe("buildProductDisplaySnapshot", () => {
  it("formats STRICT fields from descriptor", () => {
    const snapshot = buildProductDisplaySnapshot({
      validationMode: "STRICT",
      locale: "el",
      scalars: { title: "Phone", brand: "Acme", model: "X", gtin: null, mpn: null },
      values: { "mobile.ram_gb": 8, "apparel.gender": "men" },
      descriptor,
    });

    assert.equal(snapshot.groups.length, 1);
    assert.equal(snapshot.groups[0].fields.length, 2);
    assert.equal(snapshot.groups[0].fields[0].formattedValue, "8 GB");
    assert.equal(snapshot.groups[0].fields[1].formattedValue, "Men");
  });

  it("returns no groups for NO_SCHEMA_MINIMAL", () => {
    const snapshot = buildProductDisplaySnapshot({
      validationMode: "NO_SCHEMA_MINIMAL",
      locale: "el",
      scalars: { title: "T", brand: null, model: null, gtin: null, mpn: null },
      values: { foo: "bar" },
      descriptor: null,
    });
    assert.equal(snapshot.groups.length, 0);
  });
});

describe("buildProductFacetSnapshot", () => {
  it("emits filterable facets only", () => {
    const facets = buildProductFacetSnapshot({
      descriptor,
      values: { "mobile.ram_gb": 8, "apparel.gender": "women" },
    });
    assert.equal(facets.length, 2);
    assert.equal(facets[0].value, 8);
    assert.equal(facets[1].value, "women");
    assert.equal(facets[1].displayValue, "Women");
  });
});
