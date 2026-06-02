import type { ProductFacetEntry } from "@/modules/catalog-products/types/facet-snapshot";

import type { FacetFilter } from "../types/category-product-list.dto";

/**
 * Facet filters operate only on published products (publication.facet_snapshot).
 * Used by getCategoryProductList (3B-2) and for in-memory verification/tests.
 * NO attribute_payload, NO schema kernel.
 */

export function facetFilterToContainsFragment(filters: FacetFilter[]): ProductFacetEntry[] {
  return filters.map((f) => ({
    code: f.code,
    primitive: "",
    label: "",
    value: f.value,
    displayValue: "",
  }));
}

export function facetSnapshotMatchesFilters(
  facets: ProductFacetEntry[],
  filters: FacetFilter[],
): boolean {
  if (filters.length === 0) {
    return true;
  }
  return filters.every((filter) =>
    facets.some(
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
  return stored === expected;
}
