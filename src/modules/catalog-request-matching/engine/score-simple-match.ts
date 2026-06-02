import type {
  CatalogRequestMatchScoreBreakdown,
  MatchCandidateRow,
  MatchDraftInput,
  MatchSnapshotPayload,
  MatchSuggestionResult,
} from "../types/match-types";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function tokenize(s: string): string[] {
  return norm(s)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function titleSimilarity(requestTitle: string, productTitle: string): number {
  const terms = tokenize(requestTitle);
  if (terms.length === 0) return 0;
  const hay = norm(productTitle);
  let hits = 0;
  for (const t of terms) {
    if (hay.includes(t)) hits += 1;
  }
  return hits / terms.length;
}

function attributeOverlap(
  requestValues: Record<string, unknown>,
  productValues: Record<string, unknown>,
): number {
  const keys = Object.keys(requestValues).filter((k) => {
    const v = requestValues[k];
    return v !== null && v !== undefined && v !== "";
  });
  if (keys.length === 0) return 0;

  let matched = 0;
  for (const key of keys) {
    const a = serializeValue(requestValues[key]);
    const b = serializeValue(productValues[key]);
    if (a && b && a === b) matched += 1;
  }
  return matched / keys.length;
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function scoreCandidate(
  draft: MatchDraftInput,
  candidate: MatchCandidateRow,
): { score: number; breakdown: CatalogRequestMatchScoreBreakdown; reasons: string[] } {
  const categoryMatch =
    draft.categoryId === null || candidate.categoryId === draft.categoryId;
  const brandExact = norm(draft.brand) !== "" && norm(draft.brand) === norm(candidate.brand);
  const modelExact = norm(draft.model) !== "" && norm(draft.model) === norm(candidate.model);
  const titleSim = titleSimilarity(draft.title, candidate.title);
  const hasPub = Object.keys(candidate.attributeValues).length > 0;
  const attrOverlap = hasPub ? attributeOverlap(draft.attributeValues, candidate.attributeValues) : 0;

  const penalties: CatalogRequestMatchScoreBreakdown["penalties"] = {};
  if (!draft.categoryId) penalties.category_not_selected = true;
  if (!hasPub && Object.keys(draft.attributeValues).length > 0) {
    penalties.no_publication_snapshot = true;
  }

  let score =
    0.35 * titleSim +
    0.2 * (brandExact ? 1 : 0) +
    0.2 * (modelExact ? 1 : 0) +
    0.25 * attrOverlap;

  if (!categoryMatch) score = 0;
  if (penalties.no_publication_snapshot) score *= 0.65;

  const breakdown: CatalogRequestMatchScoreBreakdown = {
    category_match: categoryMatch,
    title_similarity: Math.round(titleSim * 1000) / 1000,
    brand_exact: brandExact,
    model_exact: modelExact,
    attribute_overlap: Math.round(attrOverlap * 1000) / 1000,
    has_publication_snapshot: hasPub,
    penalties,
  };

  const reasons: string[] = [];
  if (categoryMatch && draft.categoryId) reasons.push("category_match");
  if (brandExact) reasons.push("brand_exact");
  if (modelExact) reasons.push("model_exact");
  if (titleSim >= 0.5) reasons.push("title_similarity");
  if (attrOverlap >= 0.4) reasons.push("attribute_overlap");
  if (penalties.no_publication_snapshot) reasons.push("no_publication_snapshot");

  return { score: Math.min(1, Math.max(0, score)), breakdown, reasons };
}

export function pickBestMatch(
  draft: MatchDraftInput,
  candidates: MatchCandidateRow[],
): MatchSuggestionResult | null {
  if (candidates.length === 0) return null;

  let best: {
    candidate: MatchCandidateRow;
    score: number;
    breakdown: CatalogRequestMatchScoreBreakdown;
    reasons: string[];
  } | null = null;

  for (const candidate of candidates) {
    const scored = scoreCandidate(draft, candidate);
    if (!scored.breakdown.category_match) continue;
    if (!best || scored.score > best.score) {
      best = { candidate, ...scored };
    } else if (scored.score === best.score && candidate.productId < best.candidate.productId) {
      best = { candidate, ...scored };
    }
  }

  if (!best || best.score <= 0) return null;

  return {
    suggestedProductId: best.candidate.productId,
    suggestedTitle: best.candidate.title,
    suggestedBrand: best.candidate.brand,
    suggestedModel: best.candidate.model,
    confidence: Math.round(best.score * 1000) / 1000,
    matchTier: "SIMPLE_V1",
    matchMethod: "simple_v1",
    engineVersion: "match-v1",
    scoreBreakdown: best.breakdown,
    matchReasons: best.reasons,
    suggestedPublicationPublishedAt: best.candidate.publicationPublishedAt,
  };
}

export function toMatchSnapshotPayload(
  result: MatchSuggestionResult | null,
  computedAt: string,
): MatchSnapshotPayload {
  return {
    suggested_product_id: result?.suggestedProductId ?? null,
    confidence: result?.confidence ?? 0,
    match_tier: result?.matchTier ?? "SIMPLE_V1",
    match_method: result?.matchMethod ?? "simple_v1",
    engine_version: result?.engineVersion ?? "match-v1",
    score_breakdown: result?.scoreBreakdown ?? {
      category_match: false,
      title_similarity: 0,
      brand_exact: false,
      model_exact: false,
      attribute_overlap: 0,
      has_publication_snapshot: false,
      penalties: {},
    },
    match_reasons: result?.matchReasons ?? [],
    suggested_publication_published_at: result?.suggestedPublicationPublishedAt ?? null,
    suggestion_computed_at: computedAt,
  };
}
