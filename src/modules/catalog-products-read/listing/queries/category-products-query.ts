import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProductIdentityDTO } from "../../types/product-aggregate.dto";
import type { CategoryProductListQuery } from "../types/category-product-list.dto";

function mapProductRow(r: Record<string, unknown>): ProductIdentityDTO {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    title: r.title as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    slug: r.slug as string,
    categoryId: (r.category_id as string | null) ?? null,
    state: r.state as string,
  };
}

export type CategoryProductsPage = {
  products: ProductIdentityDTO[];
  hasMore: boolean;
  totalCount: number | null;
};

/**
 * Unfiltered category listing — products drive identity/pagination.
 * Products without publication remain included (publication batch may be null).
 */
export async function fetchCategoryProductsPage(
  supabase: SupabaseClient,
  categoryId: string,
  query: CategoryProductListQuery,
  tenantId?: string,
): Promise<CategoryProductsPage> {
  const page = Math.max(query.page, 1);
  const pageSize = Math.min(Math.max(query.pageSize, 1), 48);
  const from = (page - 1) * pageSize;
  const to = from + pageSize; /* inclusive: fetch pageSize + 1 for hasMore */

  let qb = supabase
    .from("products")
    .select("id, tenant_id, title, brand, model, slug, category_id, state, created_at", {
      count: "exact",
    })
    .eq("category_id", categoryId)
    .eq("state", "active");

  if (tenantId) {
    qb = qb.eq("tenant_id", tenantId);
  }

  if (query.brand) {
    qb = qb.eq("brand", query.brand);
  }

  if (query.sort === "title_asc") {
    qb = qb.order("title", { ascending: true });
  } else {
    qb = qb.order("created_at", { ascending: false });
  }

  const { data, error, count } = await qb.range(from, to);

  if (error || !data) {
    return { products: [], hasMore: false, totalCount: null };
  }

  const list = (data as Record<string, unknown>[]).map(mapProductRow);
  const hasMore = list.length > pageSize;
  const products = hasMore ? list.slice(0, pageSize) : list;

  return { products, hasMore, totalCount: count ?? null };
}
