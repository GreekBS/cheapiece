import type { SupabaseClient } from "@supabase/supabase-js";

/** Badge / header count: sum of line quantities (not distinct lines). */
export async function fetchCartItemCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("user_cart_items")
    .select("quantity.sum()")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  const sum = (data as { sum: number | null }).sum;
  return sum ?? 0;
}
