/** Minimal attribute payload shape used for variant fingerprinting (pre/post validation). */

export type VariantAttributePayloadLike = {

  values?: Record<string, unknown>;

} | null;



export type VariantSignatureInput = {

  category_id: string | null;

  title?: string | null;

  brand: string | null;

  model: string | null;

  gtin: string | null;

  mpn: string | null;

  slug_suggestion?: string | null;

  attribute_payload?: VariantAttributePayloadLike;

};



export type MerchantVariantSignatureInput = VariantSignatureInput & {

  vendor_id: string;

};



export type CatalogApprovalRecommendationMode = "link" | "review" | "create";



export type CatalogApprovalRecommendationReason =

  | "match_reviewed_product"

  | "merchant_selected_product"

  | "prior_approved_same_variant"

  | "vendor_has_live_offer"

  | "high_confidence_match"

  | "canonical_duplicate_for_vendor"

  | "sparse_variant_metadata"

  | "no_match_candidate"

  | "tenant_catalog_same_variant"

  | "pending_sibling_same_variant"

  | "candidate_variant_mismatch"

  | "weak_catalog_hint";



export type CatalogApprovalRecommendation = {

  mode: CatalogApprovalRecommendationMode;

  candidateProductId: string | null;

  reasons: CatalogApprovalRecommendationReason[];

  canonicalVariantSignatureHash: string;

  merchantVariantSignatureHash: string;

  /** Other pending requests from same vendor with identical canonical signature. */

  pendingSiblingRequestIds: string[];

  /** Strict tenant catalog match (catalog truth). */

  tenantCatalogStrictMatchProductId: string | null;

  /** Weak matches for sparse metadata hints only — never used for link mode. */

  weakCatalogHintProductIds: string[];

};



export type L1DuplicateDetectionResult = {

  isDuplicate: boolean;

  existingRequestId: string | null;

  merchantVariantSignatureHash: string;

};



export type CreateBlockReason =

  | "link_recommended"

  | "tenant_catalog_match"

  | "pending_sibling";


