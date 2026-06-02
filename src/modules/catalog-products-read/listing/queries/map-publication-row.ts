import type { CatalogValidationMode } from "@/modules/catalog-requests/types/phase2-schema-baseline";
import type { ProductDisplaySnapshot } from "@/modules/catalog-products/types/display-snapshot";
import type { ProductFacetEntry } from "@/modules/catalog-products/types/facet-snapshot";
import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";

export function mapPublicationRow(r: Record<string, unknown>): ProductCatalogPublicationRow {
  return {
    product_id: r.product_id as string,
    tenant_id: r.tenant_id as string,
    source_request_id: r.source_request_id as string,
    schema_version_id: (r.schema_version_id as string | null) ?? null,
    validation_mode: r.validation_mode as CatalogValidationMode,
    locale: r.locale as string,
    attribute_values: (r.attribute_values as Record<string, unknown>) ?? {},
    display_snapshot: r.display_snapshot as ProductDisplaySnapshot,
    facet_snapshot: (r.facet_snapshot as ProductFacetEntry[]) ?? [],
    published_at: r.published_at as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

const PUBLICATION_COLUMNS =
  "product_id, tenant_id, source_request_id, schema_version_id, validation_mode, locale, attribute_values, display_snapshot, facet_snapshot, published_at, created_at, updated_at";

export const PUBLICATION_SELECT = PUBLICATION_COLUMNS;
