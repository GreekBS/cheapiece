import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import {
  detectValidationRisksFromSnapshot,
  buildVariantDedupValidationReportFromRequest,
} from "../variant-dedup-validation-snapshot";
import {
  filterCreateBlockReasonsForFlags,
  createDisabledVariantDedupRecommendation,
} from "../variant-dedup-shadow-log";
import {
  getVariantDedupFlags,
  resetVariantDedupFlagsCacheForTests,
  shouldEnforcePendingSiblingBlock,
  shouldEnforceStrictLinkValidation,
} from "../variant-dedup-flags";
import {
  computeCanonicalVariantSignature,
  isSparseVariantMetadata,
  canonicalSignaturesMatch,
} from "../variant-signatures";
import type { CatalogApprovalRecommendation } from "../types";

const VENDOR_ID = "22222222-2222-2222-2222-222222222222";
const TENANT_ID = "33333333-3333-3333-3333-333333333333";
const CATEGORY_ID = "66666666-6666-6666-6666-666666666666";
const UPDATED_AT = "2026-05-28T10:00:00.000Z";

function baseRow(overrides: Partial<CatalogProductRequestRow> = {}): CatalogProductRequestRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    tenant_id: TENANT_ID,
    vendor_id: VENDOR_ID,
    submitted_by_user_id: "44444444-4444-4444-4444-444444444444",
    category_id: CATEGORY_ID,
    schema_version_id: null,
    attribute_payload: {
      values: { color: "black", storage: "128gb" },
      meta: { schemaVersionId: null, validatedAt: UPDATED_AT, validationMode: "LEGACY_SAFE" },
    },
    title: "Test Phone",
    brand: "Acme",
    model: "X100",
    slug_suggestion: "test-phone",
    gtin: "1234567890123",
    mpn: "MPN-1",
    status: "pending",
    rejection_reason: null,
    admin_note: null,
    resolved_product_id: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    requested_price_amount: null,
    requested_stock_quantity: null,
    requested_price_currency: null,
    merchant_hidden_at: null,
    merchant_hidden_by_user_id: null,
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

function signatureInputFromRow(row: CatalogProductRequestRow) {
  return {
    category_id: row.category_id,
    brand: row.brand,
    model: row.model,
    gtin: row.gtin,
    mpn: row.mpn,
    attribute_payload: row.attribute_payload,
  };
}

function baseRecommendation(
  overrides: Partial<CatalogApprovalRecommendation> = {},
): CatalogApprovalRecommendation {
  return {
    mode: "review",
    candidateProductId: null,
    reasons: [],
    canonicalVariantSignatureHash: "abc",
    merchantVariantSignatureHash: "def",
    pendingSiblingRequestIds: [],
    tenantCatalogStrictMatchProductId: null,
    weakCatalogHintProductIds: [],
    ...overrides,
  };
}

