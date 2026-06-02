import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategorySchemaVersionSummary } from "../persistence/types";

/** Default marketplace tenant from SaaS bootstrap migration. */
export const DEFAULT_TENANT_ID = "11111111-1111-4111-8111-111111111111";

export async function resolveAdminTenantId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.tenant_id ?? DEFAULT_TENANT_ID;
}

export type CategoryWithSchemaStatus = {
  id: string;
  name: string;
  slug: string;
  path: string;
  publishedVersion: number | null;
  publishedSchemaId: string | null;
  draftVersion: number | null;
};

export async function listCategoriesWithSchemaStatus(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<CategoryWithSchemaStatus[]> {
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, slug, path")
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .order("path");
  if (catError) throw catError;

  const { data: versions, error: verError } = await supabase
    .from("category_schema_versions")
    .select("id, category_id, version, state")
    .eq("tenant_id", tenantId)
    .in("state", ["published", "draft"]);
  if (verError) throw verError;

  const byCategory = new Map<string, { published?: { id: string; version: number }; draft?: { version: number } }>();
  for (const v of versions ?? []) {
    const entry = byCategory.get(v.category_id) ?? {};
    if (v.state === "published") entry.published = { id: v.id, version: v.version };
    if (v.state === "draft") entry.draft = { version: v.version };
    byCategory.set(v.category_id, entry);
  }

  return (categories ?? []).map((c) => {
    const s = byCategory.get(c.id);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      path: c.path,
      publishedVersion: s?.published?.version ?? null,
      publishedSchemaId: s?.published?.id ?? null,
      draftVersion: s?.draft?.version ?? null,
    };
  });
}

export async function listSchemaVersionsForCategory(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
): Promise<CategorySchemaVersionSummary[]> {
  const { data, error } = await supabase
    .from("category_schema_versions")
    .select("id, category_id, version, state, published_at, locale, category_path")
    .eq("tenant_id", tenantId)
    .eq("category_id", categoryId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((v) => ({
    id: v.id,
    categoryId: v.category_id,
    version: v.version,
    state: v.state,
    publishedAt: v.published_at,
    locale: v.locale,
    categoryPath: v.category_path,
  }));
}
