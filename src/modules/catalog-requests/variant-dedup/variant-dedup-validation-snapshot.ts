import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import { computeEffectiveApprovalSignatureInput } from "./compute-effective-approval-signature-input";
import {
  computeCanonicalVariantSignature,
  computeMerchantVariantSignature,
  isSparseVariantMetadata,
} from "./variant-signatures";
import type { CatalogApprovalRecommendation } from "./types";

export type VariantDedupValidationRisk =
  | "sparse_metadata"
  | "pending_sibling_exists"
  | "tenant_catalog_match"
  | "link_mismatch_risk";

export type VariantDedupValidationReport = {
  requestId: string;
  vendorId: string;
  tenantId: string;
  canonicalVariantSignatureHash: string;
  merchantVariantSignatureHash: string;
  recommendation: CatalogApprovalRecommendation;
  detectedRisks: VariantDedupValidationRisk[];
  linkMatchStatus: string | null;
  simulatedAt: string;
  flags: {
    sparseMetadata: boolean;
    pendingSiblingCount: number;
    tenantCatalogStrictMatch: boolean;
    candidateProductId: string | null;
  };
};

export function detectValidationRisksFromSnapshot(input: {
  sparseMetadata: boolean;
  pendingSiblingRequestIds: string[];
  tenantCatalogStrictMatchProductId: string | null;
  recommendationMode: CatalogApprovalRecommendation["mode"];
  linkMatchStatus: string | null;
  candidateProductId: string | null;
}): VariantDedupValidationRisk[] {
  const risks: VariantDedupValidationRisk[] = [];

  if (input.sparseMetadata) {
    risks.push("sparse_metadata");
  }
  if (input.pendingSiblingRequestIds.length > 0) {
    risks.push("pending_sibling_exists");
  }
  if (input.tenantCatalogStrictMatchProductId) {
    risks.push("tenant_catalog_match");
  }
  if (input.linkMatchStatus === "mismatch") {
    risks.push("link_mismatch_risk");
  }

  return risks;
}

/** Sync report builder from an in-memory request row (tests / dry-run). */
export function buildVariantDedupValidationReportFromRequest(
  request: CatalogProductRequestRow,
  recommendation: CatalogApprovalRecommendation,
  linkMatchStatus: string | null = null,
): VariantDedupValidationReport {
  const effectiveInput = computeEffectiveApprovalSignatureInput(request);
  const sparseMetadata = isSparseVariantMetadata(effectiveInput);

  const detectedRisks = detectValidationRisksFromSnapshot({
    sparseMetadata,
    pendingSiblingRequestIds: recommendation.pendingSiblingRequestIds,
    tenantCatalogStrictMatchProductId: recommendation.tenantCatalogStrictMatchProductId,
    recommendationMode: recommendation.mode,
    linkMatchStatus,
    candidateProductId: recommendation.candidateProductId,
  });

  return {
    requestId: request.id,
    vendorId: request.vendor_id,
    tenantId: request.tenant_id,
    canonicalVariantSignatureHash: computeCanonicalVariantSignature(effectiveInput),
    merchantVariantSignatureHash: computeMerchantVariantSignature({
      ...effectiveInput,
      vendor_id: request.vendor_id,
      title: request.title,
      slug_suggestion: request.slug_suggestion,
    }),
    recommendation,
    detectedRisks,
    linkMatchStatus,
    simulatedAt: new Date().toISOString(),
    flags: {
      sparseMetadata,
      pendingSiblingCount: recommendation.pendingSiblingRequestIds.length,
      tenantCatalogStrictMatch: Boolean(recommendation.tenantCatalogStrictMatchProductId),
      candidateProductId: recommendation.candidateProductId,
    },
  };
}
