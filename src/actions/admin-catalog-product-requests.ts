"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logProvisionOfferDebugEvent } from "@/lib/debug/provision-offer-debug";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  approveCatalogProductRequestSchema,
  linkCatalogProductRequestToExistingSchema,
  rejectCatalogProductRequestSchema,
} from "@/modules/catalog-requests/validations/catalog-product-request";
import {
  approvePendingCatalogProductRequest,
  linkPendingCatalogProductRequestToExisting,
  rejectPendingCatalogProductRequest,
} from "@/modules/catalog-requests/services/admin-catalog-request-service";
import { searchPublishedProductsForTenant } from "@/modules/catalog-requests/queries/search-published-products-for-tenant";
import { fetchCatalogProductRequestById } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import {
  compareLinkVariantMatch,
  type LinkVariantMatchStatus,
} from "@/modules/catalog-requests/variant-dedup";

export type AdminCatalogRequestActionResult =
  | { ok: true; warning?: string }
  | { ok: false; message: string };

function finishAdminCatalogAction(
  requestId: string,
  result: { ok: true; productId: string; warning?: string; provisionFailed?: boolean },
): AdminCatalogRequestActionResult {
  revalidatePath("/admin/catalog-requests");
  revalidatePath(`/admin/catalog-requests/${requestId}`);
  revalidatePath("/admin/products");
  revalidatePath(`/products/${result.productId}`);

  if (result.provisionFailed) {
    return { ok: true, warning: result.warning };
  }

  if (result.warning) {
    redirect(`/admin/catalog-requests?provisionWarning=${encodeURIComponent(result.warning)}`);
  }

  redirect("/admin/catalog-requests");
}

export async function approveCatalogProductRequestAction(
  _prev: AdminCatalogRequestActionResult | null,
  formData: FormData,
): Promise<AdminCatalogRequestActionResult> {
  const rawCat = (formData.get("categoryId") as string | null)?.trim() ?? "";
  const parsed = approveCatalogProductRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    finalSlug: formData.get("finalSlug"),
    title: formData.get("title"),
    brand: formData.get("brand") || null,
    model: formData.get("model") || null,
    categoryId: rawCat === "" ? null : rawCat,
    adminNote: formData.get("adminNote") || null,
    confirmCreateDespiteLinkRecommendation: formData.get("confirmCreateDespiteLinkRecommendation"),
    createOverrideReason: formData.get("createOverrideReason") || null,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().formErrors.join("; ") || "Μη έγκυρα δεδομένα." };
  }

  const { supabase, user } = await requirePlatformAdmin();

  logProvisionOfferDebugEvent("admin_action_approve_start", {
    requestId: parsed.data.requestId,
    userId: user.id,
    caller: "approveCatalogProductRequestAction",
  });

  const result = await approvePendingCatalogProductRequest(supabase, user.id, {
    requestId: parsed.data.requestId,
    finalSlug: parsed.data.finalSlug,
    title: parsed.data.title,
    brand: parsed.data.brand ?? null,
    model: parsed.data.model ?? null,
    categoryId: parsed.data.categoryId ?? null,
    adminNote: parsed.data.adminNote,
    confirmCreateDespiteLinkRecommendation: parsed.data.confirmCreateDespiteLinkRecommendation,
    createOverrideReason: parsed.data.createOverrideReason ?? null,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return finishAdminCatalogAction(parsed.data.requestId, result);
}

export async function rejectCatalogProductRequestAction(
  _prev: AdminCatalogRequestActionResult | null,
  formData: FormData,
): Promise<AdminCatalogRequestActionResult> {
  const parsed = rejectCatalogProductRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    rejectionReason: formData.get("rejectionReason"),
    adminNote: formData.get("adminNote") || null,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().formErrors.join("; ") || "Μη έγκυρα δεδομένα." };
  }

  const { supabase, user } = await requirePlatformAdmin();

  const result = await rejectPendingCatalogProductRequest(supabase, user.id, {
    requestId: parsed.data.requestId,
    rejectionReason: parsed.data.rejectionReason,
    adminNote: parsed.data.adminNote,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/catalog-requests");
  revalidatePath(`/admin/catalog-requests/${parsed.data.requestId}`);
  redirect("/admin/catalog-requests");
}

export async function linkCatalogProductRequestToExistingAction(
  _prev: AdminCatalogRequestActionResult | null,
  formData: FormData,
): Promise<AdminCatalogRequestActionResult> {
  const parsed = linkCatalogProductRequestToExistingSchema.safeParse({
    requestId: formData.get("requestId"),
    productId: formData.get("productId"),
    adminNote: formData.get("adminNote") || null,
    confirmLinkDespiteVariantMismatch: formData.get("confirmLinkDespiteVariantMismatch"),
    linkOverrideReason: formData.get("linkOverrideReason") || null,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().formErrors.join("; ") || "Μη έγκυρα δεδομένα." };
  }

  const { supabase, user } = await requirePlatformAdmin();

  const result = await linkPendingCatalogProductRequestToExisting(supabase, user.id, {
    requestId: parsed.data.requestId,
    productId: parsed.data.productId,
    adminNote: parsed.data.adminNote,
    confirmLinkDespiteVariantMismatch: parsed.data.confirmLinkDespiteVariantMismatch,
    linkOverrideReason: parsed.data.linkOverrideReason ?? null,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return finishAdminCatalogAction(parsed.data.requestId, result);
}

export type AdminCatalogProductSearchRow = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  category_name: string | null;
};

export async function searchCatalogProductsForLinkAction(input: {
  tenantId: string;
  q?: string;
  categoryId?: string | null;
}): Promise<AdminCatalogProductSearchRow[]> {
  const tenantId = input.tenantId?.trim();
  if (!tenantId) {
    return [];
  }

  await requirePlatformAdmin();
  const supabase = await createServerSupabaseClient();

  return searchPublishedProductsForTenant(supabase, tenantId, {
    q: input.q,
    categoryId: input.categoryId?.trim() || undefined,
    limit: 40,
  });
}

export type LinkVariantMatchCompareResult =
  | { ok: true; status: LinkVariantMatchStatus }
  | { ok: false; message: string };

export async function compareLinkVariantMatchAction(
  requestId: string,
  productId: string,
): Promise<LinkVariantMatchCompareResult> {
  const idParse = requestId?.trim();
  const productParse = productId?.trim();
  if (!idParse || !productParse) {
    return { ok: false, message: "Μη έγκυρα δεδομένα." };
  }

  const { supabase } = await requirePlatformAdmin();
  const fetched = await fetchCatalogProductRequestById(supabase, idParse);
  if (fetched.error || !fetched.data) {
    return { ok: false, message: "Η αίτηση δεν βρέθηκε." };
  }

  const comparison = await compareLinkVariantMatch(supabase, {
    request: fetched.data,
    productId: productParse,
  });

  return { ok: true, status: comparison.status };
}
