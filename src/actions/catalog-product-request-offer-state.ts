"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertMerchantVendorAccess } from "@/lib/merchant/assert-merchant-vendor-access";
import { merchantStoreBase } from "@/lib/merchant/merchant-store-paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCommercialOfferTargetForRequest } from "@/modules/catalog-requests/queries/catalog-product-request-edit-queries";
import { fetchCatalogProductRequestById } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { fetchStoreProductByIdForVendor } from "@/modules/offers/queries/store-product-queries";
import { updateOffer } from "@/modules/offers/services/offer-mutation-service";
import { isVendorOwner } from "@/modules/vendors/queries/vendor-queries";

const offerStateToggleSchema = z.object({
  requestId: z.string().uuid(),
  vendorId: z.string().uuid(),
  targetState: z.enum(["active", "paused"]),
});

export type SetCatalogRequestOfferStateResult =
  | { ok: true; message: string }
  | { ok: false; kind: "validation_error"; message: string }
  | { ok: false; kind: "forbidden"; message: string }
  | { ok: false; kind: "not_found"; message: string }
  | { ok: false; kind: "offer_missing"; message: string }
  | { ok: false; kind: "invalid_transition"; message: string }
  | { ok: false; kind: "server_error"; message: string };

function parseOfferPrice(amount: string | number): number {
  const parsed = typeof amount === "number" ? amount : Number(String(amount));
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid offer price.");
  }
  return parsed;
}

/** Live offer activate/deactivate — store_products.state only, no catalog moderation. */
export async function setCatalogRequestOfferStateAction(
  raw: unknown,
): Promise<SetCatalogRequestOfferStateResult> {
  const parsed = offerStateToggleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "validation_error",
      message: "Μη έγκυρα δεδομένα αλλαγής κατάστασης προσφοράς.",
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

  if (requestRes.data.status !== "approved") {
    return {
      ok: false,
      kind: "invalid_transition",
      message: "Η αλλαγή κατάστασης προσφοράς είναι διαθέσιμη μόνο για εγκεκριμένα προϊόντα.",
    };
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
      message: "Δεν βρέθηκε ενεργή προσφορά για αλλαγή κατάστασης.",
    };
  }

  const currentState = target.state.toLowerCase();
  const nextState = input.targetState;

  if (nextState === "paused" && currentState !== "active") {
    return {
      ok: false,
      kind: "invalid_transition",
      message: "Μόνο ενεργές προσφορές μπορούν να απενεργοποιηθούν.",
    };
  }

  if (nextState === "active" && currentState !== "paused") {
    return {
      ok: false,
      kind: "invalid_transition",
      message: "Μόνο προσφορές σε παύση μπορούν να ενεργοποιηθούν.",
    };
  }

  const offerRow = await fetchStoreProductByIdForVendor(supabase, target.offerId, input.vendorId);
  if (!offerRow) {
    return {
      ok: false,
      kind: "offer_missing",
      message: "Δεν βρέθηκε η προσφορά για ενημέρωση.",
    };
  }

  let priceAmount: number;
  try {
    priceAmount = parseOfferPrice(offerRow.price_amount);
  } catch {
    return {
      ok: false,
      kind: "server_error",
      message: "Μη έγκυρη τιμή προσφοράς.",
    };
  }

  const stockQuantity = offerRow.stock_quantity ?? 0;

  const result = await updateOffer(supabase, actor, {
    offerId: target.offerId,
    vendorId: input.vendorId,
    priceAmount,
    stockQuantity,
    state: nextState,
  });

  if (!result.ok) {
    return {
      ok: false,
      kind: "server_error",
      message: result.message || "Αποτυχία ενημέρωσης κατάστασης προσφοράς.",
    };
  }

  const basePath = merchantStoreBase(input.vendorId);
  revalidatePath(basePath);
  revalidatePath(`${basePath}/products`);
  revalidatePath(`${basePath}/offers`);

  return {
    ok: true,
    message:
      nextState === "paused"
        ? "Η προσφορά απενεργοποιήθηκε."
        : "Η προσφορά ενεργοποιήθηκε.",
  };
}
