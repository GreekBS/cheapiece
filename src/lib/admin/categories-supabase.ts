import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryNode } from "./category-tree-model";
import { slugifyCategoryName } from "./category-slug";

export const DEFAULT_DEV_TENANT_ID = "11111111-1111-4111-8111-111111111111";

/** Default root categories for marketplace admin (display names; slugs generated via slugify on insert). */
export const DEFAULT_MARKETPLACE_ROOT_CATEGORY_NAMES_EL = [
  "Τεχνολογία",
  "Μόδα",
  "Υγεία - Ομορφιά",
  "Οικιακές Συσκευές",
  "Σπίτι - Διακόσμηση",
  "Αθλητισμός - Ψυχαγωγία",
  "Κήπος - Εργαλεία",
  "Παιδικά - Βρεφικά",
  "Auto - Moto",
  "Κατοικίδια",
  "Βιβλία",
] as const;

export type CategoryDbRow = {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  level: number;
  emoji: string | null;
  state: string;
  created_by: string | null;
};

export type TenantContext = {
  tenantId: string;
  userId: string;
  isPlatformAdmin: boolean;
};

export async function loadTenantContext(supabase: SupabaseClient): Promise<TenantContext | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: prof, error } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).maybeSingle();
  if (error || !prof) return null;

  const isPlatformAdmin = prof.role === "platform_admin";
  const tenantId = prof.tenant_id;
  if (!tenantId) return null;

  return { tenantId, userId: user.id, isPlatformAdmin };
}

export function rowsToCategoryTree(rows: CategoryDbRow[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      name: r.name,
      order: r.sort_order,
      level: r.level,
      imageDataUrl: r.image_url,
      emoji: r.emoji,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parent_id == null) {
      roots.push(node);
    } else {
      const p = map.get(r.parent_id);
      if (p) p.children.push(node);
      else roots.push(node);
    }
  }
  const sortKids = (n: CategoryNode) => {
    n.children.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)));
    n.children.forEach(sortKids);
  };
  roots.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)));
  roots.forEach(sortKids);
  return roots;
}

/** Active + archived rows for admin tree (excludes soft-deleted). */
export async function fetchCategoryTree(supabase: SupabaseClient, tenantId: string): Promise<CategoryDbRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("state", ["active", "archived"])
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryDbRow[];
}

/** All lifecycle states (e.g. soft-delete cascade). */
export async function fetchCategoryRowsAllStates(supabase: SupabaseClient, tenantId: string): Promise<CategoryDbRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryDbRow[];
}

export async function uploadCategoryImage(
  supabase: SupabaseClient,
  tenantId: string,
  categoryId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const safe = ext && ext.length <= 5 ? ext : "jpg";
  const path = `${tenantId}/${categoryId}.${safe}`;
  const { error: upErr } = await supabase.storage.from("category-images").upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("category-images").getPublicUrl(path);
  return pub.publicUrl;
}

async function insertCategoryRow(
  supabase: SupabaseClient,
  ctx: TenantContext,
  input: {
    parentId: string | null;
    name: string;
    sortOrder: number;
    level: number;
    emoji: string | null;
    imageUrl: string | null;
  }
): Promise<string> {
  const slug = slugifyCategoryName(input.name, globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`);
  const { data, error } = await supabase
    .from("categories")
    .insert({
      tenant_id: ctx.tenantId,
      parent_id: input.parentId,
      name: input.name.trim(),
      slug,
      sort_order: input.sortOrder,
      level: input.level,
      emoji: input.emoji,
      image_url: input.imageUrl,
      state: "active",
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

export async function createCategoryRemote(
  supabase: SupabaseClient,
  ctx: TenantContext,
  input: { parentId: string | null; name: string; sortOrder: number; level: number; emoji: string | null; imageFile: File | null }
): Promise<string> {
  let imageUrl: string | null = null;
  const id = await insertCategoryRow(supabase, ctx, {
    parentId: input.parentId,
    name: input.name,
    sortOrder: input.sortOrder,
    level: input.level,
    emoji: input.emoji,
    imageUrl: null,
  });
  if (input.imageFile) {
    imageUrl = await uploadCategoryImage(supabase, ctx.tenantId, id, input.imageFile);
    const { error } = await supabase.from("categories").update({ image_url: imageUrl }).eq("id", id);
    if (error) throw error;
  }
  return id;
}

/**
 * Idempotent: inserts each root category only if no root (`parent_id` null) with the same trimmed name exists for the tenant.
 * Uses the same paths as manual create (`state`, `tenant_id`, slug via slugifyCategoryName).
 */
export async function ensureDefaultMarketplaceRootCategories(
  supabase: SupabaseClient,
  ctx: TenantContext,
): Promise<{ created: number; skipped: number }> {
  const rows = await fetchCategoryTree(supabase, ctx.tenantId);
  const roots = rows.filter((r) => r.parent_id == null);
  const rootNames = new Set(roots.map((r) => r.name.trim()));
  let maxOrder = roots.length ? Math.max(...roots.map((r) => r.sort_order)) : 0;

  let created = 0;
  let skipped = 0;

  for (const rawName of DEFAULT_MARKETPLACE_ROOT_CATEGORY_NAMES_EL) {
    const trimmed = rawName.trim();
    if (rootNames.has(trimmed)) {
      skipped++;
      continue;
    }
    maxOrder += 1;
    await createCategoryRemote(supabase, ctx, {
      parentId: null,
      name: trimmed,
      sortOrder: maxOrder,
      level: 0,
      emoji: "📂",
      imageFile: null,
    });
    rootNames.add(trimmed);
    created++;
  }

  return { created, skipped };
}

export async function updateCategoryRemote(
  supabase: SupabaseClient,
  ctx: TenantContext,
  id: string,
  input: { name: string; sortOrder: number; imageFile: File | null; currentImageUrl: string | null }
): Promise<void> {
  const rows = await fetchCategoryTree(supabase, ctx.tenantId);
  const self = rows.find((r) => r.id === id);
  if (!self) throw new Error("Category not found");

  const sibling = rows.find((r) => r.parent_id === self.parent_id && r.id !== id && r.sort_order === input.sortOrder);
  if (sibling) {
    const a = self.sort_order;
    const b = sibling.sort_order;
    const { error: e1 } = await supabase.from("categories").update({ sort_order: b }).eq("id", self.id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("categories").update({ sort_order: a }).eq("id", sibling.id);
    if (e2) throw e2;
  }

  let imageUrl: string | null = input.currentImageUrl;
  if (input.imageFile) {
    imageUrl = await uploadCategoryImage(supabase, ctx.tenantId, id, input.imageFile);
  }
  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name.trim(),
      sort_order: input.sortOrder,
      image_url: imageUrl,
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Soft-delete: marks subtree (node + descendants) as `state = 'deleted'`.
 * No row DELETE — preserves FK integrity and history.
 */
export async function deleteCategoryRemote(supabase: SupabaseClient, ctx: TenantContext, id: string): Promise<void> {
  const rows = await fetchCategoryRowsAllStates(supabase, ctx.tenantId);
  const childrenByParent = new Map<string | null, string[]>();
  for (const r of rows) {
    const pid = r.parent_id;
    if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
    childrenByParent.get(pid)!.push(r.id);
  }
  const toMark = new Set<string>();
  const walk = (rid: string) => {
    toMark.add(rid);
    for (const c of childrenByParent.get(rid) ?? []) walk(c);
  };
  walk(id);
  for (const rid of toMark) {
    const { error } = await supabase.from("categories").update({ state: "deleted" }).eq("id", rid).eq("tenant_id", ctx.tenantId);
    if (error) throw error;
  }
}
