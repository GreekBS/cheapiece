import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryDbRow } from "@/lib/admin/categories-supabase";
import { withMarketTiming } from "@/lib/observability/timing";

import { fetchPublicCategoryByIdWithActiveChain, fetchPublicCategoryBySlugWithActiveChain } from "./category-queries";

export type ProductOptionRow = {
  id: string;
  title: string;
  slug: string;
};

/** Active catalog row for merchant matching wizard (RLS: active + tenant). */
export type ActiveCatalogSearchRow = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  category_name: string | null;
};

function escapeIlikeToken(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ").trim();
}

function categoryJoinName(r: Record<string, unknown>): string | null {
  const c = r.categories as { name: string } | { name: string }[] | null;
  if (Array.isArray(c)) return c[0]?.name ?? null;
  return c?.name ?? null;
}

function relevanceScore(row: ActiveCatalogSearchRow, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const terms = q.split(/\s+/).filter((t) => t.length > 0);
  if (terms.length === 0) return 0;
  const fields = [row.title, row.brand, row.model, row.slug].map((s) => (s ?? "").toLowerCase());
  let score = 0;
  for (const t of terms) {
    for (const f of fields) {
      if (!f) continue;
      if (f === t) score += 12;
      else if (f.startsWith(t)) score += 8;
      else if (f.includes(t)) score += 4;
    }
  }
  return score;
}

/**
 * Active catalog search for offer attach / merchant resolution wizard (tenant-scoped, `state = active` only).
 * Results ranked by simple deterministic relevance (title / brand / model / slug), not fuzzy auto-create.
 */
export async function searchActiveProductsForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  opts: { categoryId?: string; q?: string; limit?: number },
): Promise<ActiveCatalogSearchRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 80);
  let q = supabase
    .from("products")
    .select("id, title, slug, brand, model, category_id, categories ( name )")
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .order("title", { ascending: true })
    .limit(limit);

  if (opts.categoryId) {
    q = q.eq("category_id", opts.categoryId);
  }

  const term = opts.q?.trim() ?? "";
  if (term.length > 0) {
    const safe = escapeIlikeToken(term);
    const pattern = `%${safe}%`;
    q = q.or(`title.ilike.${pattern},slug.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern}`);
  }

  const { data, error } = await q;
  if (error || !data) {
    return [];
  }
  const rows = (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    category_id: (r.category_id as string | null) ?? null,
    category_name: categoryJoinName(r),
  }));

  const query = opts.q?.trim() ?? "";
  return [...rows].sort((a, b) => {
    const diff = relevanceScore(b, query) - relevanceScore(a, query);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "el");
  });
}

/** Active catalog products (RLS: authenticated read for active rows). */
export async function listActiveProductOptions(supabase: SupabaseClient): Promise<ProductOptionRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, slug")
    .eq("state", "active")
    .order("title", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as ProductOptionRow[];
}

/** Active catalog rows for a tenant (listings must reference same-tenant `products`). */
export async function listActiveProductsForTenant(supabase: SupabaseClient, tenantId: string): Promise<ProductOptionRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, slug")
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .order("title", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as ProductOptionRow[];
}

export type CatalogProductPublicRow = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  model: string | null;
};

export async function fetchActiveProductBySlugForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  slug: string,
): Promise<CatalogProductPublicRow | null> {
  return withMarketTiming("catalog_product", async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, title, slug, brand, model")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("state", "active")
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as CatalogProductPublicRow;
  });
}

export type CatalogProductListingRow = CatalogProductPublicRow;

const DEFAULT_CATEGORY_PRODUCTS_LIMIT = 48;

const BRAND_FACET_ROW_CAP = 500;

export type CategoryLeafListQuery = {
  brand: string | null;
  sort: "newest" | "title_asc";
  page: number;
  pageSize: number;
};

export type FetchCategoryProductsOptions = {
  /** Max rows (cap only; single batched select). Default 48. */
  limit?: number;
};

async function selectActiveProductsByCategoryId(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
  limit: number,
): Promise<CatalogProductListingRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, slug, brand, model")
    .eq("tenant_id", tenantId)
    .eq("category_id", categoryId)
    .eq("state", "active")
    .order("title", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CatalogProductListingRow[];
}

export type CategoryLeafProductPage = {
  rows: CatalogProductListingRow[];
  hasMore: boolean;
};