describe("variant dedup regression safety", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    resetVariantDedupFlagsCacheForTests();
    delete process.env.VARIANT_DEDUP_ENABLED;
    delete process.env.VARIANT_STRICT_LINK_VALIDATION;
    delete process.env.VARIANT_PENDING_SIBLING_BLOCK;
    delete process.env.VARIANT_DEDUP_SHADOW_MODE;
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
    resetVariantDedupFlagsCacheForTests();
  });

  it("identical variant inputs produce identical canonical signatures (link path)", () => {
    const row = baseRow();
    const a = computeCanonicalVariantSignature(signatureInputFromRow(row));
    const b = computeCanonicalVariantSignature(signatureInputFromRow(row));
    assert.equal(a, b);
    assert.ok(canonicalSignaturesMatch(a, b));
  });

  it("valid variant difference (color/storage) produces different signatures", () => {
    const black = baseRow({
      attribute_payload: {
        values: { color: "black", storage: "128gb" },
        meta: { schemaVersionId: null, validatedAt: UPDATED_AT, validationMode: "LEGACY_SAFE" },
      },
    });
    const blue = baseRow({
      attribute_payload: {
        values: { color: "blue", storage: "256gb" },
        meta: { schemaVersionId: null, validatedAt: UPDATED_AT, validationMode: "LEGACY_SAFE" },
      },
    });
    const hashBlack = computeCanonicalVariantSignature(signatureInputFromRow(black));
    const hashBlue = computeCanonicalVariantSignature(signatureInputFromRow(blue));
    assert.notEqual(hashBlack, hashBlue);
  });

  it("sparse metadata is detected and forces review-only recommendation shape", () => {
    const sparseRow = baseRow({
      gtin: null,
      mpn: null,
      attribute_payload: {
        values: {},
        meta: { schemaVersionId: null, validatedAt: UPDATED_AT, validationMode: "LEGACY_SAFE" },
      },
    });
    assert.equal(isSparseVariantMetadata(signatureInputFromRow(sparseRow)), true);

    const report = buildVariantDedupValidationReportFromRequest(
      sparseRow,
      baseRecommendation({ mode: "review", reasons: ["sparse_variant_metadata"] }),
    );
    assert.ok(report.detectedRisks.includes("sparse_metadata"));
    assert.equal(report.recommendation.mode, "review");
  });

  it("pending sibling risk is surfaced in validation report", () => {
    const siblingId = "99999999-9999-9999-9999-999999999999";
    const report = buildVariantDedupValidationReportFromRequest(
      baseRow(),
      baseRecommendation({
        mode: "review",
        reasons: ["pending_sibling_same_variant"],
        pendingSiblingRequestIds: [siblingId],
      }),
    );
    assert.ok(report.detectedRisks.includes("pending_sibling_exists"));
    assert.equal(report.flags.pendingSiblingCount, 1);
  });

  it("pending sibling block is enforced when flag is on (default)", () => {
    const flags = getVariantDedupFlags();
    assert.equal(flags.variantPendingSiblingBlock, true);
    assert.equal(shouldEnforcePendingSiblingBlock(), true);

    const filtered = filterCreateBlockReasonsForFlags(["pending_sibling", "link_recommended"]);
    assert.deepEqual(filtered, ["pending_sibling", "link_recommended"]);
  });

  it("pending sibling block can be disabled via feature flag", () => {
    process.env.VARIANT_PENDING_SIBLING_BLOCK = "false";
    resetVariantDedupFlagsCacheForTests();
    assert.equal(shouldEnforcePendingSiblingBlock(), false);

    const filtered = filterCreateBlockReasonsForFlags(["pending_sibling", "tenant_catalog_match"]);
    assert.deepEqual(filtered, ["tenant_catalog_match"]);
  });

  it("link mismatch risk is detected in validation snapshot", () => {
    const risks = detectValidationRisksFromSnapshot({
      sparseMetadata: false,
      pendingSiblingRequestIds: [],
      tenantCatalogStrictMatchProductId: null,
      recommendationMode: "link",
      linkMatchStatus: "mismatch",
      candidateProductId: "55555555-5555-5555-5555-555555555555",
    });
    assert.ok(risks.includes("link_mismatch_risk"));
  });

  it("strict link validation defaults to enabled", () => {
    const flags = getVariantDedupFlags();
    assert.equal(flags.variantStrictLinkValidation, true);
    assert.equal(shouldEnforceStrictLinkValidation(), true);
  });

  it("dedup disabled returns passthrough create recommendation", () => {
    process.env.VARIANT_DEDUP_ENABLED = "false";
    resetVariantDedupFlagsCacheForTests();
    const rec = createDisabledVariantDedupRecommendation(baseRow());
    assert.equal(rec.mode, "create");
    assert.equal(rec.reasons.length, 0);
    assert.ok(rec.canonicalVariantSignatureHash.length > 0);
  });

  it("tenant catalog match risk appears in validation report", () => {
    const productId = "55555555-5555-5555-5555-555555555555";
    const report = buildVariantDedupValidationReportFromRequest(
      baseRow(),
      baseRecommendation({
        mode: "link",
        tenantCatalogStrictMatchProductId: productId,
        reasons: ["tenant_catalog_same_variant"],
      }),
    );
    assert.ok(report.detectedRisks.includes("tenant_catalog_match"));
    assert.equal(report.flags.tenantCatalogStrictMatch, true);
  });
});
