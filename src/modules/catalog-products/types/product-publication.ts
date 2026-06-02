import type { CatalogValidationMode } from "@/modules/catalog-requests/types/phase2-schema-baseline";

import type { ProductDisplaySnapshot } from "./display-snapshot";
import type { ProductFacetEntry } from "./facet-snapshot";

/** Write-time publication draft — passed to atomic publish RPC as JSON. */
export type ProductPublicationDraft = {
  schema_version_id: string | null;
  validation_mode: CatalogValidationMode;
  locale: string;
  attribute_values: Record<string, unknown>;
  display_snapshot: ProductDisplaySnapshot;
  facet_snapshot: ProductFacetEntry[];
  published_at: string;
};

export type ProductCatalogPublicationRow = {
  product_id: string;
  tenant_id: string;
  source_request_id: string;
  schema_version_id: string | null;
  validation_mode: CatalogValidationMode;
  locale: string;
  attribute_values: Record<string, unknown>;
  display_snapshot: ProductDisplaySnapshot;
  facet_snapshot: ProductFacetEntry[];
  published_at: string;
  created_at: string;
  updated_at: string;
};
