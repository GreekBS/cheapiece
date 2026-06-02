import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseSchemaRepository } from "@/modules/catalog-schema";
import { approveAndPublishCatalogProductRequest } from "@/modules/catalog-products";
import { approveCatalogRequestLinkExistingRpc } from "@/modules/catalog-products/queries/approve-catalog-request-link-existing-rpc";

import { logProvisionOfferDebugEvent } from "@/lib/debug/provision-offer-debug";
import { provisionStoreOfferFromCatalogRequest } from "@/modules/offers/services/provision-store-offer-from-catalog-request";

import {
  assertCreateApprovalAllowed,
  assertLinkApprovalAllowed,
  logApprovalLinkRecommended,
} from "../variant-dedup";

import {
  fetchCatalogProductRequestById,
  catalogRequestModerationBlockedMessage,
  updateCatalogProductRequestRejection,
} from "../queries/catalog-product-request-queries";

export type AdminCatalogApprovalResult =
  | { ok: true; productId: string; warning?: string; provisionFailed?: boolean }
  | { ok: false; code: string; message: string };

export type ApproveCatalogProductRequestInput = {
  requestId: string;
  finalSlug: string;
  title: string;
  brand: string | null;
  model: string | null;
  categoryId: string | null;
  adminNote?: string | null;
  confirmCreateDespiteLinkRecommendation?: boolean;
  createOverrideReason?: string | null;
};

export async function approvePendingCatalogProductRequest(
  supabase: SupabaseClient,
  adminUserId: string,
  input: ApproveCatalogProductRequestInput,
): Promise<AdminCatalogApprovalResult> {
  const fetched = await fetchCatalogProductRequestById(supabase, input.requestId);
  if (fetched.error) {
    return {
      ok: false,
      code: "QUERY_FAILED",
      message: fetched.errorMessage ?? "Αδυναμία φόρτωσης αιτήσης καταλόγου.",
    };
  }
  if (!fetched.data) {
    return { ok: false, code: "NOT_FOUND", message: "Η αίτηση δεν βρέθηκε." };
  }
  const row = fetched.data;
  const moderationBlocked = catalogRequestModerationBlockedMessage(row.status);
  if (moderationBlocked) {
    return {
      ok: false,
      code: row.status === "withdrawn" ? "WITHDRAWN" : "INVALID_STATE",
      message: moderationBlocked,
    };
  }

  const createGuard = await assertCreateApprovalAllowed(supabase, {
    requestId: input.requestId,
    adminUserId,
    overrideConfirmed: input.confirmCreateDespiteLinkRecommendation === true,
    overrideReason: input.createOverrideReason ?? null,
    adminOverrides: {
      brand: input.brand ?? null,
      model: input.model ?? null,
      categoryId: input.categoryId ?? null,
    },
  });

  if (!createGuard.allowed) {
    return {
      ok: false,
      code: createGuard.code,
      message: createGuard.message,
    };
  }

  const repo = new SupabaseSchemaRepository(supabase);

  const publish = await approveAndPublishCatalogProductRequest(
    supabase,
    repo,
    {
      requestId: input.requestId,
      finalSlug: input.finalSlug,
      title: input.title,
      brand: input.brand,
      model: input.model,
      categoryId: input.categoryId,
      adminNote: input.adminNote,
    },
    { now: new Date().toISOString() },
  );

  if (!publish.ok) {
    return publish;
  }

  logProvisionOfferDebugEvent("admin_approve_publish_ok", {
    requestId: input.requestId,
    userId: adminUserId,
    resolvedProductId: publish.productId,
    caller: "approvePendingCatalogProductRequest",
  });

  const provision = await provisionStoreOfferFromCatalogRequest(
    supabase,
    input.requestId,
    publish.productId,
    {
      userId: adminUserId,
      caller: "approvePendingCatalogProductRequest",
    },
  );

  if (!provision.ok) {
    logProvisionOfferDebugEvent("admin_approve_provision_failed", {
      requestId: input.requestId,
      userId: adminUserId,
      resolvedProductId: publish.productId,
      caller: "approvePendingCatalogProductRequest",
    }, { warning: provision.message });

    return {
      ok: true,
      productId: publish.productId,
      warning: provision.message,
      provisionFailed: true,
    };
  }

  return {
    ok: true,
    productId: publish.productId,
    warning: provision.warning,
    provisionFailed: false,
  };
}

