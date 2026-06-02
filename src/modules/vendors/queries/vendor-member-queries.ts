import type { SupabaseClient } from "@supabase/supabase-js";

export type VendorMemberRow = {
  id: string;
  vendor_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
};

/**
 * Rows visible under vendor_members RLS (owner sees team; members see self; admin sees all).
 */
export async function listVisibleVendorMembers(supabase: SupabaseClient): Promise<VendorMemberRow[]> {
  const { data, error } = await supabase
    .from("vendor_members")
    .select("id, vendor_id, user_id, role, status, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as VendorMemberRow[];
}
