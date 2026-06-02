import type { ProductDisplayGroup, ProductDisplayScalars } from "@/modules/catalog-products/types/display-snapshot";
import type { ProductFacetEntry } from "@/modules/catalog-products/types/facet-snapshot";

/**
 * Snapshot-only publication slice for marketplace UI.
 * No attribute_values, schema_version_id, or validation_mode.
 */
export type ProductDisplayReadSnapshot = {
  locale: string;
  scalars: ProductDisplayScalars;
  groups: ProductDisplayGroup[];
};

export type ProductPublicationReadDTO = {
  locale: string;
  publishedAt: string;
  displaySnapshot: ProductDisplayReadSnapshot;
  facets: ProductFacetEntry[];
};
