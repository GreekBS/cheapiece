import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredCatalogProductRequestAttributePayload } from "@/modules/catalog-requests/types/phase2-schema-baseline";

import type { MatchSnapshotPayload } from "../types/match-types";

export type SubmitCatalogRequestWithMatchRpcInput = {
  tenant_id: string;
  vendor_id: string;
  submitted_by_user_id: string;
  category_id: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  slug_suggestion: string;
  gtin: string | null;
  mpn: string | null;
  schema_version_id: string | null;
  attribute_payload: StoredCatalogProductRequestAttributePayload;
  requested_price_amount?: number | null;
  requested_stock_quantity?: number | null;
  requested_price_currency?: string | null;
};

export async function submitCatalogProductRequestWithMatchRpc(
  supabase: SupabaseClient,
  request: SubmitCatalogRequestWithMatchRpcInput,
  matchSnapshot: MatchSnapshotPayload,
  merchantSelectedProductId: string | null,
): Promise<{ id: string } | { error: Error }> {
  const p_request = {
    tenant_id: request.tenant_id,
    vendor_id: request.vendor_id,
    submitted_by_user_id: request.submitted_by_user_id,
    category_id: request.category_id,
    title: request.title,
    brand: request.brand,
    model: request.model,
    slug_suggestion: request.slug_suggestion,
    gtin: request.gtin,
    mpn: request.mpn,
    status: "pending",
    schema_version_id: request.schema_version_id,
    attribute_payload: request.attribute_payload,
    requested_price_amount: request.requested_price_amount ?? null,
    requested_stock_quantity: request.requested_stock_quantity ?? null,
    requested_price_currency: request.requested_price_currency ?? null,
  };

  const { data, error } = await supabase.rpc("submit_catalog_product_request_with_match", {
    p_request,
    p_match_snapshot: matchSnapshot,
    p_merchant_selected_product_id: merchantSelectedProductId,
  });

  if (error) {
    return { error: new Error(error.message) };
  }

  if (!data || typeof data !== "string") {
    return { error: new Error("submit_catalog_product_request_with_match returned no id") };
  }

  return { id: data };
}
