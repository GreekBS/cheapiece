import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchProfileForUser } from "@/modules/identity/queries/profile-queries";

import { isVendorOwner } from "./vendor-queries";

export type VendorStoreProfileRow = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  eshop_url: string | null;
};

const PROFILE_SELECT =
  "id, name, description, logo_url, contact_email, contact_phone, address, eshop_url";

export async function fetchVendorStoreProfileById(
  supabase: SupabaseClient,
  vendorId: string,
): Promise<{ data: VendorStoreProfileRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("vendors")
    .select(PROFILE_SELECT)
    .eq("id", vendorId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: null };
  }
  return { data: data as VendorStoreProfileRow, error: null };
}

/** Owner, active manager, or platform_admin (matches vendors_update_unified). */
export async function canEditVendorStoreProfile(
  supabase: SupabaseClient,
  vendorId: string,
  userId: string,
): Promise<boolean> {
  const profile = await fetchProfileForUser(supabase, userId);
  if (profile?.role === "platform_admin") {
    return true;
  }

  if (await isVendorOwner(supabase, vendorId, userId)) {
    return true;
  }

  const { data: membership, error } = await supabase
    .from("vendor_members")
    .select("role")
    .eq("vendor_id", vendorId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership) {
    return false;
  }

  const role = (membership as { role: string }).role;
  return role === "owner" || role === "manager";
}
