import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyCatalogRequestEditDiff,
  type CatalogRequestEditPayload,
} from "../classify-catalog-request-edit-diff";
import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

const REQUEST_ID = "11111111-1111-1111-1111-111111111111";
const VENDOR_ID = "22222222-2222-2222-2222-222222222222";
const TENANT_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "44444444-4444-4444-4444-444444444444";
const PRODUCT_ID = "55555555-5555-5555-5555-555555555555";
const CATEGORY_ID = "66666666-6666-6666-6666-666666666666";
const UPDATED_AT = "2026-05-28T10:00:00.000Z";

function baseRow(overrides: Partial<CatalogProductRequestRow> = {}): CatalogProductRequestRow {
  return {
    id: REQUEST_ID,
    tenant_id: TENANT_ID,
    vendor_id: VENDOR_ID,
    submitted_by_user_id: USER_ID,
    category_id: CATEGORY_ID,
    schema_version_id: null,
    attribute_payload: {
      values: { color: "red", weight: null, ram_gb: 8 },
      meta: { schemaVersionId: null, validatedAt: UPDATED_AT, validationMode: "LEGACY_SAFE" },
    },
    title: "Test Phone",
    brand: "Acme",
    model: "X100",
    slug_suggestion: "test-phone",
    gtin: "1234567890123",
    mpn: "MPN-1",
    status: "approved",
    rejection_reason: null,
    admin_note: null,
    resolved_product_id: PRODUCT_ID,
    reviewed_by_user_id: USER_ID,
    reviewed_at: UPDATED_AT,
    requested_price_amount: 99.99,
    requested_stock_quantity: 10,
    requested_price_currency: "EUR",
    merchant_hidden_at: null,
    merchant_hidden_by_user_id: null,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

function basePayload(overrides: Partial<CatalogRequestEditPayload> = {}): CatalogRequestEditPayload {
  return {
    requestId: REQUEST_ID,
    vendorId: VENDOR_ID,
    baselineUpdatedAt: UPDATED_AT,
    title: "Test Phone",
    brand: "Acme",
    model: "X100",
    categoryId: CATEGORY_ID,
    slugSuggestion: "test-phone",
    gtin: "1234567890123",
    mpn: "MPN-1",
    description: "X100",
    price: 99.99,
    stock: 10,
    attributes: { color: "red", weight: null, ram_gb: 8 },
    ...overrides,
  };
}

/** Mirrors Store OS UI attribute round-trip before submit. */
function uiRoundTripAttributes(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value == null
        ? "—"
        : typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
            ? String(value)
            : JSON.stringify(value),
    ]),
  );
}

describe("classifyCatalogRequestEditDiff", () => {
  it("stock-only change => minor", () => {
    const row = baseRow();
    const payload = basePayload({
      stock: 25,
      attributes: uiRoundTripAttributes(row.attribute_payload?.values ?? {}),
    });
    const diff = classifyCatalogRequestEditDiff({ row, payload });
    assert.equal(diff.kind, "minor");
    assert.deepEqual(diff.changedMinor, ["stock"]);
    assert.equal(diff.changedMajor.length, 0);
  });

  it("price-only change => minor", () => {
    const row = baseRow();
    const payload = basePayload({
      price: 109.99,
      attributes: uiRoundTripAttributes(row.attribute_payload?.values ?? {}),
    });
    const diff = classifyCatalogRequestEditDiff({ row, payload });
    assert.equal(diff.kind, "minor");
    assert.deepEqual(diff.changedMinor, ["price"]);
    assert.equal(diff.changedMajor.length, 0);
  });

  it("stock+price change => minor", () => {
    const row = baseRow();
    const payload = basePayload({
      price: 109.99,
      stock: 25,
      attributes: uiRoundTripAttributes(row.attribute_payload?.values ?? {}),
    });
    const diff = classifyCatalogRequestEditDiff({ row, payload });
    assert.equal(diff.kind, "minor");
    assert.deepEqual(diff.changedMinor.sort(), ["price", "stock"]);
    assert.equal(diff.changedMajor.length, 0);
  });

  it("unchanged attributes after UI round-trip => not major", () => {
    const row = baseRow();
    const payload = basePayload({
      attributes: uiRoundTripAttributes(row.attribute_payload?.values ?? {}),
    });
    const diff = classifyCatalogRequestEditDiff({ row, payload });
    assert.equal(diff.kind, "none");
    assert.equal(diff.changedMajor.length, 0);
  });

  it("true attribute change => major", () => {
    const row = baseRow();
    const payload = basePayload({
      attributes: uiRoundTripAttributes({ ...row.attribute_payload!.values, color: "blue" }),
    });
    const diff = classifyCatalogRequestEditDiff({ row, payload });
    assert.equal(diff.kind, "major");
    assert.ok(diff.changedMajor.includes("attributes"));
  });

  it("title change => major", () => {
    const row = baseRow();
    const payload = basePayload({
      title: "Updated Phone",
      attributes: uiRoundTripAttributes(row.attribute_payload?.values ?? {}),
    });
    const diff = classifyCatalogRequestEditDiff({ row, payload });
    assert.equal(diff.kind, "major");
    assert.ok(diff.changedMajor.includes("title"));
  });
});
