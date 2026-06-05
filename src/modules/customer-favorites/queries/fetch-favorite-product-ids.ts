import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchFavoriteProductIdsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.product_id as string);
}
