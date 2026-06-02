import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchCatalogRequestMatchByRequestId } from "@/modules/catalog-request-matching/queries/fetch-catalog-request-match";
import { fetchCatalogProductRequestById } from "@/modules/catalog-requests/queries/catalog-product-request-queries";

import { compareLinkVariantMatch } from "./assert-link-approval-allowed";
import { resolveCatalogApprovalRecommendation } from "./resolve-catalog-approval-recommendation";
import {
  buildVariantDedupValidationReportFromRequest,
  type VariantDedupValidationReport,
} from "./variant-dedup-validation-snapshot";

export type {
  VariantDedupValidationReport,
  VariantDedupValidationRisk,
} from "./variant-dedup-validation-snapshot";
export {
  buildVariantDedupValidationReportFromRequest,
  detectValidationRisksFromSnapshot,
} from "./variant-dedup-validation-snapshot";

/**
 * Read-only end-to-end approval simulation for debugging / rollout validation.
 * Does not mutate data or enforce guards.
 */
export async function buildVariantDedupValidationReport(
  supabase: SupabaseClient,
  requestId: string,
): Promise<VariantDedupValidationReport | null> {
  const fetched = await fetchCatalogProductRequestById(supabase, requestId);
  if (fetched.error || !fetched.data) {
    return null;
  }

  const request = fetched.data;
  const matchResult = await fetchCatalogRequestMatchByRequestId(supabase, requestId);
  const recommendation = await resolveCatalogApprovalRecommendation(
    supabase,
    request,
    matchResult.error ? null : matchResult.data,
  );

  let linkMatchStatus: string | null = null;
  const candidateId =
    recommendation.candidateProductId ?? recommendation.tenantCatalogStrictMatchProductId;

  if (candidateId) {
    const comparison = await compareLinkVariantMatch(supabase, {
      request,
      productId: candidateId,
    });
    linkMatchStatus = comparison.status;
  }

  return buildVariantDedupValidationReportFromRequest(
    request,
    recommendation,
    linkMatchStatus,
  );
}
