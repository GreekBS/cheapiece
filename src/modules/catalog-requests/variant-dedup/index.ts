export type { CatalogApprovalRecommendation, CatalogApprovalRecommendationMode } from "./types";

export { normalizeVariantAttributes } from "./normalize-variant-attributes";

export {

  computeCanonicalVariantSignature,

  computeMerchantVariantSignature,

  computeWeakCanonicalVariantSignature,

  canonicalSignaturesMatch,

  hashVariantSignature,

  isSparseVariantMetadata,

} from "./variant-signatures";

export {

  detectL1MerchantDuplicateSubmission,

  L1_DUPLICATE_WARNING_MESSAGE,

} from "./detect-l1-merchant-duplicate";

export { resolveCatalogApprovalRecommendation } from "./resolve-catalog-approval-recommendation";

export {

  assertCreateApprovalAllowed,

  logApprovalLinkRecommended,

} from "./assert-create-approval-allowed";

export {

  assertLinkApprovalAllowed,

  compareLinkVariantMatch,

  type LinkVariantMatchStatus,

} from "./assert-link-approval-allowed";

export {

  computeEffectiveApprovalSignatureInput,

  type AdminApprovalSignatureOverrides,

} from "./compute-effective-approval-signature-input";

export { buildVariantSignatureInputFromProduct } from "./build-variant-signature-input-from-product";

export { findPendingSiblingSameCanonical } from "./find-pending-sibling-requests";

export { findTenantCatalogCanonicalMatches } from "./find-tenant-catalog-canonical-matches";

export {

  APPROVAL_RECOMMENDATION_REASON_LABELS,

  formatApprovalRecommendationReasons,

} from "./recommendation-reason-labels";

export { logVariantDedupEvent } from "./variant-dedup-log";

export {

  getVariantDedupFlags,

  isVariantDedupEnabled,

  isVariantDedupShadowMode,

  shouldEnforceStrictLinkValidation,

  shouldEnforcePendingSiblingBlock,

  resetVariantDedupFlagsCacheForTests,

  type VariantDedupFeatureFlags,

} from "./variant-dedup-flags";

export {

  logVariantDedupShadowEvent,

  createDisabledVariantDedupRecommendation,

  filterCreateBlockReasonsForFlags,

} from "./variant-dedup-shadow-log";

export { buildVariantDedupValidationReport } from "./variant-dedup-validation-report";
export {
  buildVariantDedupValidationReportFromRequest,
  detectValidationRisksFromSnapshot,
  type VariantDedupValidationReport,
  type VariantDedupValidationRisk,
} from "./variant-dedup-validation-snapshot";

export {

  OVERRIDE_AUDIT_LOG_QUERY,

  auditDuplicateCanonicalSignaturesAcrossProducts,

  auditPendingSiblingClustersByVendor,

  auditSparseMetadataRateByCategory,

  auditDuplicateApprovedRequestClusters,

  auditLinkMismatchRisks,

} from "./variant-dedup-audit-queries";


