type VariantDedupLogPayload = {
  event:
    | "variant.l1_duplicate_detected"
    | "variant.approval_link_recommended"
    | "variant.approval_create_override"
    | "variant.canonical_duplicate_prevented"
    | "variant.approval_link_variant_mismatch"
    | "variant.approval_link_override"
    | "variant.approval_link_sparse"
    | "variant.tenant_scan_truncated"
    | "variant.tenant_catalog_create_blocked"
    | "variant.pending_sibling_create_blocked"
    | "variant.concurrent_pending_detected";
  requestId?: string;
  vendorId?: string;
  adminUserId?: string;
  candidateProductId?: string | null;
  canonicalVariantSignatureHash?: string;
  merchantVariantSignatureHash?: string;
  actionTaken?: string;
  reasons?: string[];
  existingRequestId?: string | null;
  overrideReason?: string | null;
  matchStatus?: string;
  pendingSiblingRequestIds?: string[];
  blockReason?: string;
};

/** Structured info logs for variant dedup observability (stdout). */
export function logVariantDedupEvent(payload: VariantDedupLogPayload): void {
  // eslint-disable-next-line no-console -- intentional structured logging
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      domain: "catalog_variant_dedup",
      ...payload,
    }),
  );
}
