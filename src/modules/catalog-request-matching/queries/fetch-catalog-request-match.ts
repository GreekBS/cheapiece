import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogRequestMatchScoreBreakdown } from "../types/match-types";

export type CatalogRequestMatchRow = {
  request_id: string;
  tenant_id: string;
  suggested_product_id: string | null;
  confidence: number | null;
  match_tier: string;
  match_method: string;
  score_breakdown: CatalogRequestMatchScoreBreakdown;
  match_reasons: string[];
  suggested_publication_published_at: string | null;
  engine_version: string;
  suggestion_computed_at: string;
  merchant_selected_product_id: string | null;
  merchant_selected_at: string | null;
  merchant_selected_by_user_id: string | null;
  match_review_status: string;
  match_reviewed_product_id: string | null;
  match_reviewed_by_user_id: string | null;
  match_reviewed_at: string | null;
};

export type CatalogRequestMatchQueryResult = {
  data: CatalogRequestMatchRow | null;
  error: boolean;
  errorMessage?: string;
  meta: { source: "supabase"; function: string; requestId: string };
};

function mapRow(r: Record<string, unknown>): CatalogRequestMatchRow {
  return {
    request_id: r.request_id as string,
    tenant_id: r.tenant_id as string,
    suggested_product_id: (r.suggested_product_id as string | null) ?? null,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    match_tier: r.match_tier as string,
    match_method: r.match_method as string,
    score_breakdown: (r.score_breakdown as CatalogRequestMatchScoreBreakdown) ?? {
      category_match: false,
      title_similarity: 0,
      brand_exact: false,
      model_exact: false,
      attribute_overlap: 0,
      has_publication_snapshot: false,
      penalties: {},
    },
    match_reasons: Array.isArray(r.match_reasons) ? (r.match_reasons as string[]) : [],
    suggested_publication_published_at: (r.suggested_publication_published_at as string | null) ?? null,
    engine_version: r.engine_version as string,
    suggestion_computed_at: r.suggestion_computed_at as string,
    merchant_selected_product_id: (r.merchant_selected_product_id as string | null) ?? null,
    merchant_selected_at: (r.merchant_selected_at as string | null) ?? null,
    merchant_selected_by_user_id: (r.merchant_selected_by_user_id as string | null) ?? null,
    match_review_status: r.match_review_status as string,
    match_reviewed_product_id: (r.match_reviewed_product_id as string | null) ?? null,
    match_reviewed_by_user_id: (r.match_reviewed_by_user_id as string | null) ?? null,
    match_reviewed_at: (r.match_reviewed_at as string | null) ?? null,
  };
}

export async function fetchCatalogRequestMatchByRequestId(
  supabase: SupabaseClient,
  requestId: string,
): Promise<CatalogRequestMatchQueryResult> {
  const meta = { source: "supabase" as const, function: "fetchCatalogRequestMatchByRequestId", requestId };

  const { data, error } = await supabase
    .from("catalog_request_matches")
    .select(
      "request_id, tenant_id, suggested_product_id, confidence, match_tier, match_method, score_breakdown, match_reasons, suggested_publication_published_at, engine_version, suggestion_computed_at, merchant_selected_product_id, merchant_selected_at, merchant_selected_by_user_id, match_review_status, match_reviewed_product_id, match_reviewed_by_user_id, match_reviewed_at",
    )
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) {
    return { data: null, error: true, errorMessage: error.message, meta };
  }

  if (!data) {
    return { data: null, error: false, meta };
  }

  return { data: mapRow(data as Record<string, unknown>), error: false, meta };
}
