import type { SupabaseClient } from "@supabase/supabase-js";

export type VendorRow = {
  id: string;
  name: string;
  slug: string;
  state: string;
  owner_user_id: string;
  tenant_id: string;
  logo_url?: string | null;
};

export type VendorRowWithCreated = VendorRow & { created_at: string };

/**
 * Vendors the user owns (RLS: only owner or admin sees row).
 */
export async function listVendorsOwnedByUser(supabase: SupabaseClient): Promise<VendorRow[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, slug, state, owner_user_id, tenant_id")
    .order("created_at", { ascending: true });

  if (error) {
    // TEMP: distinguish RLS-empty (usually error=null, data=[]) from hard PostgREST/DB errors
    console.error("[listVendorsOwnedByUser] vendors select failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  if (!data) {
    return [];
  }
  return data as VendorRow[];
}

/**
 * Vendor IDs the user can access for dashboard: owned vendors + active memberships.
 */
export async function listAccessibleVendorIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const owned = await listVendorsOwnedByUser(supabase);
  const ownedIds = owned.map((v) => v.id);

  const { data: memberships, error: membersError } = await supabase
    .from("vendor_members")
    .select("vendor_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membersError) {
    console.error("[listAccessibleVendorIds] vendor_members select failed", {
      userId,
      message: membersError.message,
      code: membersError.code,
    });
  }

  const memberIds = (memberships ?? []).map((m: { vendor_id: string }) => m.vendor_id);
  return [...new Set([...ownedIds, ...memberIds])];
}

export async function isVendorOwner(
  supabase: SupabaseClient,
  vendorId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", vendorId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  return !error && !!data;
}

/**
 * Deterministic primary store for merchant UX: owned first, then `created_at` ASC, then `id` ASC.
 * Multi-store hub intentionally frozen — navigation must use this (or `resolveMerchantDestination`), not `fetchVendorsByIds` order.
 */
export async function pickPrimaryAccessibleVendor(
  supabase: SupabaseClient,
  userId: string,
): Promise<VendorRowWithCreated | null> {
  const ids = await listAccessibleVendorIds(supabase, userId);
  if (ids.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, slug, state, owner_user_id, tenant_id, created_at")
    .in("id", ids);

  if (error || !data?.length) {
    if (error) {
      console.error("[pickPrimaryAccessibleVendor] vendors select failed", {
        userId,
        message: error.message,
        code: error.code,
      });
    }
    return null;
  }

  const rows = data as VendorRowWithCreated[];
  rows.sort((a, b) => {
    const aOwned = a.owner_user_id === userId ? 0 : 1;
    const bOwned = b.owner_user_id === userId ? 0 : 1;
    if (aOwned !== bOwned) {
      return aOwned - bOwned;
    }
    const aCreated = Date.parse(a.created_at);
    const bCreated = Date.parse(b.created_at);
    const aTime = Number.isFinite(aCreated) ? aCreated : 0;
    const bTime = Number.isFinite(bCreated) ? bCreated : 0;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.id.localeCompare(b.id);
  });

  return rows[0] ?? null;
}

/** Vendors by id list (dashboard / offers). */
export async function fetchVendorsByIds(supabase: SupabaseClient, ids: string[]): Promise<VendorRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, slug, state, owner_user_id, tenant_id")
    .in("id", ids)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as VendorRow[];
}
