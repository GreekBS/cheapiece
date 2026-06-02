/** Fallback when vendor enrichment query fails or vendor id is unknown. */
export const UNKNOWN_VENDOR_LABEL = "Unknown vendor";

/**
 * Flat select only — never embed `vendors(...)` here.
 * PostgREST embeds can fail silently when consumed with `if (error) return []`.
 * Use fetchVendorNamesByIds() for vendor_name enrichment.
 */
export const CATALOG_PRODUCT_REQUEST_SELECT_FLAT = `
  id,
  tenant_id,
  vendor_id,
  submitted_by_user_id,
  category_id,
  schema_version_id,
  attribute_payload,
  title,
  brand,
  model,
  slug_suggestion,
  gtin,
  mpn,
  status,
  rejection_reason,
  admin_note,
  resolved_product_id,
  reviewed_by_user_id,
  reviewed_at,
  requested_price_amount,
  requested_stock_quantity,
  requested_price_currency,
  merchant_hidden_at,
  merchant_hidden_by_user_id,
  created_at,
  updated_at
`;
