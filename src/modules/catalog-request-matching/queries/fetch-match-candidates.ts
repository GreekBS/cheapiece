import type { SupabaseClient } from "@supabase/supabase-js";

import type { MatchCandidateRow } from "../types/match-types";

const CANDIDATE_LIMIT = 80;

export type FetchMatchCandidatesResult =
  | { ok: true; candidates: MatchCandidateRow[] }
  | { ok: false; errorMessage: string };

async function fetchPublicationsByProductIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, { attributeValues: Record<string, unknown>; publishedAt: string | null }>> {
  const map = new Map<string, { attributeValues: Record<string, unknown>; publishedAt: string | null }>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabase
    .from("product_catalog_publications")
    .select("product_id, attribute_values, published_at")
    .in("product_id", productIds);

  if (error || !data) return map;

  for (const row of data as Record<string, unknown>[]) {
    map.set(row.product_id as string, {
      attributeValues:
        row.attribute_values && typeof row.attribute_values === "object"
          ? (row.attribute_values as Record<string, unknown>)
          : {},
      publishedAt: (row.published_at as string | null) ?? null,
    });
  }

  return map;
}

/**
 * Active products + publication snapshots (flat queries, no embed).
 */
export async function fetchMatchCandidates(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string | null,
): Promise<FetchMatchCandidatesResult> {
  let q = supabase
    .from("products")
    .select("id, title, brand, model, category_id")
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .order("title", { ascending: true })
    .limit(CANDIDATE_LIMIT);

  if (categoryId) {
    q = q.eq("category_id", categoryId);
  }

  const { data, error } = await q;

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  if (!data) {
    return { ok: false, errorMessage: "match candidates returned null data" };
  }

  const rows = data as Record<string, unknown>[];
  const pubMap = await fetchPublicationsByProductIds(
    supabase,
    rows.map((r) => r.id as string),
  );

  const candidates: MatchCandidateRow[] = rows.map((row) => {
    const pub = pubMap.get(row.id as string);
    return {
      productId: row.id as string,
      title: row.title as string,
      brand: (row.brand as string | null) ?? null,
      model: (row.model as string | null) ?? null,
      categoryId: (row.category_id as string | null) ?? null,
      attributeValues: pub?.attributeValues ?? {},
      publicationPublishedAt: pub?.publishedAt ?? null,
    };
  });

  return { ok: true, candidates };
}
