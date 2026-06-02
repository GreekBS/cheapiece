import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogRequestMatchRow } from "@/modules/catalog-request-matching/queries/fetch-catalog-request-match";
import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import { buildVariantSignatureInputFromProduct } from "./build-variant-signature-input-from-product";
import { computeEffectiveApprovalSignatureInput } from "./compute-effective-approval-signature-input";
import { findPendingSiblingSameCanonical } from "./find-pending-sibling-requests";
import { findTenantCatalogCanonicalMatches } from "./find-tenant-catalog-canonical-matches";
import {
  canonicalSignaturesMatch,
  computeCanonicalVariantSignature,
  computeMerchantVariantSignature,
  computeWeakCanonicalVariantSignature,
  isSparseVariantMetadata,
} from "./variant-signatures";
import type { CatalogApprovalRecommendation, CatalogApprovalRecommendationReason } from "./types";
import { isVariantDedupEnabled, isVariantDedupShadowMode } from "./variant-dedup-flags";
import {
  createDisabledVariantDedupRecommendation,
  logVariantDedupShadowEvent,
} from "./variant-dedup-shadow-log";

const PRIOR_REQUEST_SELECT =
  "id, vendor_id, status, resolved_product_id, category_id, title, brand, model, gtin, mpn, slug_suggestion, attribute_payload, merchant_hidden_at";

