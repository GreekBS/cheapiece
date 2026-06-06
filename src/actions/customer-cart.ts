"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { MAX_CART_LINES, UUID_RE } from "@/modules/customer-cart/constants";
import { fetchCartItemCountForUser } from "@/modules/customer-cart/queries/fetch-cart-item-count-for-user";
import {
  buildCartSnapshot,
  fetchCartLinesForUser,
} from "@/modules/customer-cart/queries/fetch-cart-lines-for-user";
import { fetchOfferForCartValidation } from "@/modules/customer-cart/queries/fetch-offers-for-cart-validation";
import {
  fetchCartDistinctLineCountForUser,
} from "@/modules/customer-cart/queries/fetch-cart-rows-for-user";
import type {
  CartSnapshot,
  CustomerCartMutationResult,
} from "@/modules/customer-cart/types/cart-line.vm";
import {
  exceedsStock,
  normalizeOfferId,
  parseAddQuantity,
  parseUpdateQuantity,
} from "@/modules/customer-cart/validation/validate-cart-quantity";

const EMPTY_CART: CartSnapshot = {
  lines: [],
  lineCount: 0,
  itemCount: 0,
  subtotalAmount: 0,
  currency: "EUR",
};

async function readCartCounts(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
): Promise<{ lineCount: number; itemCount: number }> {
  const [lineCount, itemCount] = await Promise.all([
    fetchCartDistinctLineCountForUser(supabase, userId),
    fetchCartItemCountForUser(supabase, userId),
  ]);
  return { lineCount, itemCount };
}

function revalidateCartPage(): void {
  revalidatePath("/cart");
}

export async function addItem(
  offerId: string,
  quantity?: number,
): Promise<CustomerCartMutationResult> {
  const normalizedOfferId = normalizeOfferId(offerId);
  if (!UUID_RE.test(normalizedOfferId)) {
    return { ok: false, message: "Μη έγκυρη προσφορά.", code: "INVALID_OFFER_ID" };
  }

  const parsedQuantity = parseAddQuantity(quantity);
  if (parsedQuantity == null) {
    return { ok: false, message: "Μη έγκυρη ποσότητα.", code: "INVALID_QUANTITY" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Απαιτείται σύνδεση.", code: "UNAUTHENTICATED" };
  }

  const tenantId = getPublicMarketplaceTenantId();

  const { data: existing, error: existingError } = await supabase
    .from("user_cart_items")
    .select("quantity")
    .eq("user_id", user.id)
    .eq("offer_id", normalizedOfferId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: "Δεν ήταν δυνατή η ενημέρωση του καλαθιού.", code: "DB_ERROR" };
  }

  const targetQty = existing ? existing.quantity + parsedQuantity : parsedQuantity;

  const offer = await fetchOfferForCartValidation(supabase, normalizedOfferId, tenantId);
  if (!offer) {
    return { ok: false, message: "Η προσφορά δεν είναι διαθέσιμη.", code: "OFFER_UNAVAILABLE" };
  }

  if (exceedsStock(targetQty, offer.stockQuantity)) {
    return { ok: false, message: "Δεν υπάρχει επαρκές απόθεμα.", code: "INSUFFICIENT_STOCK" };
  }

  if (!existing) {
    const lineCount = await fetchCartDistinctLineCountForUser(supabase, user.id);
    if (lineCount >= MAX_CART_LINES) {
      return {
        ok: false,
        message: "Το καλάθι σου έχει φτάσει το μέγιστο αριθμό προϊόντων (50).",
        code: "CART_LINE_LIMIT",
      };
    }

    const { error: insertError } = await supabase.from("user_cart_items").insert({
      user_id: user.id,
      offer_id: normalizedOfferId,
      quantity: targetQty,
    });

    if (insertError) {
      return { ok: false, message: "Δεν ήταν δυνατή η ενημέρωση του καλαθιού.", code: "DB_ERROR" };
    }
  } else {
    const { error: updateError } = await supabase
      .from("user_cart_items")
      .update({ quantity: targetQty })
      .eq("user_id", user.id)
      .eq("offer_id", normalizedOfferId);

    if (updateError) {
      return { ok: false, message: "Δεν ήταν δυνατή η ενημέρωση του καλαθιού.", code: "DB_ERROR" };
    }
  }

  revalidateCartPage();
  const counts = await readCartCounts(supabase, user.id);
  return { ok: true, quantity: targetQty, ...counts };
}

