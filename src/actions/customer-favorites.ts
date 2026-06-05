"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchFavoriteProductIdsForUser } from "@/modules/customer-favorites/queries/fetch-favorite-product-ids";

export type CustomerFavoriteToggleState =
  | { ok: true; favorited: boolean }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getFavoriteIdsForUser(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  return fetchFavoriteProductIdsForUser(supabase, user.id);
}

export async function toggleCustomerFavorite(productId: string): Promise<CustomerFavoriteToggleState> {
  const trimmed = productId.trim();
  if (!UUID_RE.test(trimmed)) {
    return { ok: false, message: "Μη έγκυρο προϊόν." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Απαιτείται σύνδεση." };
  }

  const { data: existing, error: selectError } = await supabase
    .from("user_favorites")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", trimmed)
    .maybeSingle();

  if (selectError) {
    return { ok: false, message: selectError.message };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", trimmed);

    if (deleteError) {
      return { ok: false, message: deleteError.message };
    }

    return { ok: true, favorited: false };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", trimmed)
    .eq("state", "active")
    .maybeSingle();

  if (productError) {
    return { ok: false, message: productError.message };
  }

  if (!product) {
    return { ok: false, message: "Το προϊόν δεν είναι διαθέσιμο." };
  }

  const { error: insertError } = await supabase.from("user_favorites").insert({
    user_id: user.id,
    product_id: trimmed,
  });

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  return { ok: true, favorited: true };
}
