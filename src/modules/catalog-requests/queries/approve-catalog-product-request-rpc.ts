import type { SupabaseClient } from "@supabase/supabase-js";

export type ApproveCatalogProductRequestRpcInput = {
  requestId: string;
  finalSlug: string;
  title: string;
  brand: string;
  model: string;
  categoryId: string | null;
  adminNote: string;
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
  if (m.includes("request_not_updated")) {
    return {
      code: "CONCURRENT_UPDATE",
      message: "Η αίτηση δεν ενημερώθηκε. Δοκιμάστε ξανά.",
    };
  }
  return { code: "RPC_ERROR", message };
}

/**
 * @deprecated Phase 3A — use approveCatalogRequestPublishRpc via approveAndPublishCatalogProductRequest.
 * Legacy RPC without product_catalog_publications.
 */
export async function approveCatalogProductRequestRpc(
  supabase: SupabaseClient,
  input: ApproveCatalogProductRequestRpcInput,
): Promise<{ ok: true; productId: string } | { ok: false; code: string; message: string }> {
  const { data, error } = await supabase.rpc("approve_catalog_product_request", {
    p_request_id: input.requestId,
    p_final_slug: input.finalSlug,
    p_title: input.title,
    p_brand: input.brand,
    p_model: input.model,
    p_category_id: input.categoryId,
    p_admin_note: input.adminNote,
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
