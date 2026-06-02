import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProductDefinitionRevisionRow,
  ProposedProductDefinitionPayload,
} from "@/modules/catalog-requests/types/product-definition-revision";

export async function fetchBaselinePublicationProductId(
  supabase: SupabaseClient,
  productId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("product_catalog_publications")
    .select("product_id")
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { product_id: string }).product_id;
}

export async function fetchPendingRevisionForProduct(
  supabase: SupabaseClient,
  vendorId: string,
  productId: string,
): Promise<ProductDefinitionRevisionRow | null> {
  const { data, error } = await supabase
    .from("product_definition_revisions")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("product_id", productId)
    .eq("status", "pending_review")
    .maybeSingle();

  if (error || !data) return null;
  return data as ProductDefinitionRevisionRow;
}

export async function insertPendingProductDefinitionRevision(
  supabase: SupabaseClient,
  args: {
    tenantId: string;
    vendorId: string;
    productId: string;
    sourceCatalogRequestId: string;
    baselinePublicationProductId: string;
    proposedPayload: ProposedProductDefinitionPayload;
    changedFields: string[];
    diffSummary: Record<string, unknown>;
    submittedBy: string;
  },
): Promise<{ ok: true; revision: ProductDefinitionRevisionRow } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("product_definition_revisions")
    .insert({
      tenant_id: args.tenantId,
      vendor_id: args.vendorId,
      product_id: args.productId,
      source_catalog_request_id: args.sourceCatalogRequestId,
      baseline_publication_product_id: args.baselinePublicationProductId,
      status: "pending_review",
      proposed_payload: args.proposedPayload,
      changed_fields: args.changedFields,
      diff_summary: args.diffSummary,
      submitted_by: args.submittedBy,
      submitted_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        message: "Υπάρχει ήδη αίτηση αναθεώρησης σε εξέλιξη για αυτό το προϊόν.",
      };
    }
    return { ok: false, message: error.message };
  }

  return { ok: true, revision: data as ProductDefinitionRevisionRow };
}
