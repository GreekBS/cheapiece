import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import { buildVariantSignatureInputFromProduct } from "./build-variant-signature-input-from-product";
import {
  computeEffectiveApprovalSignatureInput,
  type AdminApprovalSignatureOverrides,
} from "./compute-effective-approval-signature-input";
import {
  canonicalSignaturesMatch,
  computeCanonicalVariantSignature,
  isSparseVariantMetadata,
} from "./variant-signatures";
import { logVariantDedupEvent } from "./variant-dedup-log";
import {
  isVariantDedupEnabled,
  isVariantDedupShadowMode,
  shouldEnforceStrictLinkValidation,
} from "./variant-dedup-flags";
import { logVariantDedupShadowEvent } from "./variant-dedup-shadow-log";

export type LinkVariantMatchStatus = "strict_match" | "mismatch" | "sparse_request" | "sparse_both";

export type LinkApprovalGuardResult =
  | { allowed: true; matchStatus: LinkVariantMatchStatus; overrideUsed: boolean }
  | {
      allowed: false;
      code: "LINK_VARIANT_MISMATCH";
      message: string;
      matchStatus: LinkVariantMatchStatus;
    };

const LINK_MISMATCH_MESSAGE =
  "Η παραλλαγή της αίτησης δεν ταιριάζει με το επιλεγμένο προϊόν. Επιβεβαιώστε σύνδεση παρά τη διαφορά ή επιλέξτε άλλο προϊόν.";

export async function compareLinkVariantMatch(
  supabase: SupabaseClient,
  params: {
    request: CatalogProductRequestRow;
    productId: string;
    adminOverrides?: AdminApprovalSignatureOverrides;
  },
): Promise<{ status: LinkVariantMatchStatus; requestHash: string; productHash: string | null }> {
  const effectiveInput = computeEffectiveApprovalSignatureInput(
    params.request,
    params.adminOverrides,
  );
  const requestHash = computeCanonicalVariantSignature(effectiveInput);
  const requestSparse = isSparseVariantMetadata(effectiveInput);

  const productInput = await buildVariantSignatureInputFromProduct(
    supabase,
    params.productId,
    params.request.tenant_id,
  );

  if (!productInput) {
    return { status: "mismatch", requestHash, productHash: null };
  }

  const productHash = computeCanonicalVariantSignature(productInput);
  const productSparse = isSparseVariantMetadata(productInput);

  if (requestSparse && productSparse) {
    return { status: "sparse_both", requestHash, productHash };
  }

  if (requestSparse) {
    return { status: "sparse_request", requestHash, productHash };
  }

  if (canonicalSignaturesMatch(requestHash, productHash)) {
    return { status: "strict_match", requestHash, productHash };
  }

  return { status: "mismatch", requestHash, productHash };
}

export async function assertLinkApprovalAllowed(
  supabase: SupabaseClient,
  params: {
    request: CatalogProductRequestRow;
    productId: string;
    adminUserId: string;
    overrideConfirmed: boolean;
    overrideReason?: string | null;
    adminOverrides?: AdminApprovalSignatureOverrides;
  },
): Promise<LinkApprovalGuardResult> {
  if (!isVariantDedupEnabled()) {
    return { allowed: true, matchStatus: "strict_match", overrideUsed: false };
  }

  const comparison = await compareLinkVariantMatch(supabase, {
    request: params.request,
    productId: params.productId,
    adminOverrides: params.adminOverrides,
  });

  if (
    comparison.status === "strict_match" ||
    comparison.status === "sparse_both" ||
    comparison.status === "sparse_request"
  ) {
    if (comparison.status === "sparse_request" || comparison.status === "sparse_both") {
      logVariantDedupEvent({
        event: "variant.approval_link_sparse",
        requestId: params.request.id,
        vendorId: params.request.vendor_id,
        adminUserId: params.adminUserId,
        candidateProductId: params.productId,
        canonicalVariantSignatureHash: comparison.requestHash,
        actionTaken: "link_allowed_sparse",
        matchStatus: comparison.status,
      });
    }

    return { allowed: true, matchStatus: comparison.status, overrideUsed: false };
  }

  if (!params.overrideConfirmed) {
    if (!shouldEnforceStrictLinkValidation()) {
      return { allowed: true, matchStatus: comparison.status, overrideUsed: false };
    }

    logVariantDedupEvent({
      event: "variant.approval_link_variant_mismatch",
      requestId: params.request.id,
      vendorId: params.request.vendor_id,
      adminUserId: params.adminUserId,
      candidateProductId: params.productId,
      canonicalVariantSignatureHash: comparison.requestHash,
      actionTaken: "link_blocked_pending_override",
      matchStatus: comparison.status,
    });

    if (isVariantDedupShadowMode()) {
      logVariantDedupShadowEvent({
        event: "would_block_link",
        requestId: params.request.id,
        vendorId: params.request.vendor_id,
        productId: params.productId,
        matchStatus: comparison.status,
      });
      return { allowed: true, matchStatus: comparison.status, overrideUsed: false };
    }

    return {
      allowed: false,
      code: "LINK_VARIANT_MISMATCH",
      message: LINK_MISMATCH_MESSAGE,
      matchStatus: comparison.status,
    };
  }

  logVariantDedupEvent({
    event: "variant.approval_link_override",
    requestId: params.request.id,
    vendorId: params.request.vendor_id,
    adminUserId: params.adminUserId,
    candidateProductId: params.productId,
    canonicalVariantSignatureHash: comparison.requestHash,
    actionTaken: "link_with_override",
    overrideReason: params.overrideReason ?? null,
    matchStatus: comparison.status,
  });

  return { allowed: true, matchStatus: comparison.status, overrideUsed: true };
}
