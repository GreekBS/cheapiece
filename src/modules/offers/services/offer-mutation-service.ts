import type { SupabaseClient } from "@supabase/supabase-js";

import type { Actor } from "@/modules/identity/types/actor";
import type { OfferActionResult } from "../types/action-result";
import {
  fetchStoreProductByIdForVendor,
  insertStoreProduct,
  listVendorOffers as queryListVendorOffers,
  updateStoreProduct,
  updateStoreProductPrice,
} from "../queries/store-product-queries";
import type { StoreProductListRow } from "../types/store-product";
import type { CreateOfferInput, UpdateOfferInput, UpdateOfferPriceInput } from "../validations/offer-mutations";

import { invalidateOfferProductCache } from "./invalidate-offer-product-cache";

function mapDbError(err: Error): OfferActionResult {
  const msg = err.message.toLowerCase();
  if (msg.includes("permission") || msg.includes("policy") || msg.includes("rls") || msg.includes("row-level")) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Not allowed (RLS or permissions).",
    };
  }
  if (msg.includes("unique") || msg.includes("duplicate")) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Conflict with existing offer for this product/condition.",
    };
  }
  return { ok: false, code: "INTERNAL_ERROR", message: err.message };
}

export async function listVendorOffers(
  db: SupabaseClient,
  vendorId: string,
): Promise<StoreProductListRow[]> {
  return queryListVendorOffers(db, vendorId);
}

export async function createOffer(
  db: SupabaseClient,
  actor: Actor,
  input: CreateOfferInput,
): Promise<OfferActionResult> {
  const { error } = await insertStoreProduct(db, {
    vendor_id: input.vendorId,
    product_id: input.productId,
    condition: input.condition,
    listing_variant_key: input.listingVariantKey,
    price_amount: input.priceAmount,
    currency: input.currency,
    stock_quantity: input.stockQuantity,
    state: input.state,
    created_by: actor.userId,
  });

  if (error) {
    return mapDbError(error);
  }

  await invalidateOfferProductCache(db, input.productId);
  return { ok: true };
}

export async function updateOffer(
  db: SupabaseClient,
  actor: Actor,
  input: UpdateOfferInput,
): Promise<OfferActionResult> {
  const existing = await fetchStoreProductByIdForVendor(db, input.offerId, input.vendorId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Offer not found or not visible for this vendor." };
  }

  if (existing.state === "archived") {
    return { ok: false, code: "FORBIDDEN", message: "Cannot modify archived offer." };
  }

  const { error } = await updateStoreProduct(db, {
    offerId: input.offerId,
    vendorId: input.vendorId,
    priceAmount: input.priceAmount,
    stockQuantity: input.stockQuantity,
    state: input.state,
    updatedByUserId: actor.userId,
  });

  if (error) {
    return mapDbError(error);
  }

  await invalidateOfferProductCache(db, existing.product_id);
  return { ok: true };
}

/** Archive a vendor offer (idempotent when already archived). */
export async function archiveOfferForVendor(
  db: SupabaseClient,
  actor: Actor,
  input: { offerId: string; vendorId: string },
): Promise<OfferActionResult> {
  const existing = await fetchStoreProductByIdForVendor(db, input.offerId, input.vendorId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Offer not found or not visible for this vendor." };
  }

  if (existing.state === "archived") {
    return { ok: true };
  }

  let priceAmount: number;
  try {
    priceAmount =
      typeof existing.price_amount === "number"
        ? existing.price_amount
        : Number(String(existing.price_amount));
    if (!Number.isFinite(priceAmount)) {
      return { ok: false, code: "INTERNAL_ERROR", message: "Invalid offer price." };
    }
  } catch {
    return { ok: false, code: "INTERNAL_ERROR", message: "Invalid offer price." };
  }

  const { error } = await updateStoreProduct(db, {
    offerId: input.offerId,
    vendorId: input.vendorId,
    priceAmount,
    stockQuantity: existing.stock_quantity ?? 0,
    state: "archived",
    updatedByUserId: actor.userId,
  });

  if (error) {
    return mapDbError(error);
  }

  await invalidateOfferProductCache(db, existing.product_id);
  return { ok: true };
}

/** @deprecated use updateOffer — kept for backward compatibility */
export async function updateOfferPrice(
  db: SupabaseClient,
  actor: Actor,
  input: UpdateOfferPriceInput,
): Promise<OfferActionResult> {
  const existing = await fetchStoreProductByIdForVendor(db, input.offerId, input.vendorId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Offer not found or not visible for this vendor." };
  }

  if (existing.state === "archived") {
    return { ok: false, code: "FORBIDDEN", message: "Cannot modify archived offer." };
  }

  const { error } = await updateStoreProductPrice(db, {
    offerId: input.offerId,
    vendorId: input.vendorId,
    priceAmount: input.priceAmount,
    updatedByUserId: actor.userId,
  });

  if (error) {
    return mapDbError(error);
  }

  await invalidateOfferProductCache(db, existing.product_id);
  return { ok: true };
}

