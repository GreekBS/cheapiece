import type { SupabaseClient } from "@supabase/supabase-js";

import {
  formatProvisionOfferDebugSkipMessage,
  formatProvisionOfferDebugUserMessage,
  isProvisionOfferDebugEnabled,
  logProvisionOfferDebugEvent,
  logProvisionOfferPostgrestError,
  logProvisionOfferSessionContext,
  type ProvisionOfferDebugContext,
} from "@/lib/debug/provision-offer-debug";

function mapRpcErrorMessage(message: string): { code: string; message: string } {
  const m = message.toLowerCase();
  if (m.includes("forbidden") || m.includes("unauthenticated")) {
    return { code: "FORBIDDEN", message: "Μη εξουσιοδοτημένη ενέργεια." };
  }
  if (m.includes("not_found") && !m.includes("product_not_found")) {
    return { code: "NOT_FOUND", message: "Η αίτηση δεν βρέθηκε." };
  }
  if (m.includes("request_not_approved")) {
    return { code: "REQUEST_NOT_APPROVED", message: "Η αίτηση δεν είναι εγκεκριμένη." };
  }
  if (m.includes("request_withdrawn")) {
    return { code: "WITHDRAWN", message: "Η αίτηση ανακλήθηκε από τον έμπορο." };
  }
  if (m.includes("missing_resolved_product")) {
    return { code: "MISSING_PRODUCT", message: "Η αίτηση δεν έχει resolved_product_id." };
  }
  if (m.includes("product_not_found")) {
    return { code: "PRODUCT_NOT_FOUND", message: "Το προϊόν δεν βρέθηκε." };
  }
  if (m.includes("product_not_active")) {
    return { code: "PRODUCT_NOT_ACTIVE", message: "Το προϊόν δεν είναι ενεργό." };
  }
  if (m.includes("tenant_mismatch")) {
    return { code: "TENANT_MISMATCH", message: "Ασυμβατότητα tenant." };
  }
  if (m.includes("invalid_vendor")) {
    return { code: "INVALID_VENDOR", message: "Μη έγκυρο κατάστημα." };
  }
  if (m.includes("invalid_price") || m.includes("invalid_stock")) {
    return { code: "INVALID_INTENT", message: "Μη έγκυρη τιμή ή απόθεμα στην αίτηση." };
  }
  return { code: "RPC_ERROR", message };
}

export type ProvisionStoreOfferFromCatalogRequestResult =
  | { ok: true; offerId: string | null; skipped: boolean; skipReason?: string }
  | {
      ok: false;
      code: string;
      message: string;
      /** Present when DEBUG_PROVISION_OFFER=1 — raw PostgREST / SQL text */
      debugRawMessage?: string;
    };

/**
 * Commerce bridge: upsert store_products from approved catalog request (catalog RPCs unchanged).
 */
export async function provisionStoreOfferFromCatalogRequestRpc(
  supabase: SupabaseClient,
  requestId: string,
  debugContext?: Omit<ProvisionOfferDebugContext, "requestId">,
): Promise<ProvisionStoreOfferFromCatalogRequestResult> {
  const ctx: ProvisionOfferDebugContext = {
    requestId,
    caller: debugContext?.caller ?? "provisionStoreOfferFromCatalogRequestRpc",
    userId: debugContext?.userId,
    resolvedProductId: debugContext?.resolvedProductId,
  };

  await logProvisionOfferSessionContext(supabase, ctx);

  if (isProvisionOfferDebugEnabled()) {
    logProvisionOfferDebugEvent("rpc_call_start", ctx, {
      rpc: "provision_store_offer_from_catalog_request",
    });
  }

  const { data, error } = await supabase.rpc("provision_store_offer_from_catalog_request", {
    p_request_id: requestId,
  });

  if (error) {
    const mapped = mapRpcErrorMessage(error.message);
    logProvisionOfferPostgrestError(error, ctx, { mappedCode: mapped.code, data });
    const message = formatProvisionOfferDebugUserMessage(mapped.message, error, mapped.code);
    return {
      ok: false,
      code: mapped.code,
      message,
      debugRawMessage: error.message,
    };
  }

  if (data === null || data === undefined) {
    const skipReason = formatProvisionOfferDebugSkipMessage(
      "Δεν δόθηκε τιμή στην αίτηση — δεν δημιουργήθηκε προσφορά.",
      data,
    );
    logProvisionOfferDebugEvent("rpc_returned_null", ctx, { data });
    return {
      ok: true,
      offerId: null,
      skipped: true,
      skipReason,
    };
  }

  if (typeof data !== "string") {
    logProvisionOfferDebugEvent("rpc_invalid_return_type", ctx, { dataType: typeof data, data });
    return { ok: false, code: "RPC_ERROR", message: "Άκυρη απάντηση από τον server." };
  }

  if (isProvisionOfferDebugEnabled()) {
    logProvisionOfferDebugEvent("rpc_success", ctx, { offerId: data });
  }

  return { ok: true, offerId: data, skipped: false };
}
