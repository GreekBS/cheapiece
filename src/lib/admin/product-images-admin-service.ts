/**
 * Admin product images — `product_images` table + `product-images` Storage bucket.
 * Platform admin only (matches products catalog writes).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { TenantContext } from "@/lib/admin/categories-supabase";

export const MAX_PRODUCT_IMAGES = 5;
export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Private bucket: browser must use signed URLs, not stored public_url. */
const SIGNED_URL_TTL_SEC = 60 * 60;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ProductImageRow = {
  id: string;
  tenant_id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function buildStoragePath(tenantId: string, productId: string, imageId: string, ext: string): string {
  return `${tenantId}/products/${productId}/${imageId}.${ext}`;
}

function mapRow(r: Record<string, unknown>): ProductImageRow {
  return {
    id: r.id as string,
    tenant_id: r.tenant_id as string,
    product_id: r.product_id as string,
    storage_path: r.storage_path as string,
    public_url: r.public_url as string,
    sort_order: r.sort_order as number,
    is_primary: Boolean(r.is_primary),
    created_at: r.created_at as string,
  };
}

export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return "Επιτρέπονται μόνο JPEG, PNG ή WebP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Το αρχείο πρέπει να είναι έως 5 MB.";
  }
  return null;
}

export async function countProductImages(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("product_id", productId);
  if (error) throw error;
  return count ?? 0;
}

export async function listProductImages(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
): Promise<ProductImageRow[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("id, tenant_id, product_id, storage_path, public_url, sort_order, is_primary, created_at")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  return attachSignedDisplayUrls(supabase, rows);
}

/** Batch signed URLs for list thumbnails (private bucket). */
export async function fetchPrimaryImageUrlsByProductIds(
  supabase: SupabaseClient,
  tenantId: string,
  productIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, storage_path")
    .eq("tenant_id", tenantId)
    .in("product_id", productIds)
    .eq("is_primary", true);
  if (error) throw error;
  if (!data?.length) return map;

  const rows = data as { product_id: string; storage_path: string }[];
  const signedByPath = await createSignedUrlsByStoragePaths(
    supabase,
    rows.map((r) => r.storage_path),
  );

  for (const row of rows) {
    const signed = signedByPath.get(row.storage_path);
    if (signed) map.set(row.product_id, signed);
  }
  return map;
}

async function createSignedUrlsByStoragePaths(
  supabase: SupabaseClient,
  storagePaths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(storagePaths.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  await Promise.all(
    unique.map(async (storagePath) => {
      const { data, error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
      if (!error && data?.signedUrl) {
        map.set(storagePath, data.signedUrl);
      }
    }),
  );
  return map;
}

/** Replace public_url with short-lived signed URL for display (DB column unchanged). */
async function attachSignedDisplayUrls(
  supabase: SupabaseClient,
  rows: ProductImageRow[],
): Promise<ProductImageRow[]> {
  if (rows.length === 0) return rows;
  const signedByPath = await createSignedUrlsByStoragePaths(
    supabase,
    rows.map((r) => r.storage_path),
  );
  return rows.map((row) => ({
    ...row,
    public_url: signedByPath.get(row.storage_path) ?? row.public_url,
  }));
}

async function removeStoragePathsBestEffort(supabase: SupabaseClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) {
    console.warn("[product-images] storage remove failed", error.message);
  }
}

/** Rollback path: must not swallow remove failures. */
async function removeStoragePathsStrict(supabase: SupabaseClient, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) {
    throw new Error(`Αποτυχία διαγραφής αρχείου από storage: ${error.message}`);
  }
}

async function deleteProductImageRowById(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  imageId: string,
): Promise<void> {
  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("id", imageId);
  if (error) throw error;
}

/**
 * Clear all primaries then set one row.
 *
 * LIMITATION: two sequential PostgREST updates are not a single DB transaction (no RPC in V1).
 * uq_product_images_one_primary prevents two TRUE rows; callers must await sequentially (no parallel).
 */