export async function removeItem(offerId: string): Promise<CustomerCartMutationResult> {
  const normalizedOfferId = normalizeOfferId(offerId);
  if (!UUID_RE.test(normalizedOfferId)) {
    return { ok: false, message: "Μη έγκυρη προσφορά.", code: "INVALID_OFFER_ID" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Απαιτείται σύνδεση.", code: "UNAUTHENTICATED" };
  }

  const { error: deleteError } = await supabase
    .from("user_cart_items")
    .delete()
    .eq("user_id", user.id)
    .eq("offer_id", normalizedOfferId);

  if (deleteError) {
    return { ok: false, message: "Δεν ήταν δυνατή η ενημέρωση του καλαθιού.", code: "DB_ERROR" };
  }

  revalidateCartPage();
  const counts = await readCartCounts(supabase, user.id);
  return { ok: true, quantity: 0, ...counts };
}

export async function updateQuantity(
  offerId: string,
  quantity: number,
): Promise<CustomerCartMutationResult> {
  const normalizedOfferId = normalizeOfferId(offerId);
  if (!UUID_RE.test(normalizedOfferId)) {
    return { ok: false, message: "Μη έγκυρη προσφορά.", code: "INVALID_OFFER_ID" };
  }

  const parsedQuantity = parseUpdateQuantity(quantity);
  if (parsedQuantity == null) {
    return { ok: false, message: "Μη έγκυρη ποσότητα.", code: "INVALID_QUANTITY" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Απαιτείται σύνδεση.", code: "UNAUTHENTICATED" };
  }

  if (parsedQuantity === 0) {
    return removeItem(normalizedOfferId);
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_cart_items")
    .select("quantity")
    .eq("user_id", user.id)
    .eq("offer_id", normalizedOfferId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: "Δεν ήταν δυνατή η ενημέρωση του καλαθιού.", code: "DB_ERROR" };
  }

  if (!existing) {
    return { ok: false, message: "Το προϊόν δεν βρίσκεται στο καλάθι.", code: "NOT_FOUND" };
  }

  const isIncrease = parsedQuantity > existing.quantity;
  if (isIncrease) {
    const tenantId = getPublicMarketplaceTenantId();
    const offer = await fetchOfferForCartValidation(supabase, normalizedOfferId, tenantId);
    if (!offer) {
      return { ok: false, message: "Η προσφορά δεν είναι διαθέσιμη.", code: "OFFER_UNAVAILABLE" };
    }

    if (exceedsStock(parsedQuantity, offer.stockQuantity)) {
      return { ok: false, message: "Δεν υπάρχει επαρκές απόθεμα.", code: "INSUFFICIENT_STOCK" };
    }
  }

  const { error: updateError } = await supabase
    .from("user_cart_items")
    .update({ quantity: parsedQuantity })
    .eq("user_id", user.id)
    .eq("offer_id", normalizedOfferId);

  if (updateError) {
    return { ok: false, message: "Δεν ήταν δυνατή η ενημέρωση του καλαθιού.", code: "DB_ERROR" };
  }

  revalidateCartPage();
  const counts = await readCartCounts(supabase, user.id);
  return { ok: true, quantity: parsedQuantity, ...counts };
}

export async function getCart(): Promise<CartSnapshot> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return EMPTY_CART;
  }

  const lines = await fetchCartLinesForUser(supabase, user.id);
  return buildCartSnapshot(lines);
}

export async function getCartCount(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  return fetchCartItemCountForUser(supabase, user.id);
}
