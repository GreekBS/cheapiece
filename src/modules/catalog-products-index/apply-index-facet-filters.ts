import type { FacetIndexMap } from "./types/product-publication-index";

export type IndexFacetFilter = {
  code: string;
  value: string | number | boolean | string[];
};

/**
 * AND semantics over flattened facet_index map (JSONB @> companion).
 */
export function applyIndexFacetFilters(
  facetIndex: FacetIndexMap,
  filters: IndexFacetFilter[],
): boolean {
  if (filters.length === 0) {
    return true;
  }
  return filters.every((filter) => {
    const expected = flattenFilterValue(filter.value);
    if (expected === null) {
      return false;
    }
    const stored = facetIndex[filter.code];
    return stored !== undefined && stored === expected;
  });
}

/** Builds JSONB object for Supabase `.contains('facet_index', obj)`. */
export function facetFiltersToIndexContainsMap(
  filters: IndexFacetFilter[],
): FacetIndexMap {
  const map: FacetIndexMap = {};
  for (const filter of filters) {
    const value = flattenFilterValue(filter.value);
    if (value !== null) {
      map[filter.code] = value;
    }
  }
  return map;
}

function flattenFilterValue(value: IndexFacetFilter["value"]): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }
    return [...value].map(String).sort().join(",");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}
