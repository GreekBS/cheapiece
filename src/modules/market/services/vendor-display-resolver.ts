import type { SupabaseClient } from "@supabase/supabase-js";

const FALLBACK = "Marketplace Seller";

/**
 * Batch-resolve vendor display names using the same session + RLS as the caller.
 * Missing rows → fallback label (no raw vendor leakage).
 */
export async function resolveVendorDisplayNames(
  db: SupabaseClient,
  vendorIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(vendorIds)].filter(Boolean);
  const map = new Map<string, string>();
  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await db.from("vendors").select("id, name").in("id", unique);

  if (error || !data) {
    return map;
  }

  for (const row of data as { id: string; name: string }[]) {
    if (row.id && row.name) {
      map.set(row.id, String(row.name));
    }
  }
  return map;
}

export function pickVendorDisplayName(vendorId: string, resolved: Map<string, string>): string {
  return resolved.get(vendorId) ?? FALLBACK;
}
