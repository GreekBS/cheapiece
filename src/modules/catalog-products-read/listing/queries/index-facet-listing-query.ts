import type { SupabaseClient } from "@supabase/supabase-js";

import { applyIndexFacetFilters, facetFiltersToIndexContainsMap } from "@/modules/catalog-products-index/apply-index-facet-filters";

import type { ProductIdentityDTO } from "../../types/product-aggregate.dto";
import type { CategoryProductListQuery, FacetFilter } from "../types/category-product-list.dto";

type EmbeddedProduct = {
  id: string;
  tenant_id: string;
  title: string;
  brand: string | null;
  model: string | null;
  slug: string;
  category_id: string | null;
  state: string;
  created_at: string;
};

export type IndexFacetListingPage = {
  products: ProductIdentityDTO[];
  productIds: string[];
  hasMore: boolean;
  totalCount: number | null;
};

function mapEmbeddedProduct(p: EmbeddedProduct): ProductIdentityDTO {
  return {
    id: p.id,
    tenantId: p.tenant_id,
    title: p.title,
    brand: p.brand,
    model: p.model,
    slug: p.slug,
    categoryId: p.category_id,
    state: p.state,
  };
}

/**
 * Phase 3C index-first facet listing (hot path).
 * Filters on product_publication_index.facet_index via GIN @> / .contains.
 */
export async function fetchIndexFacetListingPage(
  supabase: SupabaseClient,
  categoryId: string,
  query: CategoryProductListQuery,
  facetFilters: FacetFilter[],
  tenantId?: string,
): Promise<IndexFacetListingPage> {
  const page = Math.max(query.page, 1);
  const pageSize = Math.min(Math.max(query.pageSize, 1), 48);
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  const containsMap = facetFiltersToIndexContainsMap(facetFilters);

  let qb = supabase
    .from("product_publication_index")
    .select(
      "product_id, facet_index, published_at, products!inner ( id, tenant_id, title, brand, model, slug, category_id, state, created_at )",
      { count: "exact" },
    )
    .eq("category_id", categoryId)
    .eq("products.state", "active")
    .contains("facet_index", containsMap);

  if (tenantId) {
    qb = qb.eq("tenant_id", tenantId);
  }

  if (query.brand) {
    qb = qb.eq("products.brand", query.brand);
  }

  if (query.sort === "title_asc") {
    qb = qb.order("title", { ascending: true, foreignTable: "products" });
  } else {
    qb = qb.order("created_at", { ascending: false, foreignTable: "products" });
  }

  const { data, error, count } = await qb.range(from, to);

  const products: ProductIdentityDTO[] = [];
  const productIds: string[] = [];

  if (error || !data) {
    return { products: [], productIds: [], hasMore: false, totalCount: null };
  }

  for (const raw of data as Record<string, unknown>[]) {
    const facetIndex = (raw.facet_index as Record<string, string>) ?? {};
    if (!applyIndexFacetFilters(facetIndex, facetFilters)) {
      continue;
    }
    const embedded = raw.products as EmbeddedProduct | EmbeddedProduct[] | null;
    const productRow = Array.isArray(embedded) ? embedded[0] : embedded;
    if (!productRow) {
      continue;
    }
    products.push(mapEmbeddedProduct(productRow));
    productIds.push(raw.product_id as string);
  }

  const hasMore = products.length > pageSize;
  const pageProducts = hasMore ? products.slice(0, pageSize) : products;
  const pageIds = hasMore ? productIds.slice(0, pageSize) : productIds;

  return {
    products: pageProducts,
    productIds: pageIds,
    hasMore,
    totalCount: count ?? null,
  };
}

export async function fetchIndexedProductIdsInCategory(
  supabase: SupabaseClient,
  categoryId: string,
  tenantId?: string,
): Promise<Set<string>> {
  let qb = supabase
    .from("product_publication_index")
    .select("product_id")
    .eq("category_id", categoryId);

  if (tenantId) {
    qb = qb.eq("tenant_id", tenantId);
  }

  const { data, error } = await qb.limit(5000);
  if (error || !data) {
    return new Set();
  }
  return new Set((data as { product_id: string }[]).map((r) => r.product_id));
}
