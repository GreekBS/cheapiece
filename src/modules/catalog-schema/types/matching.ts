/** Matching tiers — separate from search (T4 is search fallback interface only). */
export type MatchTier = "T0" | "T1" | "T2" | "T3" | "T4";

export type MatchCandidate = {
  productId: string;
  tier: MatchTier;
  confidence: number;
  reasons: string[];
};

export type CatalogMatchIndex = {
  byGtin: Map<string, string>;
  byMpn: Map<string, string>;
  byBrandModel: Map<string, string>;
  byTupleKey: Map<string, string>;
  products: CatalogMatchProduct[];
};

export type CatalogMatchProduct = {
  id: string;
  categoryId: string;
  brand: string | null;
  model: string | null;
  tupleKey: string;
  attributes: Record<string, unknown>;
};

export type MatchCandidatesResult = {
  candidates: MatchCandidate[];
  bestConfidence: number;
};
