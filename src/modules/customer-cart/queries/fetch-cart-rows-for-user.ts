import type { SupabaseClient } from "@supabase/supabase-js";

export type CartRow = {
  userId: string;
  offerId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCartRowsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<CartRow[]> {
  const { data, error } = await supabase
    .from("user_cart_items")
    .select("user_id, offer_id, quantity, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    userId: row.user_id as string,
    offerId: row.offer_id as string,
    quantity: row.quantity as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function fetchCartDistinctLineCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("user_cart_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error || count == null) {
    return 0;
  }

  return count;
}
