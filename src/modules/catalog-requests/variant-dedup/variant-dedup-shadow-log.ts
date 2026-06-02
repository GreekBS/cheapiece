import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import { shouldEnforcePendingSiblingBlock } from "./variant-dedup-flags";
import type { CatalogApprovalRecommendationReason, CreateBlockReason } from "./types";
import {
  computeCanonicalVariantSignature,
  computeMerchantVariantSignature,
} from "./variant-signatures";

type ShadowEvent =
  | "would_block_create"
  | "would_recommend_link"
  | "would_detect_duplicate"
  | "would_block_link";

type ShadowLogPayload = {
  event: ShadowEvent;
  requestId?: string;
  vendorId?: string;
  productId?: string | null;
  blockReasons?: string[];
  recommendationMode?: string;
  existingRequestId?: string | null;
  matchStatus?: string;
};

/** Shadow-mode structured logs — observability only, never affects flow. */
export function logVariantDedupShadowEvent(payload: ShadowLogPayload): void {
  // eslint-disable-next-line no-console -- intentional shadow observability
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      domain: "catalog_variant_dedup_shadow",
      ...payload,
    }),
  );
}

/** Passthrough recommendation when variant dedup is disabled. */
export function createDisabledVariantDedupRecommendation(request: CatalogProductRequestRow) {
  const effectiveInput = {
    category_id: request.category_id,
    brand: request.brand,
    model: request.model,
    gtin: request.gtin,
    mpn: request.mpn,
    attribute_payload: request.attribute_payload,
  };

  return {
    mode: "create" as const,
    candidateProductId: null,
    reasons: [] as CatalogApprovalRecommendationReason[],
    canonicalVariantSignatureHash: computeCanonicalVariantSignature(effectiveInput),
    merchantVariantSignatureHash: computeMerchantVariantSignature({
      ...effectiveInput,
      vendor_id: request.vendor_id,
      title: request.title,
      slug_suggestion: request.slug_suggestion,
    }),
    pendingSiblingRequestIds: [] as string[],
    tenantCatalogStrictMatchProductId: null,
    weakCatalogHintProductIds: [] as string[],
  };
}

/** Apply feature-flag filters to create block reasons (additive rollback). */
export function filterCreateBlockReasonsForFlags(
  blockReasons: CreateBlockReason[],
): CreateBlockReason[] {
  if (!shouldEnforcePendingSiblingBlock()) {
    return blockReasons.filter((r) => r !== "pending_sibling");
  }
  return blockReasons;
}
