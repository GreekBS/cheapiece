import type { ProductFacetEntry } from "@/modules/catalog-products/types/facet-snapshot";

import type { FacetFilter } from "./types/category-product-list.dto";

/**
 * Facet filters operate only on published products (publication.facet_snapshot).
 * AND semantics — used for in-memory verification and post-query guard.
 * NO attribute_payload, NO schema kernel.
 */
export function applyFacetFilters(
  facetSnapshot: ProductFacetEntry[],
  filters: FacetFilter[],
): boolean {
  if (filters.length === 0) {
    return true;
  }
  return filters.every((filter) =>
    facetSnapshot.some(
      (entry) =>
        entry.code === filter.code && valuesEqualForFacet(entry.value, filter.value),
    ),
  );
}

function valuesEqualForFacet(
  stored: ProductFacetEntry["value"],
  expected: FacetFilter["value"],
): boolean {
  if (Array.isArray(stored) && Array.isArray(expected)) {
    if (stored.length !== expected.length) {
      return false;
    }
    const a = [...stored].map(String).sort();
    const b = [...expected].map(String).sort();
    return a.every((v, i) => v === b[i]);
  }
  if (Array.isArray(stored) && !Array.isArray(expected)) {
    return stored.map(String).includes(String(expected));
  }
  if (!Array.isArray(stored) && Array.isArray(expected)) {
    return false;
  }
  return stored === expected;
}
