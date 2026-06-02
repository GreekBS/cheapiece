import type { SupabaseClient } from "@supabase/supabase-js";

export type ApproveCatalogRequestLinkExistingRpcInput = {
  requestId: string;
  productId: string;
  adminNote: string;
};

function mapRpcErrorMessage(message: string): { code: string; message: string } {
  const m = message.toLowerCase();
  if (m.includes("forbidden") || m.includes("unauthenticated")) {
    return { code: "FORBIDDEN", message: "Μη εξουσιοδοτημένη ενέργεια." };
  }
  if (m.includes("not_found") && !m.includes("product_not_found") && !m.includes("match_not_found")) {
    return { code: "NOT_FOUND", message: "Η αίτηση δεν βρέθηκε." };
  }
  if (m.includes("request_withdrawn")) {
    return { code: "WITHDRAWN", message: "Η αίτηση ανακλήθηκε από τον έμπορο." };
  }
  if (m.includes("invalid_state")) {
    return { code: "INVALID_STATE", message: "Η αίτηση έχει ήδη αξιολογηθεί." };
  }
  if (m.includes("tenant_mismatch")) {
    return { code: "TENANT_MISMATCH", message: "Το προϊόν ανήκει σε άλλο tenant." };
  }
  if (m.includes("product_not_found")) {
    return { code: "PRODUCT_NOT_FOUND", message: "Το προϊόν δεν βρέθηκε." };
  }
  if (m.includes("product_not_active")) {
    return { code: "PRODUCT_NOT_ACTIVE", message: "Το προϊόν δεν είναι ενεργό." };
  }
  if (m.includes("product_not_published")) {
    return {
      code: "PRODUCT_NOT_PUBLISHED",
      message: "Το προϊόν δεν έχει δημοσίευση καταλόγου. Χρησιμοποιήστε έγκριση νέου προϊόντος.",
    };
  }
  if (m.includes("match_not_found")) {
    return { code: "MATCH_NOT_FOUND", message: "Δεν βρέθηκε εγγραφή ταξινόμησης για την αίτηση." };
  }
  if (m.includes("request_not_updated")) {
    return {
      code: "CONCURRENT_UPDATE",
      message: "Η αίτηση δεν ενημερώθηκε. Δοκιμάστε ξανά.",
    };
  }
  if (m.includes("invalid_input")) {
    return { code: "INVALID_INPUT", message: "Μη έγκυρα δεδομένα." };
  }
  return { code: "RPC_ERROR", message };
}

/**
 * Atomic link-approve: resolves pending request to existing published product.
 * Does not insert into products or product_catalog_publications.
 */
export async function approveCatalogRequestLinkExistingRpc(
  supabase: SupabaseClient,
  input: ApproveCatalogRequestLinkExistingRpcInput,
): Promise<{ ok: true; productId: string } | { ok: false; code: string; message: string }> {
  const { data, error } = await supabase.rpc("approve_catalog_request_link_existing", {
    p_request_id: input.requestId,
    p_product_id: input.productId,
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
