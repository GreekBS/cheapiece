import type { SupabaseClient } from "@supabase/supabase-js";

const FALLBACK = "Marketplace Seller";

export type VendorDisplayProfile = {
  name: string;
  logoUrl: string | null;
};

/**
 * Batch-resolve vendor display profiles using the same session + RLS as the caller.
 * Missing rows → omitted (callers use fallback label).
 */
export async function resolveVendorDisplayProfiles(
  db: SupabaseClient,
  vendorIds: string[],
): Promise<Map<string, VendorDisplayProfile>> {
  const unique = [...new Set(vendorIds)].filter(Boolean);
  const map = new Map<string, VendorDisplayProfile>();
  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await db.from("vendors").select("id, name, logo_url").in("id", unique);

  if (error || !data) {
    return map;
  }

  for (const row of data as { id: string; name: string; logo_url?: string | null }[]) {
    if (!row.id) continue;
    map.set(row.id, {
      name: row.name ? String(row.name) : FALLBACK,
      logoUrl: row.logo_url?.trim() ? String(row.logo_url) : null,
    });
  }
  return map;
}

/**
 * Batch-resolve vendor display names using the same session + RLS as the caller.
 * Missing rows → fallback label (no raw vendor leakage).
 */
export async function resolveVendorDisplayNames(
  db: SupabaseClient,
  vendorIds: string[],
): Promise<Map<string, string>> {
  const profiles = await resolveVendorDisplayProfiles(db, vendorIds);
  const map = new Map<string, string>();
  for (const [id, profile] of profiles) {
    map.set(id, profile.name);
  }
  return map;
}

export function pickVendorDisplayProfile(
  vendorId: string,
  resolved: Map<string, VendorDisplayProfile>,
): VendorDisplayProfile {
  return (
    resolved.get(vendorId) ?? {
      name: FALLBACK,
      logoUrl: null,
    }
  );
}

export function pickVendorDisplayName(vendorId: string, resolved: Map<string, string>): string {
  return resolved.get(vendorId) ?? FALLBACK;
}
