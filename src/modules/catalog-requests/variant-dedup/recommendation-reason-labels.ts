import type { CatalogApprovalRecommendationReason } from "./types";

export const APPROVAL_RECOMMENDATION_REASON_LABELS: Record<
  CatalogApprovalRecommendationReason,
  string
> = {
  match_reviewed_product: "Η ταύτιση έχει ήδη αξιολογηθεί από admin.",
  merchant_selected_product: "Ο έμπορος επέλεξε υπάρχον προϊόν καταλόγου.",
  prior_approved_same_variant: "Ο ίδιος έμπορος έχει ήδη εγκεκριμένη αίτηση για την ίδια παραλλαγή.",
  vendor_has_live_offer: "Υπάρχει ήδη ενεργή προσφορά για αυτό το προϊόν.",
  high_confidence_match: "Υψηλή βεβαιότητα ταύτισης με υπάρχον προϊόν (επιβεβαιωμένη παραλλαγή).",
  canonical_duplicate_for_vendor: "Ίδια παραλλαγή προϊόντος για αυτόν τον έμπορο.",
  sparse_variant_metadata: "Λιγές πληροφορίες παραλλαγής — απαιτείται κρίση admin.",
  no_match_candidate: "Δεν βρέθηκε δημοσιευμένο προϊόν για αυτόματη σύνδεση.",
  tenant_catalog_same_variant: "Υπάρχει ήδη ίδιο προϊόν στον κατάλογο tenant (ταύτιση παραλλαγής).",
  pending_sibling_same_variant: "Υπάρχει άλλη εκκρεμής αίτηση με την ίδια παραλλαγή.",
  candidate_variant_mismatch: "Το προτεινόμενο προϊόν δεν ταιριάζει στην παραλλαγή της αίτησης.",
  weak_catalog_hint: "Πιθανό παρόμοιο προϊόν στον κατάλογο (ατελή στοιχεία παραλλαγής).",
};

export function formatApprovalRecommendationReasons(
  reasons: CatalogApprovalRecommendationReason[],
): string[] {
  return reasons.map((reason) => APPROVAL_RECOMMENDATION_REASON_LABELS[reason] ?? reason);
}
