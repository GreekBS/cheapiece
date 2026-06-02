export type ProductDefinitionRevisionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "superseded";

export type ProposedProductDefinitionPayload = {
  title: string;
  brand: string | null;
  model: string | null;
  categoryId: string | null;
  slugSuggestion: string;
  gtin: string | null;
  mpn: string | null;
  description: string | null;
  attributes: Record<string, unknown>;
  sourceCatalogRequestId: string;
  sourceCatalogRequestUpdatedAt: string;
};

export type ProductDefinitionRevisionRow = {
  id: string;
  tenant_id: string;
  vendor_id: string;
  product_id: string;
  source_catalog_request_id: string;
  baseline_publication_product_id: string;
  status: ProductDefinitionRevisionStatus;
  proposed_payload: ProposedProductDefinitionPayload;
  changed_fields: string[];
  diff_summary: Record<string, unknown> | null;
  merchant_note: string | null;
  rejection_reason: string | null;
  submitted_by: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_publication_product_id: string | null;
  superseded_by_revision_id: string | null;
  created_at: string;
  updated_at: string;
};
