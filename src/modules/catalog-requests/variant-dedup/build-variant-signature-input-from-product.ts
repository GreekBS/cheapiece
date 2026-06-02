import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchProductCatalogPublicationByProductId } from "@/modules/catalog-products/queries/product-publication-queries";
import { fetchActiveProductIdentityById } from "@/modules/catalog-products-read/queries/product-identity-read-queries";

import type { VariantSignatureInput } from "./types";

/**
 * Builds a VariantSignatureInput from published catalog truth (products + publication).
 */
export async function buildVariantSignatureInputFromProduct(
  supabase: SupabaseClient,
  productId: string,
  tenantId?: string,
): Promise<VariantSignatureInput | null> {
  const [identity, publication] = await Promise.all([
    fetchActiveProductIdentityById(supabase, productId, tenantId),
    fetchProductCatalogPublicationByProductId(supabase, productId),
  ]);

  if (!identity) {
    return null;
  }

  const scalars = publication?.display_snapshot?.scalars;

  return {
    category_id: identity.categoryId,
    brand: identity.brand,
    model: identity.model,
    gtin: scalars?.gtin ?? null,
    mpn: scalars?.mpn ?? null,
    attribute_payload: publication
      ? { values: publication.attribute_values ?? {} }
      : null,
  };
}
