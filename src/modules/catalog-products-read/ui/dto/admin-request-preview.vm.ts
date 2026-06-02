/** Admin preview mode — derived from stored row flags only (no evaluator). */
export type AdminRequestPreviewMode = "legacy" | "partial" | "strict";

/** Display label from stored meta only — not used for validation. */
export type AdminRequestValidationModeDisplay = "STRICT" | "LENIENT";

export type AdminRequestPreviewScalars = {
  title?: string;
  brand?: string;
  model?: string;
  gtin?: string;
  mpn?: string;
  slugSuggestion?: string;
};

/** Merchant-submitted commercial intent — not a live offer. */
export type AdminRequestPreviewMerchantIntent = {
  priceAmount?: number;
  stockQuantity?: number;
  currency?: string;
};

export type AdminRequestPreviewDisplayField = {
  code: string;
  value: unknown;
};

export type AdminRequestPreviewDisplayGroup = {
  group: string;
  fields: AdminRequestPreviewDisplayField[];
};

/**
 * Admin forensic snapshot — stored request data only; no live schema kernel.
 */
export type AdminRequestPreviewVM = {
  requestId: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  mode: AdminRequestPreviewMode;
  scalars: AdminRequestPreviewScalars;
  merchantIntent?: AdminRequestPreviewMerchantIntent;
  attributeValues: Record<string, unknown>;
  validationMode?: AdminRequestValidationModeDisplay;
  schemaVersionId?: string;
  displayGroups?: AdminRequestPreviewDisplayGroup[];
  facetDebug?: Record<string, unknown>;
  createdAt: string;
  resolvedProductId: string | null;
  categoryId: string | null;
  vendorLabel: string;
};