async function isProductPublishedInTenant(
  supabase: SupabaseClient,
  productId: string,
  tenantId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("product_catalog_publications")
    .select("product_id")
    .eq("product_id", productId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return !error && Boolean(data);
}

async function vendorHasNonArchivedOfferForProduct(
  supabase: SupabaseClient,
  vendorId: string,
  productId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("store_products")
    .select("id")
    .eq("vendor_id", vendorId)
    .eq("product_id", productId)
    .eq("condition", "new")
    .eq("listing_variant_key", "")
    .neq("state", "archived")
    .limit(1)
    .maybeSingle();

  return !error && Boolean(data);
}

async function findPriorApprovedSameCanonicalVariant(
  supabase: SupabaseClient,
  request: CatalogProductRequestRow,
  canonicalHash: string,
): Promise<{ requestId: string; resolvedProductId: string } | null> {
  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select(PRIOR_REQUEST_SELECT)
    .eq("vendor_id", request.vendor_id)
    .eq("status", "approved")
    .is("merchant_hidden_at", null)
    .neq("id", request.id);

  if (error || !data) return null;

  for (const row of data as CatalogProductRequestRow[]) {
    if (!row.resolved_product_id) continue;
    const rowInput = computeEffectiveApprovalSignatureInput(row);
    const rowHash = computeCanonicalVariantSignature(rowInput);
    if (rowHash === canonicalHash) {
      return { requestId: row.id, resolvedProductId: row.resolved_product_id };
    }
  }

  return null;
}

function resolveCandidateFromMatch(match: CatalogRequestMatchRow | null): string | null {
  if (!match) return null;
  return (
    match.match_reviewed_product_id ??
    match.merchant_selected_product_id ??
    match.suggested_product_id ??
    null
  );
}

function pushReason(
  reasons: CatalogApprovalRecommendationReason[],
  reason: CatalogApprovalRecommendationReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

async function verifyProductCanonicalMatch(
  supabase: SupabaseClient,
  requestHash: string,
  productId: string,
  tenantId: string,
): Promise<boolean> {
  const productInput = await buildVariantSignatureInputFromProduct(
    supabase,
    productId,
    tenantId,
  );
  if (!productInput) return false;
  const productHash = computeCanonicalVariantSignature(productInput);
  return canonicalSignaturesMatch(requestHash, productHash);
}

function buildRecommendationBase(
  request: CatalogProductRequestRow,
  effectiveInput: ReturnType<typeof computeEffectiveApprovalSignatureInput>,
): Pick<
  CatalogApprovalRecommendation,
  "canonicalVariantSignatureHash" | "merchantVariantSignatureHash"
> {
  return {
    canonicalVariantSignatureHash: computeCanonicalVariantSignature(effectiveInput),
    merchantVariantSignatureHash: computeMerchantVariantSignature({
      ...effectiveInput,
      vendor_id: request.vendor_id,
      title: request.title,
      slug_suggestion: request.slug_suggestion,
    }),
  };
}

/**
 * Read-only approval recommendation — never auto-links or hard-blocks.
 */
export async function resolveCatalogApprovalRecommendation(
  supabase: SupabaseClient,
  request: CatalogProductRequestRow,
  match: CatalogRequestMatchRow | null,
): Promise<CatalogApprovalRecommendation> {
  if (!isVariantDedupEnabled()) {
    return createDisabledVariantDedupRecommendation(request);
  }

  const result = await resolveCatalogApprovalRecommendationCore(supabase, request, match);

  if (isVariantDedupShadowMode() && result.mode === "link") {
    logVariantDedupShadowEvent({
      event: "would_recommend_link",
      requestId: request.id,
      vendorId: request.vendor_id,
      productId: result.candidateProductId,
      recommendationMode: result.mode,
    });
  }

  return result;
}

async function resolveCatalogApprovalRecommendationCore(
  supabase: SupabaseClient,
  request: CatalogProductRequestRow,
  match: CatalogRequestMatchRow | null,
): Promise<CatalogApprovalRecommendation> {
  const effectiveInput = computeEffectiveApprovalSignatureInput(request);
  const base = buildRecommendationBase(request, effectiveInput);
  const canonicalHash = base.canonicalVariantSignatureHash;
  const weakHash = computeWeakCanonicalVariantSignature(effectiveInput);
  const sparse = isSparseVariantMetadata(effectiveInput);
  const reasons: CatalogApprovalRecommendationReason[] = [];

  const pendingSiblings = await findPendingSiblingSameCanonical(supabase, {
    vendorId: request.vendor_id,
    excludeRequestId: request.id,
    canonicalHash,
  });

  const tenantMatches = await findTenantCatalogCanonicalMatches(supabase, {
    tenantId: request.tenant_id,
    strictCanonicalHash: canonicalHash,
    weakCanonicalHash: weakHash,
    hints: {
      categoryId: effectiveInput.category_id,
      brand: effectiveInput.brand,
      model: effectiveInput.model,
      gtin: effectiveInput.gtin,
    },
  });

  const tenantStrictProductId = tenantMatches.strictMatches[0]?.productId ?? null;
  const weakHintIds = tenantMatches.weakMatches.map((m) => m.productId);

  if (pendingSiblings.requestIds.length > 0) {
    pushReason(reasons, "pending_sibling_same_variant");
  }

  if (tenantStrictProductId) {
    pushReason(reasons, "tenant_catalog_same_variant");
  }

  if (sparse) {
    pushReason(reasons, "sparse_variant_metadata");
    if (weakHintIds.length > 0) {
      pushReason(reasons, "weak_catalog_hint");
    }
  }

  const metadata = {
    pendingSiblingRequestIds: pendingSiblings.requestIds,
    tenantCatalogStrictMatchProductId: tenantStrictProductId,
    weakCatalogHintProductIds: weakHintIds,
  };

  // Pending siblings → never default to create
  if (pendingSiblings.requestIds.length > 0) {
    const priorSameVariant = await findPriorApprovedSameCanonicalVariant(
      supabase,
      request,
      canonicalHash,
    );
    const linkCandidate =
      priorSameVariant?.resolvedProductId ??
      tenantStrictProductId ??
      (await resolveLinkCandidateWithSigMatch(
        supabase,
        request,
        canonicalHash,
        match,
      ));

    return {
      mode: "review",
      candidateProductId: linkCandidate,
      reasons,
      ...base,
      ...metadata,
    };
  }

  const priorSameVariant = await findPriorApprovedSameCanonicalVariant(
    supabase,
    request,
    canonicalHash,
  );

  if (priorSameVariant) {
    pushReason(reasons, "prior_approved_same_variant");
    pushReason(reasons, "canonical_duplicate_for_vendor");
    return {
      mode: "link",
      candidateProductId: priorSameVariant.resolvedProductId,
      reasons,
      ...base,
      ...metadata,
    };
  }

  if (tenantStrictProductId) {
    return {
      mode: sparse ? "review" : "link",
      candidateProductId: tenantStrictProductId,
      reasons,
      ...base,
      ...metadata,
    };
  }

  let candidateProductId = await resolveLinkCandidateWithSigMatch(
    supabase,
    request,
    canonicalHash,
    match,
  );

  const rawMatchCandidate = resolveCandidateFromMatch(match);
  if (rawMatchCandidate && !candidateProductId && !sparse) {
    pushReason(reasons, "candidate_variant_mismatch");
  }

  if (match?.match_reviewed_product_id) {
    pushReason(reasons, "match_reviewed_product");
  } else if (match?.merchant_selected_product_id) {
    pushReason(reasons, "merchant_selected_product");
  }

  if (candidateProductId) {
    const published = await isProductPublishedInTenant(
      supabase,
      candidateProductId,
      request.tenant_id,
    );
    if (!published) {
      candidateProductId = null;
      pushReason(reasons, "no_match_candidate");
    }
  }

  if (candidateProductId) {
    const hasOffer = await vendorHasNonArchivedOfferForProduct(
      supabase,
      request.vendor_id,
      candidateProductId,
    );
    if (hasOffer) {
      pushReason(reasons, "vendor_has_live_offer");
    }

    const confidence = match?.confidence ?? null;
    if (confidence != null && confidence >= 0.85) {
      pushReason(reasons, "high_confidence_match");
      return {
        mode: sparse ? "review" : "link",
        candidateProductId,
        reasons,
        ...base,
        ...metadata,
      };
    }

    if (confidence != null && confidence >= 0.55) {
      pushReason(reasons, "high_confidence_match");
      return {
        mode: "review",
        candidateProductId,
        reasons,
        ...base,
        ...metadata,
      };
    }

    if (
      reasons.includes("merchant_selected_product") ||
      reasons.includes("match_reviewed_product")
    ) {
      return {
        mode: sparse ? "review" : "link",
        candidateProductId,
        reasons,
        ...base,
        ...metadata,
      };
    }

    return {
      mode: "review",
      candidateProductId,
      reasons,
      ...base,
      ...metadata,
    };
  }

  if (sparse) {
    return {
      mode: "review",
      candidateProductId: null,
      reasons,
      ...base,
      ...metadata,
    };
  }

  pushReason(reasons, "no_match_candidate");
  return {
    mode: "create",
    candidateProductId: null,
    reasons,
    ...base,
    ...metadata,
  };
}

async function resolveLinkCandidateWithSigMatch(
  supabase: SupabaseClient,
  request: CatalogProductRequestRow,
  requestHash: string,
  match: CatalogRequestMatchRow | null,
): Promise<string | null> {
  const rawCandidate = resolveCandidateFromMatch(match);
  if (!rawCandidate) return null;

  const matches = await verifyProductCanonicalMatch(
    supabase,
    requestHash,
    rawCandidate,
    request.tenant_id,
  );

  if (!matches) {
    return null;
  }

  return rawCandidate;
}