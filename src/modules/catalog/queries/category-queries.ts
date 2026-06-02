import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryDbRow } from "@/lib/admin/categories-supabase";
import { withMarketTiming } from "@/lib/observability/timing";

const ACTIVE = "active" as const;

/** Returns false if any ancestor is missing, wrong tenant, or not active. */
async function assertFullActiveParentChain(
  supabase: SupabaseClient,
  tenantId: string,
  startParentId: string | null,
): Promise<boolean> {
  let parentId: string | null = startParentId;
  while (parentId != null) {
    const { data: parent, error: pErr } = await supabase
      .from("categories")
      .select("id, parent_id, state, tenant_id")
      .eq("id", parentId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!parent || parent.state !== ACTIVE) return false;
    parentId = parent.parent_id;
  }
  return true;
}

export type PublicCategoryCard = Pick<CategoryDbRow, "id" | "name" | "slug" | "sort_order" | "emoji">;

/** Root categories for the public home (active only, correct tenant). */
export async function fetchPublicRootCategories(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<PublicCategoryCard[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, emoji")
    .eq("tenant_id", tenantId)
    .is("parent_id", null)
    .eq("state", ACTIVE)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PublicCategoryCard[];
}

/**
 * Category visible on the public site iff it is active and every ancestor
 * (up to the root) exists, matches the same tenant, and is active.
 */
export async function fetchPublicCategoryBySlugWithActiveChain(
  supabase: SupabaseClient,
  tenantId: string,
  slug: string,
): Promise<CategoryDbRow | null> {
  return withMarketTiming("category_resolve", async () => {
    const { data: row, error } = await supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("state", ACTIVE)
      .maybeSingle();

    if (error) throw error;
    if (!row) return null;

    if (!(await assertFullActiveParentChain(supabase, tenantId, row.parent_id))) return null;

    return row as CategoryDbRow;
  });
}

/** Same public visibility rule as slug resolution, keyed by category id (for product binding). */
export async function fetchPublicCategoryByIdWithActiveChain(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
): Promise<CategoryDbRow | null> {
  return withMarketTiming("category_resolve", async () => {
    const { data: row, error } = await supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", categoryId)
      .eq("state", ACTIVE)
      .maybeSingle();

    if (error) throw error;
    if (!row) return null;

    if (!(await assertFullActiveParentChain(supabase, tenantId, row.parent_id))) return null;

    return row as CategoryDbRow;
  });
}

/** Direct children only (v1): active rows under a parent that is already public-valid. */
export async function fetchPublicDirectChildCategories(
  supabase: SupabaseClient,
  tenantId: string,
  parentId: string,
): Promise<PublicCategoryCard[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, emoji")
    .eq("tenant_id", tenantId)
    .eq("parent_id", parentId)
    .eq("state", ACTIVE)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PublicCategoryCard[];
}
