"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertMerchantVendorAccess } from "@/lib/merchant/assert-merchant-vendor-access";
import {
  LEGACY_DASHBOARD_OFFERS_LIST_PATH,
  merchantStoreOfferEditPath,
  merchantStoreOffersPath,
  resolveOffersPostActionRedirect,
} from "@/lib/merchant/merchant-store-paths";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import type { OfferActionResult } from "@/modules/offers/types/action-result";
import {
  createOffer,
  updateOffer,
  updateOfferPrice,
} from "@/modules/offers/services/offer-mutation-service";
import {
  createOfferSchema,
  updateOfferSchema,
  updateOfferPriceSchema,
  type CreateOfferInput,
  type UpdateOfferInput,
  type UpdateOfferPriceInput,
} from "@/modules/offers/validations/offer-mutations";
import { isVendorOwner } from "@/modules/vendors/queries/vendor-queries";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Actor } from "@/modules/identity/types/actor";

function revalidateOfferListSurfaces(vendorId: string) {
  revalidatePath(LEGACY_DASHBOARD_OFFERS_LIST_PATH);
  revalidatePath(merchantStoreOffersPath(vendorId));
}

function revalidateOfferUpdateSurfaces(vendorId: string, offerId: string) {
  revalidateOfferListSurfaces(vendorId);
  revalidatePath(`/dashboard/offers/${offerId}/edit`);
  revalidatePath(merchantStoreOfferEditPath(vendorId, offerId));
}

async function assertOwnerWrite(
  supabase: SupabaseClient,
  actor: Actor,
  vendorId: string,
): Promise<OfferActionResult | null> {
  const owner = await isVendorOwner(supabase, vendorId, actor.userId);
  if (!owner) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the vendor owner can create or change offers.",
    };
  }
  return null;
}

function validationError(message: string): OfferActionResult {
  return { ok: false, code: "VALIDATION_ERROR", message };
}

/**
 * Thin orchestration: validate → actor → owner gate → service. No direct table logic.
 */
export async function createOfferAction(
  _prev: OfferActionResult | null,
  formData: FormData,
): Promise<OfferActionResult> {
  const raw = {
    vendorId: formData.get("vendorId"),
    productId: formData.get("productId"),
    condition: formData.get("condition") || "new",
    listingVariantKey: formData.get("listingVariantKey") || "",
    priceAmount: formData.get("priceAmount"),
    currency: formData.get("currency") || "EUR",
    stockQuantity: formData.get("stockQuantity"),
    state: formData.get("state") || "draft",
  };

  const parsed = createOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().formErrors.join("; ") || "Invalid input");
  }

  const input: CreateOfferInput = parsed.data;
  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);

  if (!actor) {
    return { ok: false, code: "UNAUTHORIZED", message: "Not signed in." };
  }

  const vendorRow = await assertMerchantVendorAccess(supabase, actor.userId, input.vendorId);
  if (!vendorRow) {
    return { ok: false, code: "FORBIDDEN", message: "No access to this store." };
  }

  const gate = await assertOwnerWrite(supabase, actor, input.vendorId);
  if (gate) {
    return gate;
  }

  const result = await createOffer(supabase, actor, input);
  if (!result.ok) {
    return result;
  }

  const dest = resolveOffersPostActionRedirect(formData.get("offersSuccessRedirect"), input.vendorId);
  revalidateOfferListSurfaces(input.vendorId);
  redirect(dest);
}

export async function updateOfferAction(
  _prev: OfferActionResult | null,
  formData: FormData,
): Promise<OfferActionResult> {
  const raw = {
    offerId: formData.get("offerId"),
    vendorId: formData.get("vendorId"),
    priceAmount: formData.get("priceAmount"),
    stockQuantity: formData.get("stockQuantity"),
    state: formData.get("state"),
  };

  const parsed = updateOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().formErrors.join("; ") || "Invalid input");
  }

  const input: UpdateOfferInput = parsed.data;
  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);

  if (!actor) {
    return { ok: false, code: "UNAUTHORIZED", message: "Not signed in." };
  }

  const vendorRow = await assertMerchantVendorAccess(supabase, actor.userId, input.vendorId);
  if (!vendorRow) {
    return { ok: false, code: "FORBIDDEN", message: "No access to this store." };
  }

  const gate = await assertOwnerWrite(supabase, actor, input.vendorId);
  if (gate) {
    return gate;
  }

  const result = await updateOffer(supabase, actor, input);
  if (!result.ok) {
    return result;
  }

  const dest = resolveOffersPostActionRedirect(formData.get("offersSuccessRedirect"), input.vendorId);
  revalidateOfferUpdateSurfaces(input.vendorId, input.offerId);
  redirect(dest);
}

export async function updateOfferPriceAction(raw: unknown): Promise<OfferActionResult> {
  const parsed = updateOfferPriceSchema.safeParse(raw);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().formErrors.join("; ") || "Invalid input");
  }

  const input: UpdateOfferPriceInput = parsed.data;
  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);

  if (!actor) {
    return { ok: false, code: "UNAUTHORIZED", message: "Not signed in." };
  }

  const vendorRow = await assertMerchantVendorAccess(supabase, actor.userId, input.vendorId);
  if (!vendorRow) {
    return { ok: false, code: "FORBIDDEN", message: "No access to this store." };
  }

  const gate = await assertOwnerWrite(supabase, actor, input.vendorId);
  if (gate) {
    return gate;
  }

  const result = await updateOfferPrice(supabase, actor, input);
  if (!result.ok) {
    return result;
  }
  revalidateOfferUpdateSurfaces(input.vendorId, input.offerId);
  return result;
}
