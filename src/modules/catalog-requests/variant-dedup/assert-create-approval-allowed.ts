import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchCatalogRequestMatchByRequestId } from "@/modules/catalog-request-matching/queries/fetch-catalog-request-match";
import { fetchCatalogProductRequestById } from "@/modules/catalog-requests/queries/catalog-product-request-queries";

import {
  computeEffectiveApprovalSignatureInput,
  type AdminApprovalSignatureOverrides,
} from "./compute-effective-approval-signature-input";
import { findPendingSiblingSameCanonical } from "./find-pending-sibling-requests";
import { findTenantCatalogCanonicalMatches } from "./find-tenant-catalog-canonical-matches";
import { resolveCatalogApprovalRecommendation } from "./resolve-catalog-approval-recommendation";
import {
  computeCanonicalVariantSignature,
  computeWeakCanonicalVariantSignature,
  isSparseVariantMetadata,
} from "./variant-signatures";
import { logVariantDedupEvent } from "./variant-dedup-log";
import type { CatalogApprovalRecommendation, CreateBlockReason } from "./types";
import { isVariantDedupEnabled, isVariantDedupShadowMode } from "./variant-dedup-flags";
import {
  createDisabledVariantDedupRecommendation,
  filterCreateBlockReasonsForFlags,
  logVariantDedupShadowEvent,
} from "./variant-dedup-shadow-log";

export type CreateApprovalGuardResult =
  | {
      allowed: true;
      recommendation: CatalogApprovalRecommendation;
      overrideUsed: boolean;
      blockReasons: CreateBlockReason[];
    }
  | {
      allowed: false;
      code: "CREATE_BLOCKED";
      message: string;
      recommendation: CatalogApprovalRecommendation;
      blockReasons: CreateBlockReason[];
    };

const CREATE_BLOCKED_MESSAGE =
  "Η δημιουργία νέου προϊόντος απαιτεί επιβεβαίωση: υπάρχει σύσταση σύνδεσης, ταύτιση στον κατάλογο ή εκκρεμής αδελφή αίτηση.";

type SubmitTimeBlockAssessment = {
  blockReasons: CreateBlockReason[];
  recommendation: CatalogApprovalRecommendation;
};

async function assessCreateBlocksAtSubmitTime(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    adminOverrides?: AdminApprovalSignatureOverrides;
  },
): Promise<SubmitTimeBlockAssessment> {
  const fetched = await fetchCatalogProductRequestById(supabase, params.requestId);
  if (fetched.error || !fetched.data) {
    throw new Error("Request not found for create approval guard.");
  }

  const matchResult = await fetchCatalogRequestMatchByRequestId(supabase, params.requestId);
  const recommendation = await resolveCatalogApprovalRecommendation(
    supabase,
    fetched.data,
    matchResult.error ? null : matchResult.data,
  );

  const effectiveInput = computeEffectiveApprovalSignatureInput(
    fetched.data,
    params.adminOverrides,
  );
  const canonicalHash = computeCanonicalVariantSignature(effectiveInput);
  const weakHash = computeWeakCanonicalVariantSignature(effectiveInput);
  const sparse = isSparseVariantMetadata(effectiveInput);

  const blockReasons: CreateBlockReason[] = [];

  if (recommendation.mode === "link" && recommendation.candidateProductId) {
    blockReasons.push("link_recommended");
  }

  const pendingSiblings = await findPendingSiblingSameCanonical(supabase, {
    vendorId: fetched.data.vendor_id,
    excludeRequestId: params.requestId,
    canonicalHash,
  });

  if (pendingSiblings.requestIds.length > 0) {
    blockReasons.push("pending_sibling");
  }

  const tenantMatches = await findTenantCatalogCanonicalMatches(supabase, {
    tenantId: fetched.data.tenant_id,
    strictCanonicalHash: canonicalHash,
    weakCanonicalHash: weakHash,
    hints: {
      categoryId: effectiveInput.category_id,
      brand: effectiveInput.brand,
      model: effectiveInput.model,
      gtin: effectiveInput.gtin,
    },
  });

  if (tenantMatches.strictMatches.length > 0) {
    blockReasons.push("tenant_catalog_match");
  }

  if (sparse && tenantMatches.weakMatches.length > 0) {
    blockReasons.push("tenant_catalog_match");
  }

  return { blockReasons: [...new Set(blockReasons)], recommendation };
}

