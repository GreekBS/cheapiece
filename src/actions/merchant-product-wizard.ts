"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { slugifyCategoryName } from "@/lib/admin/category-slug";
import { merchantStoreOffersPath } from "@/lib/merchant/merchant-store-paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchActiveProductsForTenant, type ActiveCatalogSearchRow } from "@/modules/catalog/queries/product-queries";
import { submitCatalogProductRequestCore } from "@/modules/catalog-requests/services/submit-catalog-product-request-core";
import { fetchCatalogProductRequestById } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import { submitCatalogProductRequestSchema } from "@/modules/catalog-requests/validations/catalog-product-request";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { createOffer } from "@/modules/offers/services/offer-mutation-service";
import { createOfferSchema } from "@/modules/offers/validations/offer-mutations";
import { fetchVendorsByIds, isVendorOwner, listAccessibleVendorIds } from "@/modules/vendors/queries/vendor-queries";

const searchMerchantCatalogSchema = z.object({
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  query: z.string().max(800).optional(),
});

export type SearchMerchantCatalogResult =
  | { ok: true; matches: ActiveCatalogSearchRow[] }
  | { ok: false; message: string; matches: ActiveCatalogSearchRow[] };

export async function searchMerchantCatalogMatchesAction(
  input: z.infer<typeof searchMerchantCatalogSchema>,
): Promise<SearchMerchantCatalogResult> {
  const parsed = searchMerchantCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Μη έγκυρα δεδομένα αναζήτησης.", matches: [] };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { ok: false, message: "Απαιτείται σύνδεση.", matches: [] };
  }

  const accessibleIds = await listAccessibleVendorIds(supabase, actor.userId);
  const vendorRows = await fetchVendorsByIds(supabase, accessibleIds);
  const tenantAllowed = vendorRows.some((v) => v.tenant_id === parsed.data.tenantId);
  if (!tenantAllowed) {
    return { ok: false, message: "Δεν έχετε πρόσβαση σε αυτόν τον tenant.", matches: [] };
  }

  const q = [parsed.data.query ?? ""].join(" ").trim();
  const matches = await searchActiveProductsForTenant(supabase, parsed.data.tenantId, {
    categoryId: parsed.data.categoryId,
    q: q.length > 0 ? q : undefined,
    limit: 48,
  });

  return { ok: true, matches };
}

const attachWizardOfferSchema = createOfferSchema;

export type WizardAttachOfferResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function attachMerchantWizardOfferAction(
  input: z.infer<typeof attachWizardOfferSchema>,
): Promise<WizardAttachOfferResult> {
  const parsed = attachWizardOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.flatten().formErrors.join("; ") };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { ok: false, code: "UNAUTHORIZED", message: "Απαιτείται σύνδεση." };
  }

  const owner = await isVendorOwner(supabase, parsed.data.vendorId, actor.userId);
  if (!owner) {
    return { ok: false, code: "FORBIDDEN", message: "Μόνο ο ιδιοκτήτης του καταστήματος μπορεί να δημιουργήσει προσφορά." };
  }

  const result = await createOffer(supabase, actor, parsed.data);
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  revalidatePath("/dashboard/offers");
  revalidatePath(merchantStoreOffersPath(parsed.data.vendorId));
  return { ok: true };
}

const wizardSubmitRequestSchema = z.object({
  vendorId: z.string().uuid(),
  categoryId: z.string().uuid(),
  title: z.string().trim().min(2).max(500),
  brand: z.string().trim().max(200).nullable().optional(),
  model: z.string().trim().max(200).nullable().optional(),
  gtin: z.string().trim().max(32).nullable().optional(),
  mpn: z.string().trim().max(120).nullable().optional(),
});

export type WizardSubmitRequestResult =
  | { ok: true; requestId: string; duplicateWarning?: { existingRequestId: string; message: string } }
  | { ok: false; message: string };

function buildSlugFromTitle(title: string): string {
  const fb = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
  return slugifyCategoryName(title, fb).toLowerCase();
}

export async function submitMerchantWizardCatalogRequestAction(
  input: z.infer<typeof wizardSubmitRequestSchema>,
): Promise<WizardSubmitRequestResult> {
  const parsed = wizardSubmitRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().formErrors.join("; ") || "Μη έγκυρα δεδομένα." };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { ok: false, message: "Απαιτείται σύνδεση." };
  }

  const accessible = await listAccessibleVendorIds(supabase, actor.userId);
  const slugSuggestion = buildSlugFromTitle(parsed.data.title);
  const payloadParsed = submitCatalogProductRequestSchema.safeParse({
    vendorId: parsed.data.vendorId,
    categoryId: parsed.data.categoryId,
    title: parsed.data.title,
    brand: parsed.data.brand ?? null,
    model: parsed.data.model ?? null,
    slugSuggestion,
    gtin: parsed.data.gtin ?? null,
    mpn: parsed.data.mpn ?? null,
  });
  if (!payloadParsed.success) {
    return {
      ok: false,
      message: payloadParsed.error.flatten().formErrors.join("; ") || "Μη έγκυρο slug από τίτλο.",
    };
  }
  const payload = payloadParsed.data;

  const result = await submitCatalogProductRequestCore(supabase, {
    userId: actor.userId,
    accessibleVendorIds: accessible,
    payload,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/dashboard/catalog-requests");
  revalidatePath("/merchant/products/new");
  if (result.duplicateWarning) {
    return {
      ok: true,
      requestId: result.id,
      duplicateWarning: result.duplicateWarning,
    };
  }
  return { ok: true, requestId: result.id };
}

export type MerchantCatalogRequestStatusResult =
  | {
      ok: true;
      found: false;
    }
  | {
      ok: true;
      found: true;
      id: string;
      status: string;
      rejection_reason: string | null;
      resolved_product_id: string | null;
    }
  | { ok: false; message: string };

export async function getMerchantCatalogRequestStatusAction(
  requestId: string,
): Promise<MerchantCatalogRequestStatusResult> {
  const idParse = z.string().uuid().safeParse(requestId);
  if (!idParse.success) {
    return { ok: false, message: "Μη έγκυρο id αίτησης." };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { ok: false, message: "Απαιτείται σύνδεση." };
  }

  const accessibleIds = await listAccessibleVendorIds(supabase, actor.userId);
  const fetched = await fetchCatalogProductRequestById(supabase, idParse.data);
  if (fetched.error) {
    return { ok: false, message: fetched.errorMessage ?? "Αδυναμία φόρτωσης αιτήσης." };
  }
  if (!fetched.data || !accessibleIds.includes(fetched.data.vendor_id)) {
    return { ok: true, found: false };
  }

  const row = fetched.data;
  return {
    ok: true,
    found: true,
    id: row.id,
    status: row.status,
    rejection_reason: row.rejection_reason,
    resolved_product_id: row.resolved_product_id,
  };
}
