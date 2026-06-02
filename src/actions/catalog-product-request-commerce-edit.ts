"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertMerchantVendorAccess } from "@/lib/merchant/assert-merchant-vendor-access";
import { merchantStoreBase } from "@/lib/merchant/merchant-store-paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCommercialOfferTargetForRequest } from "@/modules/catalog-requests/queries/catalog-product-request-edit-queries";
import { fetchCatalogProductRequestById } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { updateOffer } from "@/modules/offers/services/offer-mutation-service";
import { isVendorOwner } from "@/modules/vendors/queries/vendor-queries";

const commerceEditSchema = z.object({
  requestId: z.string().uuid(),
  vendorId: z.string().uuid(),
  priceAmount: z.number().nonnegative().finite(),
  stockQuantity: z.number().int().nonnegative(),
  state: z.enum(["draft", "active", "paused", "archived"]),
});

export type ApplyCatalogRequestCommerceEditResult =
  | { ok: true; message: string }
  | { ok: false; kind: "validation_error"; message: string }
  | { ok: false; kind: "forbidden"; message: string }
  | { ok: false; kind: "not_found"; message: string }
  | { ok: false; kind: "offer_missing"; message: string }
  | { ok: false; kind: "server_error"; message: string };

/** Live update of price/stock/state on store_products — no catalog moderation. */
export async function applyCatalogRequestCommerceEditAction(
  raw: unknown,
): Promise<ApplyCatalogRequestCommerceEditResult> {
  const parsed = commerceEditSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "validation_error",
      message: "Μη έγκυρα δεδομένα εμπορικής ενημέρωσης.",
    };
  }

  const input = parsed.data;
  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { ok: false, kind: "forbidden", message: "Απαιτείται σύνδεση." };
  }

  const vendor = await assertMerchantVendorAccess(supabase, actor.userId, input.vendorId);
  if (!vendor) {
    return { ok: false, kind: "forbidden", message: "Δεν έχετε πρόσβαση σε αυτό το κατάστημα." };
  }

  const owner = await isVendorOwner(supabase, input.vendorId, actor.userId);
  if (!owner) {
    return { ok: false, kind: "forbidden", message: "Μόνο ο ιδιοκτήτης μπορεί να επεξεργαστεί." };
  }

  const requestRes = await fetchCatalogProductRequestById(supabase, input.requestId);
  if (requestRes.error || !requestRes.data || requestRes.data.vendor_id !== input.vendorId) {
    return { ok: false, kind: "not_found", message: "Η εγγραφή δεν βρέθηκε." };
  }

  const target = await resolveCommercialOfferTargetForRequest(supabase, {
    requestId: input.requestId,
    vendorId: input.vendorId,
    resolvedProductId: requestRes.data.resolved_product_id ?? null,
  });

  if (!target) {
    return {
      ok: false,
      kind: "offer_missing",
      message: "Δεν βρέθηκε ενεργή προσφορά για άμεση ενημέρωση τιμής/αποθέματος.",
    };
  }

  const result = await updateOffer(supabase, actor, {
    offerId: target.offerId,
    vendorId: input.vendorId,
    priceAmount: input.priceAmount,
    stockQuantity: input.stockQuantity,
    state: input.state,
  });

  if (!result.ok) {
    return {
      ok: false,
      kind: "server_error",
      message: result.message || "Αποτυχία ενημέρωσης προσφοράς.",
    };
  }

  const basePath = merchantStoreBase(input.vendorId);
  revalidatePath(basePath);
  revalidatePath(`${basePath}/products`);
  revalidatePath(`${basePath}/offers`);

  return {
    ok: true,
    message: "Η προσφορά ενημερώθηκε.",
  };
}
