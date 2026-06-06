import type { SupabaseClient } from "@supabase/supabase-js";

/** Badge / header count: sum of line quantities (not distinct lines). */
export async function fetchCartItemCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("user_cart_items")
    .select("quantity")
    .eq("user_id", userId);

  if (error || !data) {
    return 0;
  }

  return data.reduce((sum, row) => sum + (row.quantity as number), 0);
}
