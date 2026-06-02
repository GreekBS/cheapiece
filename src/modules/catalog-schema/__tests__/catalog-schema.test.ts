import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  coerceFieldValue,
  resolveEffectiveSchema,
  InheritanceResolutionError,
  validatePayload,
  publishSchema,
  PublishedSchemaMutationError,
  assertMutableDraft,
  buildCatalogMatchIndex,
  findMatchCandidates,
  productFromNormalized,
  tupleKeyFromFields,
  runCatalogPipeline,
  createPilotAttributeRegistry,
  createPilotSchemaDocumentMap,
  getPilotSchemaSeed,
  AttributeRegistry,
} from "../index";
import type { CategorySchemaDocument } from "../types/category-schema-document";
import type { CatalogPayload } from "../types/payload";

const registry = createPilotAttributeRegistry();
const documents = createPilotSchemaDocumentMap();
const mobileSeed = getPilotSchemaSeed("cat.mobile")!;
const mobileDoc = mobileSeed.document;

describe("coercion", () => {
  it("rejects invalid enum code", () => {
    const def = registry.require("apparel.gender");
    const result = coerceFieldValue("enum_single", def, "invalid");
    assert.equal(result.ok, false);
  });

  it("coerces integer", () => {
    const def = registry.require("mobile.ram_gb");
    const result = coerceFieldValue("integer", def, "8");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, 8);
  });
});

describe("inheritance", () => {
  it("merges parent fields with child overrides", () => {
    const parent: CategorySchemaDocument = {
      ...mobileDoc,
      categoryId: "cat.base",
      id: "schema.base.v1",
      fields: mobileDoc.fields.slice(0, 3),
    };
    const child: CategorySchemaDocument = {
      ...mobileDoc,
      categoryId: "cat.child",
      id: "schema.child.v1",
      inheritsFromCategoryId: "cat.base",
      fields: [
        {
          attributeCode: "mobile.ram_gb",
          requiredLevel: "optional",
          groupCode: "specifications",
          sortOrder: 100,
          filterable: true,
          searchable: false,
          comparable: true,
          variantAxis: false,
          merchantVisible: true,
        },
      ],
    };
    const map = new Map([
      ["cat.base", parent],
      ["cat.child", child],
    ]);
    const effective = resolveEffectiveSchema(child, map, registry);
    const ram = effective.fields.find((f) => f.attributeCode === "mobile.ram_gb");
    assert.equal(ram?.requiredLevel, "optional");
    assert.ok(effective.fields.some((f) => f.attributeCode === "core.title"));
  });

  it("rejects circular inheritance", () => {
    const a: CategorySchemaDocument = {
      ...mobileDoc,
      categoryId: "cat.a",
      inheritsFromCategoryId: "cat.b",
      fields: [],
    };
    const b: CategorySchemaDocument = {
      ...mobileDoc,
      categoryId: "cat.b",
      inheritsFromCategoryId: "cat.a",
      fields: [],
    };
    assert.throws(
      () => resolveEffectiveSchema(a, new Map([
        ["cat.a", a],
        ["cat.b", b],
      ]), registry),
      InheritanceResolutionError,
    );
  });
});

describe("validation required levels", () => {
  it("requires core.title for merchant", () => {
    const doc = documents.get("cat.mobile")!;
    const effective = resolveEffectiveSchema(doc, documents, registry);
    const payload: CatalogPayload = {
      schemaVersionId: doc.id,
      categoryId: "cat.mobile",
      values: { "core.brand": "Samsung", "core.model": "A54" },
    };
    const result = validatePayload(effective, payload, { role: "merchant", locale: "el" });
    assert.equal(result.ok, false);
    assert.ok(result.fieldErrors.some((e) => e.code === "core.title"));
  });
});

describe("publish lifecycle", () => {
  it("blocks mutation of published schema", () => {
    assert.throws(() => assertMutableDraft(mobileDoc), PublishedSchemaMutationError);
  });

  it("publishes draft schema", () => {
    const draft = { ...mobileDoc, state: "draft" as const, publishedAt: null };
    const out = publishSchema(draft, "2026-05-13T00:00:00.000Z");
    assert.equal(out.state, "published");
    assert.ok(out.publishedAt);
  });
});

describe("matching tier order", () => {
  it("prefers T2 brand+model over T4 weighted", () => {
    const seed = mobileSeed;
    const values = {
      "core.title": "Phone",
      "core.brand": "Samsung",
      "core.model": "A54",
      "mobile.ram_gb": 8,
      "mobile.storage_gb": 128,
    };
    const tupleKey = tupleKeyFromFields(values, seed.matching.tupleFields);
    const p1 = productFromNormalized("p-tuple", "cat.mobile", values, {
      brand: "samsung",
      model: "a54",
      tupleKey,
    });
    const otherValues = { ...values, "mobile.ram_gb": 6 };
    const p2 = productFromNormalized("p-other", "cat.mobile", otherValues, {
      brand: "lg",
      model: "g8",
      tupleKey: tupleKeyFromFields(otherValues, seed.matching.tupleFields),
    });
    const index = buildCatalogMatchIndex([p1, p2], seed.matching);
    const matches = findMatchCandidates(
      index,
      seed.matching,
      values,
      { brand: "samsung", model: "a54", tupleKey },
      "cat.mobile",
    );
    assert.equal(matches.candidates[0]?.productId, "p-tuple");
    assert.equal(matches.candidates[0]?.tier, "T2");
  });
});

describe("runCatalogPipeline", () => {
  it("runs mobile pilot end-to-end", () => {
    const seed = mobileSeed;
    const result = runCatalogPipeline({
      categoryId: "cat.mobile",
      payload: {
        schemaVersionId: seed.document.id,
        categoryId: "cat.mobile",
        values: {
          "core.title": "Samsung Galaxy A54",
          "core.brand": "Samsung",
          "core.model": "A54",
          "mobile.ram_gb": 8,
          "mobile.storage_gb": 128,
          "mobile.screen_size": 6.4,
          "core.color": { code: "black" },
        },
      },
      role: "merchant",
      registry,
      documents,
      schemaSeed: seed,
    });
    assert.equal(result.ok, true);
    assert.ok(result.descriptor);
    assert.equal(result.descriptor?.categoryId, "cat.mobile");
    assert.ok(result.snapshot?.values["mobile.ram_gb"]);
  });

  it("runs apparel pilot with enums", () => {
    const seed = getPilotSchemaSeed("cat.apparel")!;
    const result = runCatalogPipeline({
      categoryId: "cat.apparel",
      payload: {
        schemaVersionId: seed.document.id,
        categoryId: "cat.apparel",
        values: {
          "core.title": "Μπλούζα βαμβακερή",
          "apparel.gender": "unisex",
          "apparel.size": "m",
          "core.color": { code: "navy" },
          "apparel.material": ["cotton", "polyester"],
        },
      },
      role: "merchant",
      registry,
      documents,
      schemaSeed: seed,
    });
    assert.equal(result.ok, true);
    assert.equal(result.descriptor?.fields.find((f) => f.code === "apparel.size")?.enumOptions?.length, 5);
  });
});

describe("attribute registry", () => {
  it("rejects duplicate registration", () => {
    const r = new AttributeRegistry();
    const def = registry.require("core.title");
    r.register(def);
    assert.throws(() => r.register(def));
  });
});
