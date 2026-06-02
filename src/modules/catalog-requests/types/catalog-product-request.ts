import type { StoredCatalogProductRequestAttributePayload } from "./phase2-schema-baseline";

export type CatalogProductRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type CatalogProductRequestRow = {
  id: string;
  tenant_id: string;
  vendor_id: string;
  submitted_by_user_id: string;
  category_id: string | null;
  /** Set when pinned to a published schema; null for legacy Phase 1 requests */
  schema_version_id: string | null;
  attribute_payload: StoredCatalogProductRequestAttributePayload;
  title: string;
  brand: string | null;
  model: string | null;
  slug_suggestion: string;
  gtin: string | null;
  mpn: string | null;
  status: CatalogProductRequestStatus;
  rejection_reason: string | null;
  admin_note: string | null;
  resolved_product_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  requested_price_amount: number | null;
  requested_stock_quantity: number | null;
  requested_price_currency: string | null;
  merchant_hidden_at: string | null;
  merchant_hidden_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogProductRequestListRow = CatalogProductRequestRow & {
  vendor_name?: string | null;
};
