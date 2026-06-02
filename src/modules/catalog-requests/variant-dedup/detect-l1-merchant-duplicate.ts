import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import { computeMerchantVariantSignature } from "./variant-signatures";
import type { L1DuplicateDetectionResult, MerchantVariantSignatureInput } from "./types";
import { isVariantDedupEnabled } from "./variant-dedup-flags";

const L1_DEDUP_SELECT =
  "id, vendor_id, status, title, brand, model, gtin, mpn, category_id, slug_suggestion, attribute_payload, merchant_hidden_at";

function toSignatureInput(row: CatalogProductRequestRow): MerchantVariantSignatureInput {
  return {
    vendor_id: row.vendor_id,
    category_id: row.category_id,
    title: row.title,
    brand: row.brand,
    model: row.model,
    gtin: row.gtin,
    mpn: row.mpn,
    slug_suggestion: row.slug_suggestion,
    attribute_payload: row.attribute_payload,
  };
}

async function listVendorRequestsForL1Dedup(
  supabase: SupabaseClient,
  vendorId: string,
): Promise<CatalogProductRequestRow[]> {
  const { data, error } = await supabase
    .from("catalog_product_requests")
    .select(L1_DEDUP_SELECT)
    .eq("vendor_id", vendorId)
    .in("status", ["pending", "approved"])
    .is("merchant_hidden_at", null);

  if (error || !data) {
    return [];
  }

  return data as CatalogProductRequestRow[];
}

/**
 * Soft L1 duplicate detection — never blocks; used for warnings + logging only.
 * Excludes withdrawn, rejected, and hidden requests.
 */
export async function detectL1MerchantDuplicateSubmission(
  supabase: SupabaseClient,
  input: MerchantVariantSignatureInput,
  excludeRequestId?: string | null,
): Promise<L1DuplicateDetectionResult> {
  const merchantVariantSignatureHash = computeMerchantVariantSignature(input);

  if (!isVariantDedupEnabled()) {
    return {
      isDuplicate: false,
      existingRequestId: null,
      merchantVariantSignatureHash,
    };
  }

  const rows = await listVendorRequestsForL1Dedup(supabase, input.vendor_id);

  for (const row of rows) {
    if (excludeRequestId && row.id === excludeRequestId) continue;
    const rowHash = computeMerchantVariantSignature(toSignatureInput(row));
    if (rowHash === merchantVariantSignatureHash) {
      return {
        isDuplicate: true,
        existingRequestId: row.id,
        merchantVariantSignatureHash,
      };
    }
  }

  return {
    isDuplicate: false,
    existingRequestId: null,
    merchantVariantSignatureHash,
  };
}

export const L1_DUPLICATE_WARNING_MESSAGE =
  "Έχετε ήδη υποβάλει το ίδιο προϊόν. Μπορείτε να συνεχίσετε ή να δείτε την υπάρχουσα αίτηση.";
