"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { invalidateCategoryMarketplaceCaches } from "@/modules/catalog-products-read/ui/server/invalidate-category-marketplace-caches";
import { resolveAdminTenantId } from "@/modules/catalog-schema/queries/catalog-schema-admin-queries";
import { SupabaseSchemaRepository } from "@/modules/catalog-schema/persistence/supabase-schema-repository";
import { recordToCategorySchemaSeed } from "@/modules/catalog-schema/persistence/mappers";
import {
  getDiffDraftVsPublished,
  getPreviewForDraft,
  loadEditorInitial,
  publishDraft,
  saveDraftBindings,
} from "@/modules/catalog-schema/services/admin-schema-service";
import type {
  DiffResultDto,
  PreviewResultDto,
  PublishDraftInputDto,
  PublishDraftResultDto,
  SaveDraftInputDto,
  SaveDraftResultDto,
  SchemaEditorInitialDto,
} from "@/modules/catalog-schema/types/admin-dtos";
import type { CategorySchemaFieldBinding } from "@/modules/catalog-schema/types/schema-field";

async function adminCtx() {
  const { supabase, user } = await requirePlatformAdmin();
  const tenantId = await resolveAdminTenantId(supabase, user.id);
  if (!tenantId) {
    throw new Error("Admin tenant not configured");
  }
  return {
    tenantId,
    actorUserId: user.id,
    repo: new SupabaseSchemaRepository(supabase),
  };
}

export async function loadSchemaEditorAction(categoryId: string): Promise<SchemaEditorInitialDto | null> {
  const { supabase, user } = await requirePlatformAdmin();
  const tenantId = await resolveAdminTenantId(supabase, user.id);
  if (!tenantId) return null;

  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug, path")
    .eq("id", categoryId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!category) return null;

  const ctx = await adminCtx();
  return loadEditorInitial(ctx, category);
}

export async function saveSchemaDraftAction(input: SaveDraftInputDto): Promise<SaveDraftResultDto> {
  const ctx = await adminCtx();
  const draft = await ctx.repo.getVersionById(input.versionId);
  if (!draft) return { ok: false, message: "Draft not found" };
  const baseSeed = recordToCategorySchemaSeed(draft);
  const result = await saveDraftBindings(ctx, input, baseSeed);
  revalidatePath(`/admin/catalog-schema/${input.categoryId}`);
  revalidatePath(`/admin/catalog-schema/${input.categoryId}/edit`);
  return result;
}

export async function getSchemaPreviewAction(
  versionId: string,
): Promise<PreviewResultDto | { error: string }> {
  const ctx = await adminCtx();
  const draft = await ctx.repo.getVersionById(versionId);
  if (!draft) return { error: "Draft not found" };
  return getPreviewForDraft(ctx, recordToCategorySchemaSeed(draft));
}

export async function getSchemaDiffAction(
  categoryId: string,
  versionId: string,
): Promise<DiffResultDto | { error: string }> {
  const ctx = await adminCtx();
  const draft = await ctx.repo.getVersionById(versionId);
  if (!draft) return { error: "Draft not found" };
  const result = await getDiffDraftVsPublished(ctx, recordToCategorySchemaSeed(draft), categoryId);
  if (!result) return { error: "Could not compute diff" };
  return result;
}

export async function publishSchemaDraftAction(
  input: PublishDraftInputDto,
): Promise<PublishDraftResultDto> {
  const ctx = await adminCtx();
  const draft = await ctx.repo.getVersionById(input.versionId);
  if (!draft) return { ok: false, message: "Draft not found" };
  const seed = recordToCategorySchemaSeed(draft);
  const result = await publishDraft(ctx, input, seed);
  if (result.ok) {
    // Cache invalidation is post-commit side effect only
    invalidateCategoryMarketplaceCaches({
      tenantId: input.tenantId,
      categoryId: input.categoryId,
    });
  }
  revalidatePath(`/admin/catalog-schema/${input.categoryId}`);
  revalidatePath(`/admin/catalog-schema/${input.categoryId}/edit`);
  revalidatePath("/admin/catalog-schema");
  return result;
}

export type UpdateBindingsInput = {
  bindings: CategorySchemaFieldBinding[];
};
