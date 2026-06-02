import type { SupabaseClient } from "@supabase/supabase-js";

import marketplaceTaxonomyV1 from "../../../taxonomy/marketplace-taxonomy.v1.json";
import { isStableTaxonomySlug, transliterateSlugSegment } from "./taxonomy-slug";
import type { TenantContext } from "./categories-supabase";

type TaxonomyJsonNode = {
  name: string;
  slug: string;
  sortOrder: number;
  emoji?: string | null;
  children?: TaxonomyJsonNode[];
};

type TaxonomyDocument = {
  schemaVersion: string;
  taxonomyVersion: string;
  catalog: string;
  defaultTenantId: string;
  roots: TaxonomyJsonNode[];
};

const doc = marketplaceTaxonomyV1 as TaxonomyDocument;

function assertDocumentShape(): void {
  if (doc.schemaVersion !== "1.0") {
    throw new Error(`taxonomy: unsupported schemaVersion ${doc.schemaVersion}`);
  }
  if (!Array.isArray(doc.roots) || doc.roots.length === 0) {
    throw new Error("taxonomy: roots[] is required");
  }
}

function resolveSlug(node: TaxonomyJsonNode): string {
  if (isStableTaxonomySlug(node.slug)) {
    return node.slug;
  }
  return transliterateSlugSegment(node.name);
}

async function categoryIdBySlug(
  supabase: SupabaseClient,
  tenantId: string,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .in("state", ["active", "archived"])
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

async function insertIfMissing(
  supabase: SupabaseClient,
  ctx: TenantContext,
  input: {
    parentId: string | null;
    name: string;
    slug: string;
    sortOrder: number;
    level: number;
    emoji: string | null;
  }
): Promise<{ id: string; inserted: boolean }> {
  const existing = await categoryIdBySlug(supabase, ctx.tenantId, input.slug);
  if (existing) return { id: existing, inserted: false };

  const { data, error } = await supabase
    .from("categories")
    .insert({
      tenant_id: ctx.tenantId,
      parent_id: input.parentId,
      name: input.name.trim(),
      slug: input.slug,
      sort_order: input.sortOrder,
      level: input.level,
      emoji: input.emoji,
      image_url: null,
      state: "active",
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      const id = await categoryIdBySlug(supabase, ctx.tenantId, input.slug);
      if (id) return { id, inserted: false };
    }
    throw error;
  }

  return { id: data!.id as string, inserted: true };
}

async function syncNodeRecursive(
  supabase: SupabaseClient,
  ctx: TenantContext,
  parentId: string | null,
  level: number,
  node: TaxonomyJsonNode,
  counters: { inserted: number; skipped: number }
): Promise<void> {
  const slug = resolveSlug(node);
  if (!isStableTaxonomySlug(slug)) {
    throw new Error(`taxonomy: invalid slug for "${node.name}": ${slug}`);
  }

  const row = await insertIfMissing(supabase, ctx, {
    parentId,
    name: node.name,
    slug,
    sortOrder: node.sortOrder,
    level,
    emoji: level === 0 ? (node.emoji ?? null) : null,
  });
  if (row.inserted) counters.inserted += 1;
  else counters.skipped += 1;

  const children = node.children ?? [];
  for (const ch of children) {
    await syncNodeRecursive(supabase, ctx, row.id, level + 1, ch, counters);
  }
}

/**
 * Idempotent upsert of official marketplace taxonomy into `public.categories`.
 * Inserts only missing `(tenant_id, slug)` rows; never deletes or updates existing rows.
 */
export async function syncMarketplaceTaxonomyFromDocument(
  supabase: SupabaseClient,
  ctx: TenantContext
): Promise<{ inserted: number; skipped: number; taxonomyVersion: string }> {
  assertDocumentShape();
  if (ctx.tenantId !== doc.defaultTenantId) {
    throw new Error(
      `taxonomy sync: profile tenant ${ctx.tenantId} does not match taxonomy defaultTenantId ${doc.defaultTenantId}. Add a tenant-specific taxonomy file or align profile tenant.`
    );
  }

  const counters = { inserted: 0, skipped: 0 };
  for (const root of doc.roots) {
    await syncNodeRecursive(supabase, ctx, null, 0, root, counters);
  }

  return { ...counters, taxonomyVersion: doc.taxonomyVersion };
}