async function selectActiveProductsByCategoryLeafPage(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
  q: CategoryLeafListQuery,
): Promise<CategoryLeafProductPage> {
  const from = (q.page - 1) * q.pageSize;
  const to = from + q.pageSize; /* fetch pageSize + 1 for hasMore */

  let qb = supabase
    .from("products")
    .select("id, title, slug, brand, model")
    .eq("tenant_id", tenantId)
    .eq("category_id", categoryId)
    .eq("state", "active");

  if (q.brand) {
    qb = qb.eq("brand", q.brand);
  }

  if (q.sort === "title_asc") {
    qb = qb.order("title", { ascending: true });
  } else {
    qb = qb.order("created_at", { ascending: false });
  }

  const { data, error } = await qb.range(from, to);

  if (error) throw error;
  const list = (data ?? []) as CatalogProductListingRow[];
  const hasMore = list.length > q.pageSize;
  const rows = hasMore ? list.slice(0, q.pageSize) : list;
  return { rows, hasMore };
}

/** Distinct brand labels for sidebar (same tenant/category/active scope); capped fetch + in-memory uniq. */
export async function fetchDistinctBrandsForLeafCategory(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
): Promise<string[]> {
  return withMarketTiming("brands_query", async () => {
    const { data, error } = await supabase
      .from("products")
      .select("brand")
      .eq("tenant_id", tenantId)
      .eq("category_id", categoryId)
      .eq("state", "active")
      .not("brand", "is", null)
      .limit(BRAND_FACET_ROW_CAP);

    if (error) throw error;
    const raw = (data ?? []) as { brand: string | null }[];
    const uniq = new Set<string>();
    for (const row of raw) {
      const b = row.brand?.trim();
      if (b) uniq.add(b);
    }
    return [...uniq].sort((a, b) => a.localeCompare(b, "el"));
  });
}

/**
 * Active products whose `category_id` matches a **public-visible** category
 * (active + full active ancestor chain). One category resolution + one products query.
 */
export async function fetchProductsByCategoryId(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
  options?: FetchCategoryProductsOptions,
): Promise<CatalogProductListingRow[]> {
  const category = await fetchPublicCategoryByIdWithActiveChain(supabase, tenantId, categoryId);
  if (!category) return [];

  const limit = options?.limit ?? DEFAULT_CATEGORY_PRODUCTS_LIMIT;
  return selectActiveProductsByCategoryId(supabase, tenantId, category.id, limit);
}

/** Same as `fetchProductsByCategoryId` after resolving the category by slug. */
export async function fetchProductsByCategorySlug(
  supabase: SupabaseClient,
  tenantId: string,
  categorySlug: string,
  options?: FetchCategoryProductsOptions,
): Promise<CatalogProductListingRow[]> {
  const category = await fetchPublicCategoryBySlugWithActiveChain(supabase, tenantId, categorySlug);
  if (!category) return [];

  const limit = options?.limit ?? DEFAULT_CATEGORY_PRODUCTS_LIMIT;
  return selectActiveProductsByCategoryId(supabase, tenantId, category.id, limit);
}

/**
 * Products for a category row **already** returned from
 * `fetchPublicCategoryBySlugWithActiveChain` or `fetchPublicCategoryByIdWithActiveChain`.
 * Skips a second chain walk — use on category pages after a single category resolve.
 */
export async function fetchProductsForResolvedPublicCategory(
  supabase: SupabaseClient,
  tenantId: string,
  category: Pick<CategoryDbRow, "id" | "tenant_id">,
  options?: FetchCategoryProductsOptions,
): Promise<CatalogProductListingRow[]> {
  if (category.tenant_id !== tenantId) return [];

  const limit = options?.limit ?? DEFAULT_CATEGORY_PRODUCTS_LIMIT;
  return selectActiveProductsByCategoryId(supabase, tenantId, category.id, limit);
}

/** Leaf listing with hasMore (single products query with range + over-fetch). */
export async function fetchLeafCategoryProductPage(
  supabase: SupabaseClient,
  tenantId: string,
  category: Pick<CategoryDbRow, "id" | "tenant_id">,
  leafList: CategoryLeafListQuery,
): Promise<CategoryLeafProductPage> {
  if (category.tenant_id !== tenantId) return { rows: [], hasMore: false };
  return withMarketTiming("products_page", async () =>
    selectActiveProductsByCategoryLeafPage(supabase, tenantId, category.id, leafList),
  );
}
