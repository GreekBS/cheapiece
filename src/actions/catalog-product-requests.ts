"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { merchantStoreBase, merchantStoreProductsPendingPath } from "@/lib/merchant/merchant-store-paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { submitCatalogProductRequestCoreFromFormData } from "@/modules/catalog-requests/services/submit-catalog-product-request-core";
import { submitCatalogProductRequestSchema } from "@/modules/catalog-requests/validations/catalog-product-request";
import type { MerchantFormLoadResult } from "@/modules/catalog-products-read/ui/dto/merchant-form-load-result.dto";
import { loadMerchantFormContract } from "@/modules/catalog-products-read/ui/server/load-merchant-form-contract";
import { listAccessibleVendorIds } from "@/modules/vendors/queries/vendor-queries";
import { fetchVendorTenantId } from "@/modules/catalog-requests/queries/catalog-product-request-queries";

export type CatalogProductRequestActionResult =
  | { ok: true; duplicateWarning?: { existingRequestId: string; message: string } }
  | { ok: false; message: string };

export async function loadMerchantFormContractAction(
  tenantId: string,
  categoryId: string | null,
): Promise<MerchantFormLoadResult> {
  const tenantParse = tenantId?.trim();
  if (!tenantParse) {
    return { mode: "legacy", categoryId: null, contract: null };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { mode: "legacy", categoryId: null, contract: null };
  }

  return loadMerchantFormContract(supabase, {
    tenantId: tenantParse,
    categoryId: categoryId?.trim() || null,
  });
}

export async function submitCatalogProductRequestAction(
  _prev: CatalogProductRequestActionResult | null,
  formData: FormData,
): Promise<CatalogProductRequestActionResult> {
  const rawCategory = (formData.get("categoryId") as string | null)?.trim() ?? "";
  const lockedVendorRaw = formData.get("lockedVendorId");
  const lockedVendorId =
    typeof lockedVendorRaw === "string" && lockedVendorRaw.trim().length > 0 ? lockedVendorRaw.trim() : null;
  const submittedVendorId = formData.get("vendorId");
  const effectiveVendorId = lockedVendorId ?? submittedVendorId;

  const parsed = submitCatalogProductRequestSchema.safeParse({
    vendorId: effectiveVendorId,
    categoryId: rawCategory,
    title: formData.get("title"),
    brand: formData.get("brand") || null,
    model: formData.get("model") || null,
    slugSuggestion: formData.get("slugSuggestion"),
    gtin: formData.get("gtin") || null,
    mpn: formData.get("mpn") || null,
    requestedPriceAmount: formData.get("requestedPriceAmount"),
    requestedStockQuantity: formData.get("requestedStockQuantity"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().formErrors.join("; ") || "Μη έγκυρα δεδομένα." };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { ok: false, message: "Απαιτείται σύνδεση." };
  }

  const accessible = await listAccessibleVendorIds(supabase, actor.userId);
  if (lockedVendorId && !accessible.includes(lockedVendorId)) {
    return { ok: false, message: "Δεν έχετε πρόσβαση σε αυτό το κατάστημα." };
  }

  const result = await submitCatalogProductRequestCoreFromFormData(supabase, {
    userId: actor.userId,
    accessibleVendorIds: accessible,
    payload: parsed.data,
    formData,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  if (result.duplicateWarning) {
    return { ok: true, duplicateWarning: result.duplicateWarning };
  }

  revalidatePath("/dashboard/catalog-requests");
  revalidatePath("/dashboard/catalog-requests/new");
  revalidatePath("/merchant/products/new");
  const vendorId = parsed.data.vendorId;
  revalidatePath(merchantStoreBase(vendorId));
  revalidatePath(`${merchantStoreBase(vendorId)}/products`);
  revalidatePath(`${merchantStoreBase(vendorId)}/products/requests/new`);
  revalidatePath(`${merchantStoreBase(vendorId)}/catalog-requests/new`);

  if (lockedVendorId) {
    redirect(merchantStoreProductsPendingPath(lockedVendorId));
  }

  return { ok: true };
}

/** Resolve tenant for vendor-scoped contract reload (client category change). */
export async function resolveVendorTenantIdAction(vendorId: string): Promise<string | null> {
  const id = vendorId?.trim();
  if (!id) return null;
  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) return null;
  const accessible = await listAccessibleVendorIds(supabase, actor.userId);
  if (!accessible.includes(id)) return null;
  return fetchVendorTenantId(supabase, id);
}
