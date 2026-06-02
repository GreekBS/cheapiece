/**
 * Admin catalog — `products` table only for writes.
 *
 * EXECUTION CONSTRAINTS (do not violate without explicit review):
 * - Writes: `public.products` only (insert/update). No DELETE (RLS + FK).
 * - Do not alter merchant listing modules; they own `store_products` writes.
 * - Do not import or extend `src/modules/catalog/queries/product-queries.ts` here.
 * - List paths are pagination-first: every list uses limit + offset (Supabase `.range`).
 * - No parallel “catalog layer” — this file is the single admin boundary for product rows.
 *
 * Reads from `store_products` are isolated to `fetchOfferCountsByProductIds` (display-only
 * aggregates for the admin list). No writes to `store_products`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { slugifyCategoryName } from "@/lib/admin/category-slug";
import type { TenantContext } from "@/lib/admin/categories-supabase";
import type { ProductAdminDetail, ProductAdminListRow, ProductsAdminListParams } from "@/lib/admin/products-admin-types";

const LIST_SELECT = `
  id,
  tenant_id,
  category_id,
  title,
  brand,
  model,
  slug,
  state,
  created_at,
  updated_at,
  categories ( name )
`;

function escapeIlikeToken(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ").trim();
}

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(Math.floor(raw), 100);
}

function clampOffset(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

type CategoryJoin = { name: string } | { name: string }[] | null;

function rowFromDb(r: Record<string, unknown>): ProductAdminListRow {
  const cat = r.categories as CategoryJoin;
  const name = Array.isArray(cat) ? (cat[0]?.name ?? null) : cat?.name ?? null;
  return {
    id: r.id as string,
    tenant_id: r.tenant_id as string,
    category_id: (r.category_id as string | null) ?? null,
    title: r.title as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    slug: r.slug as string,
    state: r.state as ProductAdminListRow["state"],
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    category_name: name,
  };
}

/**
 * Paginated list — always applies `.range(offset, offset + limit - 1)`.
 * Query pattern: `products` root, `eq(tenant_id)`, optional `eq(state)`, optional `eq(category_id)`,
 * optional `or(...ilike...)` on title/slug/brand/model, `order(updated_at desc)`, `count: exact`.
 */
export async function fetchProductsAdminPage(
  supabase: SupabaseClient,
  tenantId: string,
  params: ProductsAdminListParams,
): Promise<{ rows: ProductAdminListRow[]; total: number | null }> {
  const limit = clampLimit(params.limit);
  const offset = clampOffset(params.offset);
  const end = offset + limit - 1;

  let q = supabase
    .from("products")
    .select(LIST_SELECT, { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, end);

  if (params.state && params.state !== "all") {
    q = q.eq("state", params.state);
  }
  if (params.categoryId) {
    q = q.eq("category_id", params.categoryId);
  }

  const term = params.search?.trim() ?? "";
  if (term.length > 0) {
    const safe = escapeIlikeToken(term);
    const pattern = `%${safe}%`;
    q = q.or(`title.ilike.${pattern},slug.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern}`);
  }

  const { data, error, count } = await q;
  if (error || !data) {
    return { rows: [], total: null };
  }
  return { rows: (data as Record<string, unknown>[]).map(rowFromDb), total: count ?? null };
}

/** Single-row read — `products` only. */
export async function fetchProductAdminById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<ProductAdminDetail | null> {
  const { data, error } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowFromDb(data as Record<string, unknown>);
}

export type ProductAdminInsertInput = {
  title: string;
  brand: string | null;
  model: string | null;
  slug: string | null;
  categoryId: string | null;
  state?: ProductAdminListRow["state"];
};

/** Insert — `products` only. */
export async function insertProductAdmin(
  supabase: SupabaseClient,
  ctx: TenantContext,
  input: ProductAdminInsertInput,
): Promise<{ id: string }> {
  const fallback = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  const slug = (input.slug?.trim() || slugifyCategoryName(input.title, fallback)).trim();
  const { data, error } = await supabase
    .from("products")
    .insert({
      tenant_id: ctx.tenantId,
      title: input.title.trim(),
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      slug,
      category_id: input.categoryId,
      state: input.state ?? "draft",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data!.id as string };
}

export type ProductAdminUpdateInput = {
  title: string;
  brand: string | null;
  model: string | null;
  slug: string;
  categoryId: string | null;
  state: ProductAdminListRow["state"];
};

/** Update — `products` only. */
export async function updateProductAdmin(
  supabase: SupabaseClient,
  ctx: TenantContext,
  id: string,
  input: ProductAdminUpdateInput,
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({
      title: input.title.trim(),
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      slug: input.slug.trim(),
      category_id: input.categoryId,
      state: input.state,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw error;
}

/**
 * Read-only aggregate for UI — `store_products` SELECT only, scoped by tenant.
 * Query pattern: `select('product_id').eq('tenant_id').in('product_id', ids)` then count in memory.
 * Not used for writes; kept separate from marketplace discovery services.
 */
export async function fetchOfferCountsByProductIds(
  supabase: SupabaseClient,
  tenantId: string,
  productIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabase
    .from("store_products")
    .select("product_id")
    .eq("tenant_id", tenantId)
    .in("product_id", productIds);

  if (error || !data) return map;
  for (const row of data as { product_id: string }[]) {
    const id = row.product_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}
