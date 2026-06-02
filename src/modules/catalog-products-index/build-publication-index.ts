import type { ProductFacetEntry } from "@/modules/catalog-products/types/facet-snapshot";
import type { ProductPublicationDraft } from "@/modules/catalog-products/types/product-publication";

import type { FacetIndexMap, ProductPublicationIndexUpsert } from "./types/product-publication-index";

export type BuildPublicationIndexProduct = {
  id: string;
  tenant_id: string;
  category_id: string;
};

/**
 * Deterministic flatten of facet_snapshot → facet_index map.
 * No schema kernel, no evaluation engine.
 */
export function buildPublicationIndex(
  publication: Pick<ProductPublicationDraft, "facet_snapshot" | "published_at">,
  product: BuildPublicationIndexProduct,
): ProductPublicationIndexUpsert {
  return {
    product_id: product.id,
    tenant_id: product.tenant_id,
    category_id: product.category_id,
    facet_index: flattenFacetSnapshot(publication.facet_snapshot),
    has_publication: true,
    published_at: publication.published_at,
  };
}

export function flattenFacetSnapshot(facets: ProductFacetEntry[]): FacetIndexMap {
  const index: FacetIndexMap = {};
  for (const facet of facets) {
    const value = flattenFacetValue(facet.value);
    if (value === null || value === "") {
      continue;
    }
    index[facet.code] = value;
  }
  return index;
}

function flattenFacetValue(value: ProductFacetEntry["value"]): string | null {
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
