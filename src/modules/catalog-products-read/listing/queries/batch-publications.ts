import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProductCatalogPublicationRow } from "@/modules/catalog-products/types/product-publication";

import { mapPublicationRow, PUBLICATION_SELECT } from "./map-publication-row";

export async function fetchPublicationsByProductIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, ProductCatalogPublicationRow>> {
  const map = new Map<string, ProductCatalogPublicationRow>();
  if (productIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("product_catalog_publications")
    .select(PUBLICATION_SELECT)
    .in("product_id", productIds);

  if (error || !data) {
    return map;
  }

  for (const row of data as Record<string, unknown>[]) {
    const mapped = mapPublicationRow(row);
    map.set(mapped.product_id, mapped);
  }
  return map;
}