export async function setPrimaryImageSafe(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  imageId: string,
): Promise<void> {
  const { data: target, error: fetchErr } = await supabase
    .from("product_images")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("id", imageId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!target) throw new Error("Η εικόνα δεν βρέθηκε.");

  const { error: clearErr } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("tenant_id", tenantId)
    .eq("product_id", productId);
  if (clearErr) throw clearErr;

  const { data, error: setErr } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("id", imageId)
    .select("id")
    .maybeSingle();
  if (setErr) throw setErr;
  if (!data) throw new Error("Η εικόνα δεν βρέθηκε.");
}

async function promoteNextPrimarySafe(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("product_images")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  await setPrimaryImageSafe(supabase, tenantId, productId, (data as { id: string }).id);
}

export type UploadProductImageInput = {
  productId: string;
  file: File;
  sortOrder?: number;
  setAsPrimary?: boolean;
};

/**
 * Upload to Storage then insert DB row.
 * On any failure after upload: delete DB row (if inserted) then strict-remove Storage object.
 */
export async function uploadProductImageWithRollback(
  supabase: SupabaseClient,
  ctx: TenantContext,
  input: UploadProductImageInput,
): Promise<ProductImageRow> {
  const validation = validateProductImageFile(input.file);
  if (validation) throw new Error(validation);

  const tenantId = ctx.tenantId;
  const { productId, file } = input;
  const existingCount = await countProductImages(supabase, tenantId, productId);
  if (existingCount >= MAX_PRODUCT_IMAGES) {
    throw new Error(`Μέγιστο ${MAX_PRODUCT_IMAGES} εικόνες ανά προϊόν.`);
  }

  const imageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  const ext = extensionFromFile(file);
  const storagePath = buildStoragePath(tenantId, productId, imageId, ext);
  const sortOrder = input.sortOrder ?? existingCount;
  const shouldBePrimary = input.setAsPrimary === true || existingCount === 0;

  let storageUploaded = false;
  let insertedRowId: string | null = null;

  const { error: uploadErr } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type });
  if (uploadErr) throw uploadErr;
  storageUploaded = true;

  const { data: pub } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  try {
    const { data, error: insertErr } = await supabase
      .from("product_images")
      .insert({
        tenant_id: tenantId,
        product_id: productId,
        storage_path: storagePath,
        public_url: publicUrl,
        sort_order: sortOrder,
        is_primary: false,
      })
      .select("id, tenant_id, product_id, storage_path, public_url, sort_order, is_primary, created_at")
      .single();
    if (insertErr || !data) throw insertErr ?? new Error("Insert failed");

    const row = mapRow(data as Record<string, unknown>);
    insertedRowId = row.id;

    if (shouldBePrimary) {
      await setPrimaryImageSafe(supabase, tenantId, productId, row.id);
    }

    const [signed] = await attachSignedDisplayUrls(supabase, [
      { ...row, is_primary: shouldBePrimary },
    ]);
    return signed ?? { ...row, is_primary: shouldBePrimary };
  } catch (cause) {
    if (insertedRowId) {
      try {
        await deleteProductImageRowById(supabase, tenantId, productId, insertedRowId);
      } catch (dbCleanupErr) {
        console.error("[product-images] failed to delete row during rollback", dbCleanupErr);
      }
    }
    if (storageUploaded) {
      await removeStoragePathsStrict(supabase, [storagePath]);
    }
    throw cause;
  }
}

export async function deleteProductImageById(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  imageId: string,
): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from("product_images")
    .select("id, storage_path, is_primary")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("id", imageId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) return;

  const row = data as { storage_path: string; is_primary: boolean };
  await removeStoragePathsBestEffort(supabase, [row.storage_path]);

  const { error: delErr } = await supabase
    .from("product_images")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("id", imageId);
  if (delErr) throw delErr;

  if (row.is_primary) {
    await promoteNextPrimarySafe(supabase, tenantId, productId);
  }
}

/** Remove all image objects for a product (call before product delete or after CASCADE). */
export async function deleteProductImagesStorage(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId);
  if (error) throw error;

  const paths = (data ?? []).map((r) => (r as { storage_path: string }).storage_path);
  await removeStoragePathsBestEffort(supabase, paths);

  const prefix = `${tenantId}/products/${productId}`;
  const { data: listed, error: listErr } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).list(prefix);
  if (!listErr && listed?.length) {
    const orphanPaths = listed.map((f) => `${prefix}/${f.name}`);
    await removeStoragePathsBestEffort(supabase, orphanPaths);
  }
}
