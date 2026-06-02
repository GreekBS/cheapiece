import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProvisionOfferDebugContext } from "@/lib/debug/provision-offer-debug";
import {
  isProvisionOfferDebugEnabled,
  logProvisionOfferDebugEvent,
} from "@/lib/debug/provision-offer-debug";
import { invalidateOfferProductCache } from "@/modules/offers/services/invalidate-offer-product-cache";
import { provisionStoreOfferFromCatalogRequestRpc } from "@/modules/offers/queries/provision-store-offer-from-catalog-request-rpc";

export type ProvisionStoreOfferFromCatalogRequestOutcome =
  | { ok: true; offerId: string | null; skipped: boolean; warning?: string }
  | { ok: false; message: string };

/**
 * Provisions commerce offer after catalog approval (new product or link).
 * Does not roll back catalog state on failure.
 */
export async function provisionStoreOfferFromCatalogRequest(
  supabase: SupabaseClient,
  requestId: string,
  resolvedProductId: string,
  debugContext?: Omit<ProvisionOfferDebugContext, "requestId" | "resolvedProductId">,
): Promise<ProvisionStoreOfferFromCatalogRequestOutcome> {
  const result = await provisionStoreOfferFromCatalogRequestRpc(supabase, requestId, {
    ...debugContext,
    resolvedProductId,
    caller: debugContext?.caller ?? "provisionStoreOfferFromCatalogRequest",
  });

  if (!result.ok) {
    logProvisionOfferDebugEvent("provision_service_failed", {
      requestId,
      resolvedProductId,
      caller: debugContext?.caller ?? "provisionStoreOfferFromCatalogRequest",
      userId: debugContext?.userId,
    }, {
      code: result.code,
      message: result.message,
      debugRawMessage: result.debugRawMessage ?? null,
    });

    const prefix = "Η αίτηση εγκρίθηκε, αλλά η δημιουργία προσφοράς απέτυχε: ";
    const detail =
      isProvisionOfferDebugEnabled() && result.debugRawMessage
        ? `${result.message} (raw: ${result.debugRawMessage})`
        : result.message;
    return {
      ok: false,
      message: `${prefix}${detail}`,
    };
  }

  if (result.skipped) {
    return {
      ok: true,
      offerId: null,
      skipped: true,
      warning: result.skipReason,
    };
  }

  await invalidateOfferProductCache(supabase, resolvedProductId);

  return {
    ok: true,
    offerId: result.offerId,
    skipped: false,
  };
}
