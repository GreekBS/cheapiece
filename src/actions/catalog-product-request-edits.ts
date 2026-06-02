"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertMerchantVendorAccess } from "@/lib/merchant/assert-merchant-vendor-access";
import { merchantStoreBase } from "@/lib/merchant/merchant-store-paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  applyMinorCommercialEdit,
  fetchCatalogRequestBaselineForEdit,
  resolveCommercialOfferTargetForRequest,
} from "@/modules/catalog-requests/queries/catalog-product-request-edit-queries";
import {
  classifyCatalogRequestEditDiff,
  type CatalogRequestEditPayload,
} from "@/modules/catalog-requests/services/classify-catalog-request-edit-diff";
import { submitProductDefinitionRevision } from "@/modules/catalog-requests/services/submit-product-definition-revision";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { isVendorOwner } from "@/modules/vendors/queries/vendor-queries";

const editCatalogRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    vendorId: z.string().uuid(),
    baselineUpdatedAt: z.string().min(1),
    title: z.string().max(500),
    brand: z.string().max(200).nullable().optional(),
    model: z.string().max(200).nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    slugSuggestion: z.string().max(200),
    gtin: z.string().max(32).nullable().optional(),
    mpn: z.string().max(120).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    attributes: z.record(z.unknown()).default({}),
    price: z.number().nonnegative().nullable(),
    stock: z.number().int().nonnegative().nullable(),
    confirmMajor: z.boolean().optional().default(false),
  })
  .passthrough();

const KNOWN_EDIT_INPUT_KEYS = new Set([
  "requestId",
  "vendorId",
  "baselineUpdatedAt",
  "title",
  "brand",
  "model",
  "categoryId",
  "slugSuggestion",
  "gtin",
  "mpn",
  "description",
  "attributes",
  "price",
  "stock",
  "confirmMajor",
]);

export type EditCatalogProductRequestActionResult =
  | { ok: true; kind: "minor_applied"; message: string }
  | { ok: true; kind: "major_revision_submitted"; message: string; revisionId: string }
  | { ok: false; kind: "requires_major_confirmation"; message: string; majorFields: string[] }
  | { ok: false; kind: "stale_write"; message: string }
  | { ok: false; kind: "validation_error"; message: string; fieldErrors?: Record<string, string[]> }
  | { ok: false; kind: "forbidden"; message: string }
  | { ok: false; kind: "not_found"; message: string }
  | { ok: false; kind: "minor_target_missing"; message: string }
  | { ok: false; kind: "server_error"; message: string };

export async function editCatalogProductRequestAction(
  raw: unknown,
): Promise<EditCatalogProductRequestActionResult> {
  const parsed = editCatalogRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "validation_error",
      message: "Μη έγκυρα δεδομένα επεξεργασίας.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data as CatalogRequestEditPayload;
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

  const baseline = await fetchCatalogRequestBaselineForEdit(supabase, input.requestId);
  if (!baseline || baseline.vendor_id !== input.vendorId) {
    return { ok: false, kind: "not_found", message: "Η εγγραφή δεν βρέθηκε." };
  }

  if (baseline.updated_at !== input.baselineUpdatedAt) {
    return {
      ok: false,
      kind: "stale_write",
      message: "Η εγγραφή άλλαξε από άλλη ενέργεια. Κάντε ανανέωση και δοκιμάστε ξανά.",
    };
  }

  const rawObj =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const unknownPayloadFields = Object.keys(rawObj).filter((k) => !KNOWN_EDIT_INPUT_KEYS.has(k));

  const diff = classifyCatalogRequestEditDiff({
    row: baseline,
    payload: input,
    unknownPayloadFields,
  });

  if (diff.kind === "none") {
    return { ok: true, kind: "minor_applied", message: "Δεν υπάρχουν αλλαγές για αποθήκευση." };
  }

  if (diff.kind === "major") {
    if (!input.confirmMajor) {
      return {
        ok: false,
        kind: "requires_major_confirmation",
        message: "Η αλλαγή αυτών των στοιχείων θα στείλει ξανά το προϊόν για έγκριση.",
        majorFields: [...diff.changedMajor, ...diff.unknownFields],
      };
    }
    const revision = await submitProductDefinitionRevision(supabase, {
      baseline,
      input,
      submittedBy: actor.userId,
      unknownPayloadFields,
    });

    if (!revision.ok) {
      return {
        ok: false,
        kind: "server_error",
        message: revision.message,
      };
    }

    const basePath = merchantStoreBase(input.vendorId);
    revalidatePath(basePath);
    revalidatePath(`${basePath}/products`);

    return {
      ok: true,
      kind: "major_revision_submitted",
      message: "Οι αλλαγές στάλθηκαν για έγκριση",
      revisionId: revision.revisionId,
    };
  }

  const price = input.price;
  const stock = input.stock;
  if (price == null || stock == null) {
    return {
      ok: false,
      kind: "validation_error",
      message: "Η τιμή και το απόθεμα απαιτούνται για εμπορική ενημέρωση.",
    };
  }

  const target = await resolveCommercialOfferTargetForRequest(supabase, {
    requestId: input.requestId,
    vendorId: input.vendorId,
    resolvedProductId: baseline.resolved_product_id ?? null,
  });

  if (!target) {
    return {
      ok: false,
      kind: "minor_target_missing",
      message: "Δεν βρέθηκε ενεργή προσφορά για ενημέρωση τιμής/αποθέματος.",
    };
  }

  const write = await applyMinorCommercialEdit(supabase, {
    offerId: target.offerId,
    vendorId: target.vendorId,
    state: target.state,
    priceAmount: price,
    stockQuantity: stock,
    updatedByUserId: actor.userId,
  });

  if (!write.ok) {
    return {
      ok: false,
      kind: "server_error",
      message: write.message || "Αποτυχία ενημέρωσης προσφοράς.",
    };
  }

  const basePath = merchantStoreBase(input.vendorId);
  revalidatePath(basePath);
  revalidatePath(`${basePath}/products`);
  revalidatePath(`${basePath}/offers`);

  return {
    ok: true,
    kind: "minor_applied",
    message: "Η τιμή και το απόθεμα ενημερώθηκαν.",
  };
}