export async function assertCreateApprovalAllowed(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    adminUserId: string;
    overrideConfirmed: boolean;
    overrideReason?: string | null;
    adminOverrides?: AdminApprovalSignatureOverrides;
  },
): Promise<CreateApprovalGuardResult> {
  const fetched = await fetchCatalogProductRequestById(supabase, params.requestId);
  if (fetched.error || !fetched.data) {
    throw new Error("Request not found for create approval guard.");
  }

  if (!isVariantDedupEnabled()) {
    return {
      allowed: true,
      recommendation: createDisabledVariantDedupRecommendation(fetched.data),
      overrideUsed: false,
      blockReasons: [],
    };
  }

  const { blockReasons: rawBlockReasons, recommendation } = await assessCreateBlocksAtSubmitTime(
    supabase,
    {
      requestId: params.requestId,
      adminOverrides: params.adminOverrides,
    },
  );

  const blockReasons = filterCreateBlockReasonsForFlags(rawBlockReasons);

  if (blockReasons.length === 0) {
    return { allowed: true, recommendation, overrideUsed: false, blockReasons };
  }

  if (!params.overrideConfirmed) {
    if (isVariantDedupShadowMode()) {
      logVariantDedupShadowEvent({
        event: "would_block_create",
        requestId: params.requestId,
        vendorId: fetched.data.vendor_id,
        productId:
          recommendation.candidateProductId ?? recommendation.tenantCatalogStrictMatchProductId,
        blockReasons,
        recommendationMode: recommendation.mode,
      });
      return { allowed: true, recommendation, overrideUsed: false, blockReasons };
    }

    for (const blockReason of blockReasons) {
      if (blockReason === "tenant_catalog_match") {
        logVariantDedupEvent({
          event: "variant.tenant_catalog_create_blocked",
          requestId: params.requestId,
          vendorId: fetched.data.vendor_id,
          adminUserId: params.adminUserId,
          candidateProductId: recommendation.tenantCatalogStrictMatchProductId,
          canonicalVariantSignatureHash: recommendation.canonicalVariantSignatureHash,
          merchantVariantSignatureHash: recommendation.merchantVariantSignatureHash,
          actionTaken: "create_blocked_pending_override",
          blockReason,
          reasons: recommendation.reasons,
        });
      } else if (blockReason === "pending_sibling") {
        logVariantDedupEvent({
          event: "variant.pending_sibling_create_blocked",
          requestId: params.requestId,
          vendorId: fetched.data.vendor_id,
          adminUserId: params.adminUserId,
          canonicalVariantSignatureHash: recommendation.canonicalVariantSignatureHash,
          merchantVariantSignatureHash: recommendation.merchantVariantSignatureHash,
          actionTaken: "create_blocked_pending_override",
          blockReason,
          pendingSiblingRequestIds: recommendation.pendingSiblingRequestIds,
          reasons: recommendation.reasons,
        });
      } else {
        logVariantDedupEvent({
          event: "variant.canonical_duplicate_prevented",
          requestId: params.requestId,
          vendorId: fetched.data.vendor_id,
          adminUserId: params.adminUserId,
          candidateProductId: recommendation.candidateProductId,
          canonicalVariantSignatureHash: recommendation.canonicalVariantSignatureHash,
          merchantVariantSignatureHash: recommendation.merchantVariantSignatureHash,
          actionTaken: "create_blocked_pending_override",
          blockReason,
          reasons: recommendation.reasons,
        });
      }
    }

    return {
      allowed: false,
      code: "CREATE_BLOCKED",
      message: CREATE_BLOCKED_MESSAGE,
      recommendation,
      blockReasons,
    };
  }

  logVariantDedupEvent({
    event: "variant.approval_create_override",
    requestId: params.requestId,
    vendorId: fetched.data.vendor_id,
    adminUserId: params.adminUserId,
    candidateProductId:
      recommendation.candidateProductId ?? recommendation.tenantCatalogStrictMatchProductId,
    canonicalVariantSignatureHash: recommendation.canonicalVariantSignatureHash,
    merchantVariantSignatureHash: recommendation.merchantVariantSignatureHash,
    actionTaken: "create_with_override",
    reasons: recommendation.reasons,
    overrideReason: params.overrideReason ?? null,
    blockReason: blockReasons.join(","),
  });

  return { allowed: true, recommendation, overrideUsed: true, blockReasons };
}

export async function logApprovalLinkRecommended(
  supabase: SupabaseClient,
  params: { requestId: string; vendorId: string; adminUserId: string; productId: string },
): Promise<void> {
  const fetched = await fetchCatalogProductRequestById(supabase, params.requestId);
  if (fetched.error || !fetched.data) return;

  const matchResult = await fetchCatalogRequestMatchByRequestId(supabase, params.requestId);
  const recommendation = await resolveCatalogApprovalRecommendation(
    supabase,
    fetched.data,
    matchResult.error ? null : matchResult.data,
  );

  logVariantDedupEvent({
    event: "variant.approval_link_recommended",
    requestId: params.requestId,
    vendorId: params.vendorId,
    adminUserId: params.adminUserId,
    candidateProductId: params.productId,
    canonicalVariantSignatureHash: recommendation.canonicalVariantSignatureHash,
    merchantVariantSignatureHash: recommendation.merchantVariantSignatureHash,
    actionTaken: "link_followed",
    reasons: recommendation.reasons,
  });
}