export async function rejectPendingCatalogProductRequest(
  supabase: SupabaseClient,
  adminUserId: string,
  input: { requestId: string; rejectionReason: string; adminNote?: string | null },
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const fetched = await fetchCatalogProductRequestById(supabase, input.requestId);
  if (fetched.error) {
    return {
      ok: false,
      code: "QUERY_FAILED",
      message: fetched.errorMessage ?? "Αδυναμία φόρτωσης αιτήσης καταλόγου.",
    };
  }
  if (!fetched.data) {
    return { ok: false, code: "NOT_FOUND", message: "Η αίτηση δεν βρέθηκε." };
  }
  const row = fetched.data;
  const moderationBlocked = catalogRequestModerationBlockedMessage(row.status);
  if (moderationBlocked) {
    return {
      ok: false,
      code: row.status === "withdrawn" ? "WITHDRAWN" : "INVALID_STATE",
      message: moderationBlocked,
    };
  }

  const { error } = await updateCatalogProductRequestRejection(supabase, {
    id: input.requestId,
    reviewed_by_user_id: adminUserId,
    rejection_reason: input.rejectionReason,
    admin_note: input.adminNote,
  });

  if (error) {
    return { ok: false, code: "UPDATE_FAILED", message: error.message };
  }

  const { data: verify } = await supabase
    .from("catalog_product_requests")
    .select("id")
    .eq("id", input.requestId)
    .eq("status", "rejected")
    .maybeSingle();

  if (!verify) {
    return { ok: false, code: "CONCURRENT_UPDATE", message: "Η αίτηση άλλαξε κατά την απόρριψη." };
  }

  return { ok: true };
}

export type LinkCatalogProductRequestToExistingInput = {
  requestId: string;
  productId: string;
  adminNote?: string | null;
  confirmLinkDespiteVariantMismatch?: boolean;
  linkOverrideReason?: string | null;
};

/**
 * Approve pending request by linking to existing published catalog product (no new products row).
 */
export async function linkPendingCatalogProductRequestToExisting(
  supabase: SupabaseClient,
  adminUserId: string,
  input: LinkCatalogProductRequestToExistingInput,
): Promise<AdminCatalogApprovalResult> {
  const fetched = await fetchCatalogProductRequestById(supabase, input.requestId);
  if (fetched.error) {
    return {
      ok: false,
      code: "QUERY_FAILED",
      message: fetched.errorMessage ?? "Αδυναμία φόρτωσης αιτήσης καταλόγου.",
    };
  }
  if (!fetched.data) {
    return { ok: false, code: "NOT_FOUND", message: "Η αίτηση δεν βρέθηκε." };
  }
  const moderationBlocked = catalogRequestModerationBlockedMessage(fetched.data.status);
  if (moderationBlocked) {
    return {
      ok: false,
      code: fetched.data.status === "withdrawn" ? "WITHDRAWN" : "INVALID_STATE",
      message: moderationBlocked,
    };
  }

  const linkGuard = await assertLinkApprovalAllowed(supabase, {
    request: fetched.data,
    productId: input.productId,
    adminUserId,
    overrideConfirmed: input.confirmLinkDespiteVariantMismatch === true,
    overrideReason: input.linkOverrideReason ?? null,
  });

  if (!linkGuard.allowed) {
    return {
      ok: false,
      code: linkGuard.code,
      message: linkGuard.message,
    };
  }

  const link = await approveCatalogRequestLinkExistingRpc(supabase, {
    requestId: input.requestId,
    productId: input.productId,
    adminNote: input.adminNote?.trim() ?? "",
  });

  if (!link.ok) {
    return link;
  }

  await logApprovalLinkRecommended(supabase, {
    requestId: input.requestId,
    vendorId: fetched.data.vendor_id,
    adminUserId,
    productId: link.productId,
  });

  const provision = await provisionStoreOfferFromCatalogRequest(
    supabase,
    input.requestId,
    link.productId,
    {
      userId: adminUserId,
      caller: "linkPendingCatalogProductRequestToExisting",
    },
  );

  if (!provision.ok) {
    logProvisionOfferDebugEvent("admin_link_provision_failed", {
      requestId: input.requestId,
      userId: adminUserId,
      resolvedProductId: link.productId,
      caller: "linkPendingCatalogProductRequestToExisting",
    }, { warning: provision.message });

    return {
      ok: true,
      productId: link.productId,
      warning: provision.message,
      provisionFailed: true,
    };
  }

  return {
    ok: true,
    productId: link.productId,
    warning: provision.warning,
    provisionFailed: false,
  };
}
