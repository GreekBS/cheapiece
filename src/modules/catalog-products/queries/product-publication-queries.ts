import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogValidationMode } from "@/modules/catalog-requests/types/phase2-schema-baseline";

import type { ProductDisplaySnapshot } from "../types/display-snapshot";
import type { ProductFacetEntry } from "../types/facet-snapshot";
import type { ProductCatalogPublicationRow } from "../types/product-publication";

function mapPublicationRow(r: Record<string, unknown>): ProductCatalogPublicationRow {
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

export async function fetchProductCatalogPublicationByProductId(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductCatalogPublicationRow | null> {
  const { data, error } = await supabase
    .from("product_catalog_publications")
    .select(
      "product_id, tenant_id, source_request_id, schema_version_id, validation_mode, locale, attribute_values, display_snapshot, facet_snapshot, published_at, created_at, updated_at",
    )
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapPublicationRow(data as Record<string, unknown>);
}
