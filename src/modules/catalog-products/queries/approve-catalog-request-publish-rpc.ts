import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProductPublicationIndexUpsert } from "@/modules/catalog-products-index/types/product-publication-index";

import type { ProductPublicationDraft } from "../types/product-publication";

export type ApproveCatalogRequestPublishRpcInput = {
  requestId: string;
  finalSlug: string;
  title: string;
  brand: string;
  model: string;
  categoryId: string | null;
  adminNote: string;
  publication: ProductPublicationDraft;
  index?: ProductPublicationIndexUpsert | null;
};

function mapRpcErrorMessage(message: string): { code: string; message: string } {
  const m = message.toLowerCase();
  if (m.includes("forbidden")) {
    return { code: "FORBIDDEN", message: "Μη εξουσιοδοτημένη ενέργεια." };
  }
  if (m.includes("not_found")) {
    return { code: "NOT_FOUND", message: "Η αίτηση δεν βρέθηκε." };
  }
  if (m.includes("request_withdrawn")) {
    return { code: "WITHDRAWN", message: "Η αίτηση ανακλήθηκε από τον έμπορο." };
  }
  if (m.includes("invalid_state")) {
    return { code: "INVALID_STATE", message: "Η αίτηση έχει ήδη αξιολογηθεί." };
  }
  if (m.includes("slug_conflict") || m.includes("unique") || m.includes("duplicate")) {
    return {
      code: "SLUG_CONFLICT",
      message: "Υπάρχει ήδη προϊόν με αυτό το slug στον tenant.",
    };
  }
  if (m.includes("invalid_slug")) {
    return { code: "INVALID_SLUG", message: "Μη έγκυρο slug." };
  }
  if (m.includes("invalid_publication")) {
    return { code: "INVALID_PUBLICATION", message: "Μη έγκυρο publication payload." };
  }
  if (m.includes("request_not_updated")) {
    return {
      code: "CONCURRENT_UPDATE",
      message: "Η αίτηση δεν ενημερώθηκε. Δοκιμάστε ξανά.",
    };
  }
  return { code: "RPC_ERROR", message };
}

/**
 * Atomic DB write: products + product_catalog_publications + request approval.
 * Business logic and snapshot building run in application orchestration only.
 */
export async function approveCatalogRequestPublishRpc(
  supabase: SupabaseClient,
  input: ApproveCatalogRequestPublishRpcInput,
): Promise<{ ok: true; productId: string } | { ok: false; code: string; message: string }> {
  const pub = input.publication;

  const { data, error } = await supabase.rpc("approve_catalog_request_publish", {
    p_request_id: input.requestId,
    p_final_slug: input.finalSlug,
    p_title: input.title,
    p_brand: input.brand,
    p_model: input.model,
    p_category_id: input.categoryId,
    p_admin_note: input.adminNote,
    p_publication: {
      schema_version_id: pub.schema_version_id,
      validation_mode: pub.validation_mode,
      locale: pub.locale,
      attribute_values: pub.attribute_values,
      display_snapshot: pub.display_snapshot,
      facet_snapshot: pub.facet_snapshot,
      published_at: pub.published_at,
    },
    p_index: input.index
      ? {
          facet_index: input.index.facet_index,
          has_publication: input.index.has_publication,
          published_at: input.index.published_at,
        }
      : null,
  });

  if (error) {
    const mapped = mapRpcErrorMessage(error.message);
    return { ok: false, code: mapped.code, message: mapped.message };
  }

  if (typeof data !== "string" || !data) {
    return { ok: false, code: "RPC_ERROR", message: "Άκυρη απάντηση από τον server." };
  }

  return { ok: true, productId: data };
}
