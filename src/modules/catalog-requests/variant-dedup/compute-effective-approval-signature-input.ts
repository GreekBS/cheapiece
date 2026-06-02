import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

import type { VariantSignatureInput } from "./types";

export type AdminApprovalSignatureOverrides = {
  brand?: string | null;
  model?: string | null;
  categoryId?: string | null;
};

/**
 * Merges stored request identity with admin form overrides for submit-time canonical checks.
 * GTIN, MPN, and attribute_payload always come from the stored request (not editable on form).
 */
export function computeEffectiveApprovalSignatureInput(
  request: CatalogProductRequestRow,
  overrides?: AdminApprovalSignatureOverrides,
): VariantSignatureInput {
  return {
    category_id:
      overrides?.categoryId !== undefined ? overrides.categoryId : request.category_id,
    brand: overrides?.brand !== undefined ? overrides.brand : request.brand,
    model: overrides?.model !== undefined ? overrides.model : request.model,
    gtin: request.gtin,
    mpn: request.mpn,
    attribute_payload: request.attribute_payload,
  };
}
