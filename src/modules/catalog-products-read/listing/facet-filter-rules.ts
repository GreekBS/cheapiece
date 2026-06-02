import type { FacetFilter } from "./types/category-product-list.dto";

/**
 * Builds JSONB containment fragment for `facet_snapshot @>` / Supabase `.contains`.
 * Uses minimal `{ code, value }` objects so stored facets with extra keys still match.
 */
export function facetFilterToContainsFragment(
  filters: FacetFilter[],
): { code: string; value: FacetFilter["value"] }[] {
  return filters.map((f) => ({ code: f.code, value: f.value }));
}
