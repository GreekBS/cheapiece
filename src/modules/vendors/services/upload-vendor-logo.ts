import type { SupabaseClient } from "@supabase/supabase-js";

export const VENDOR_LOGOS_BUCKET = "vendor-logos";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const PUBLIC_BUCKET_PATH_MARKER = `/storage/v1/object/public/${VENDOR_LOGOS_BUCKET}/`;

export function validateVendorLogoFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return "Επιτρέπονται μόνο PNG, JPEG ή WebP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Το λογότυπο πρέπει να είναι έως 2 MB.";
  }
  if (file.size === 0) {
    return "Το αρχείο είναι κενό.";
  }
  return null;
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function buildVendorLogoStoragePath(tenantId: string, vendorId: string, ext: string): string {
  return `${tenantId}/vendors/${vendorId}/logo.${ext}`;
}

/** Extract object path from a Supabase public URL in vendor-logos bucket. */
export function storagePathFromVendorLogoPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl?.trim()) return null;
  try {
    const u = new URL(publicUrl.trim());
    const idx = u.pathname.indexOf(PUBLIC_BUCKET_PATH_MARKER);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + PUBLIC_BUCKET_PATH_MARKER.length));
  } catch {
    return null;
  }
}

export async function deleteVendorLogoFromStorageBestEffort(
  supabase: SupabaseClient,
  publicUrl: string | null | undefined,
): Promise<void> {
  const path = storagePathFromVendorLogoPublicUrl(publicUrl);
  if (!path) return;
  await supabase.storage.from(VENDOR_LOGOS_BUCKET).remove([path]);
}

export async function uploadVendorLogo(
  supabase: SupabaseClient,
  tenantId: string,
  vendorId: string,
  file: File,
): Promise<{ publicUrl: string; storagePath: string }> {
  const validation = validateVendorLogoFile(file);
  if (validation) {
    throw new Error(validation);
  }

  const ext = extensionFromFile(file);
  const storagePath = buildVendorLogoStoragePath(tenantId, vendorId, ext);

  const { error: uploadErr } = await supabase.storage
    .from(VENDOR_LOGOS_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadErr) {
    throw uploadErr;
  }

  const { data: pub } = supabase.storage.from(VENDOR_LOGOS_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: pub.publicUrl, storagePath };
}
