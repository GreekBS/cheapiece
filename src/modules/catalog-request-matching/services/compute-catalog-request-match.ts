import type { SupabaseClient } from "@supabase/supabase-js";

import { pickBestMatch, toMatchSnapshotPayload } from "../engine/score-simple-match";
import { fetchMatchCandidates } from "../queries/fetch-match-candidates";
import type { MatchDraftInput, MatchSnapshotPayload, MatchSuggestionResult } from "../types/match-types";

export type ComputeMatchResult =
  | { ok: true; suggestion: MatchSuggestionResult | null; snapshot: MatchSnapshotPayload }
  | { ok: false; errorMessage: string };

export async function computeCatalogRequestMatch(
  supabase: SupabaseClient,
  draft: MatchDraftInput,
): Promise<ComputeMatchResult> {
  const fetched = await fetchMatchCandidates(supabase, draft.tenantId, draft.categoryId);
  if (!fetched.ok) {
    return { ok: false, errorMessage: fetched.errorMessage };
  }

  const computedAt = new Date().toISOString();
  const suggestion = pickBestMatch(draft, fetched.candidates);
  const snapshot = toMatchSnapshotPayload(suggestion, computedAt);

  return { ok: true, suggestion, snapshot };
}
