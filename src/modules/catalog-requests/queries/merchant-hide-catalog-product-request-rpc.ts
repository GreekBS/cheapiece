import type { SupabaseClient } from "@supabase/supabase-js";

export async function merchantHideCatalogProductRequestRpc(
  supabase: SupabaseClient,
  requestId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("merchant_hide_catalog_product_request", {
    p_request_id: requestId,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not_found")) {
      return { ok: false, message: "Η εγγραφή δεν βρέθηκε." };
    }
    if (msg.includes("forbidden")) {
      return { ok: false, message: "Δεν έχετε δικαίωμα αφαίρεσης αυτού του προϊόντος." };
    }
    if (msg.includes("unauthenticated")) {
      return { ok: false, message: "Απαιτείται σύνδεση." };
    }
    return { ok: false, message: error.message || "Αποτυχία αφαίρεσης από τη λίστα." };
  }

  return { ok: true };
}
