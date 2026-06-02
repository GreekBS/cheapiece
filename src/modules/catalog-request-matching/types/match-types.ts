/** Persisted / transmitted match explainability (server authority). */
export type CatalogRequestMatchScoreBreakdown = {
  category_match: boolean;
  title_similarity: number;
  brand_exact: boolean;
  model_exact: boolean;
  attribute_overlap: number;
  has_publication_snapshot: boolean;
  penalties: {
    no_publication_snapshot?: boolean;
    category_not_selected?: boolean;
  };
};

export type MatchCandidateRow = {
  productId: string;
  title: string;
  brand: string | null;
  model: string | null;
  categoryId: string | null;
  attributeValues: Record<string, unknown>;
  publicationPublishedAt: string | null;
};

export type MatchDraftInput = {
  tenantId: string;
  categoryId: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  attributeValues: Record<string, unknown>;
};

export type MatchSuggestionResult = {
  suggestedProductId: string | null;
  suggestedTitle: string | null;
  suggestedBrand: string | null;
  suggestedModel: string | null;
  confidence: number;
  matchTier: "SIMPLE_V1";
  matchMethod: "simple_v1";
  engineVersion: "match-v1";
  scoreBreakdown: CatalogRequestMatchScoreBreakdown;
  matchReasons: string[];
  suggestedPublicationPublishedAt: string | null;
};

export type MatchSnapshotPayload = {
  suggested_product_id: string | null;
  confidence: number;
  match_tier: string;
  match_method: string;
  engine_version: string;
  score_breakdown: CatalogRequestMatchScoreBreakdown;
  match_reasons: string[];
  suggested_publication_published_at: string | null;
  suggestion_computed_at: string;
};

export const MATCH_LOW_CONFIDENCE_THRESHOLD = 0.45;
