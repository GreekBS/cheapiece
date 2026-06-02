import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import { computeEffectiveApprovalSignatureInput } from "./compute-effective-approval-signature-input";
import { computeCanonicalVariantSignature } from "./variant-signatures";

const PENDING_SIBLING_SELECT =
  "id, vendor_id, status, category_id, brand, model, gtin, mpn, attribute_payload, merchant_hidden_at";

export type PendingSiblingResult = {
  requestIds: string[];
};

/**
 * Finds other pending requests from the same vendor with an identical strict canonical signature.
 */
export async function findPendingSiblingSameCanonical(
  supabase: SupabaseClient,
  params: {
    vendorId: string;
    excludeRequestId: string;
    canonicalHash: string;
  },
): Promise<PendingSiblingResult> {
  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select(PENDING_SIBLING_SELECT)
    .eq("vendor_id", params.vendorId)
    .eq("status", "pending")
    .is("merchant_hidden_at", null)
    .neq("id", params.excludeRequestId);

  if (error || !data) {
    return { requestIds: [] };
  }

  const requestIds: string[] = [];

  for (const row of data as CatalogProductRequestRow[]) {
    const input = computeEffectiveApprovalSignatureInput(row);
    const rowHash = computeCanonicalVariantSignature(input);
    if (rowHash === params.canonicalHash) {
      requestIds.push(row.id);
    }
  }

  return { requestIds };
}
