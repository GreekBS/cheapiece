import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Marketplace product images — reads `product_images` + server-side signed URLs only.
 *
 * RLS note: anonymous shoppers need anon SELECT policies on `product_images` and
 * `product-images` storage (active products). Until that migration is applied, calls
 * return empty maps / arrays and UI shows placeholders.
 */

const PRODUCT_IMAGES_BUCKET = "product-images";
const SIGNED_URL_TTL_SEC = 60 * 60;

type ImageRow = {
  product_id: string;
  storage_path: string;
  sort_order: number;
  is_primary: boolean;
};

export type PublicProductGalleryImage = {
  url: string;
  sortOrder: number;
};

async function resolveSupabase(supabase?: SupabaseClient): Promise<SupabaseClient> {
  return supabase ?? (await createServerSupabaseClient());
}

/** Only this module signs product image storage paths for the public marketplace. */
async function signStoragePaths(
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

function pickListThumbnailRow(rows: ImageRow[]): ImageRow | null {
  if (rows.length === 0) return null;
  const primary = rows.find((r) => r.is_primary);
  if (primary) return primary;
  return rows.reduce((best, row) => (row.sort_order < best.sort_order ? row : best));
}

function groupRowsByProductId(rows: ImageRow[]): Map<string, ImageRow[]> {
  const byProduct = new Map<string, ImageRow[]>();
  for (const row of rows) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }
  return byProduct;
}

/**
 * Batch list thumbnails: one DB query, in-memory primary / sort_order fallback, one sign batch.
 */
export async function getPrimaryImagesMap(
  tenantId: string,
  productIds: string[],
  supabase?: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!tenantId || productIds.length === 0) return map;

  const sb = await resolveSupabase(supabase);
  const { data, error } = await sb
    .from("product_images")
    .select("product_id, storage_path, sort_order, is_primary")
    .eq("tenant_id", tenantId)
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return map;

  const rows = data as ImageRow[];
  const byProduct = groupRowsByProductId(rows);
  const chosen: { productId: string; storage_path: string }[] = [];

  for (const productId of productIds) {
    const pick = pickListThumbnailRow(byProduct.get(productId) ?? []);
    if (pick) {
      chosen.push({ productId, storage_path: pick.storage_path });
    }
  }

  if (chosen.length === 0) return map;

  const signedByPath = await signStoragePaths(
    sb,
    chosen.map((c) => c.storage_path),
  );

  for (const { productId, storage_path } of chosen) {
    const url = signedByPath.get(storage_path);
    if (url) map.set(productId, url);
  }

  return map;
}

/**
 * PDP gallery (max 5 rows per product in DB). Always resolved on each PDP request.
 */
export async function getProductGallery(
  tenantId: string,
  productId: string,
  supabase?: SupabaseClient,
): Promise<PublicProductGalleryImage[]> {
  if (!tenantId || !productId) return [];

  const sb = await resolveSupabase(supabase);
  const { data, error } = await sb
    .from("product_images")
    .select("storage_path, sort_order")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) return [];

  const rows = data as { storage_path: string; sort_order: number }[];
  const signedByPath = await signStoragePaths(
    sb,
    rows.map((r) => r.storage_path),
  );

  const gallery: PublicProductGalleryImage[] = [];
  for (const row of rows) {
    const url = signedByPath.get(row.storage_path);
    if (url) {
      gallery.push({ url, sortOrder: row.sort_order });
    }
  }
  return gallery;
}

/** Primary URL for PDP: is_primary row, else lowest sort_order (from gallery query). */
export async function getProductGalleryWithPrimary(
  tenantId: string,
  productId: string,
  supabase?: SupabaseClient,
): Promise<{ primaryImageUrl: string | null; galleryImages: PublicProductGalleryImage[] }> {
  if (!tenantId || !productId) {
    return { primaryImageUrl: null, galleryImages: [] };
  }

  const sb = await resolveSupabase(supabase);
  const { data, error } = await sb
    .from("product_images")
    .select("storage_path, sort_order, is_primary")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return { primaryImageUrl: null, galleryImages: [] };
  }

  const rows = data as ImageRow[];
  const signedByPath = await signStoragePaths(
    sb,
    rows.map((r) => r.storage_path),
  );

  const gallery: PublicProductGalleryImage[] = [];
  let primaryImageUrl: string | null = null;
  const primaryRow = rows.find((r) => r.is_primary) ?? rows[0] ?? null;

  for (const row of rows) {
    const url = signedByPath.get(row.storage_path);
    if (!url) continue;
    gallery.push({ url, sortOrder: row.sort_order });
    if (primaryRow && row.storage_path === primaryRow.storage_path) {
      primaryImageUrl = url;
    }
  }

  if (!primaryImageUrl && gallery.length > 0) {
    primaryImageUrl = gallery[0]!.url;
  }

  return { primaryImageUrl, galleryImages: gallery };
}
