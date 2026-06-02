import type { SupabaseClient } from "@supabase/supabase-js";

import {
  searchActiveProductsForTenant,
  type ActiveCatalogSearchRow,
} from "@/modules/catalog/queries/product-queries";

export type PublishedCatalogSearchRow = ActiveCatalogSearchRow;

/**
 * Active products with an existing product_catalog_publications row (admin link-approve v1).
 */
export async function searchPublishedProductsForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  opts: { categoryId?: string; q?: string; limit?: number },
): Promise<PublishedCatalogSearchRow[]> {
  const candidates = await searchActiveProductsForTenant(supabase, tenantId, opts);
  if (candidates.length === 0) {
    return [];
  }

  const ids = candidates.map((c) => c.id);
  const { data, error } = await supabase
    .from("product_catalog_publications")
    .select("product_id")
    .eq("tenant_id", tenantId)
    .in("product_id", ids);

  if (error || !data) {
    return [];
  }

  const published = new Set(data.map((r) => r.product_id as string));
  return candidates.filter((c) => published.has(c.id));
}
