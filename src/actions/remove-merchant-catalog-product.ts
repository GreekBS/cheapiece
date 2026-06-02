"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertMerchantVendorAccess } from "@/lib/merchant/assert-merchant-vendor-access";
import { merchantStoreBase } from "@/lib/merchant/merchant-store-paths";
import { logger } from "@/lib/observability/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCommercialOfferTargetForRequest } from "@/modules/catalog-requests/queries/catalog-product-request-edit-queries";
import {
  fetchCatalogProductRequestById,
  isCatalogRequestVisibleToMerchant,
} from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import { merchantHideCatalogProductRequestRpc } from "@/modules/catalog-requests/queries/merchant-hide-catalog-product-request-rpc";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { archiveOfferForVendor } from "@/modules/offers/services/offer-mutation-service";
import { isVendorOwner } from "@/modules/vendors/queries/vendor-queries";

const removeSchema = z.object({
  requestId: z.string().uuid(),
  vendorId: z.string().uuid(),
});

export type RemoveMerchantCatalogProductResult =
  | { ok: true; message: string }
  | { ok: false; kind: "validation_error"; message: string }
  | { ok: false; kind: "forbidden"; message: string }
  | { ok: false; kind: "not_found"; message: string }
  | { ok: false; kind: "archive_failed"; message: string }
  | {
      ok: false;
      kind: "hide_failed_after_archive";
      message: string;
      recoverable: true;
    }
  | { ok: false; kind: "server_error"; message: string };

const REMOVE_SUCCESS_MESSAGE = "Το προϊόν αφαιρέθηκε από το κατάστημά σας.";
const WITHDRAW_SUCCESS_MESSAGE = "Η αίτηση ανακλήθηκε και αφαιρέθηκε από τη ροή έγκρισης.";

/**
 * Hybrid merchant delete: archive live offer (if any) + hide catalog request row.
 * No catalog moderation, revisions, or hard DELETE.
 */
export async function removeMerchantCatalogProductAction(
  raw: unknown,
): Promise<RemoveMerchantCatalogProductResult> {
  const parsed = removeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "validation_error",
      message: "Μη έγκυρα δεδομένα αφαίρεσης.",
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
    return { ok: false, kind: "forbidden", message: "Μόνο ο ιδιοκτήτης μπορεί να διαγράψει." };
  }

  const requestRes = await fetchCatalogProductRequestById(supabase, input.requestId);
  if (requestRes.error || !requestRes.data || requestRes.data.vendor_id !== input.vendorId) {
    return { ok: false, kind: "not_found", message: "Η εγγραφή δεν βρέθηκε." };
  }

  const request = requestRes.data;

  if (!isCatalogRequestVisibleToMerchant(request)) {
    return { ok: true, message: REMOVE_SUCCESS_MESSAGE };
  }

  const isPendingWithdraw = request.status === "pending";

  const target = await resolveCommercialOfferTargetForRequest(supabase, {
    requestId: input.requestId,
    vendorId: input.vendorId,
    resolvedProductId: request.resolved_product_id ?? null,
  });

  const offerNeedsArchive =
    target != null && target.state.toLowerCase() !== "archived";

  if (offerNeedsArchive) {
    const archiveResult = await archiveOfferForVendor(supabase, actor, {
      offerId: target!.offerId,
      vendorId: input.vendorId,
    });

    if (!archiveResult.ok) {
      return {
        ok: false,
        kind: "archive_failed",
        message: archiveResult.message || "Αποτυχία αρχειοθέτησης προσφοράς.",
      };
    }
  }

  const hideResult = await merchantHideCatalogProductRequestRpc(supabase, input.requestId);
  if (!hideResult.ok) {
    logger.error({
      domain: "merchant_catalog_product_remove",
      function: "removeMerchantCatalogProductAction",
      requestId: input.requestId,
      vendorId: input.vendorId,
      offerArchived: offerNeedsArchive,
      error: { message: hideResult.message },
    });

    if (offerNeedsArchive) {
      return {
        ok: false,
        kind: "hide_failed_after_archive",
        message:
          "Η προσφορά αρχειοθετήθηκε αλλά η αφαίρεση από τη λίστα απέτυχε. Πατήστε ξανά «Διαγραφή».",
        recoverable: true,
      };
    }

    return {
      ok: false,
      kind: "server_error",
      message: hideResult.message,
    };
  }

  const basePath = merchantStoreBase(input.vendorId);
  revalidatePath(basePath);
  revalidatePath(`${basePath}/products`);
  revalidatePath(`${basePath}/offers`);
  revalidatePath("/admin/catalog-requests");

  return {
    ok: true,
    message: isPendingWithdraw ? WITHDRAW_SUCCESS_MESSAGE : REMOVE_SUCCESS_MESSAGE,
  };
}
