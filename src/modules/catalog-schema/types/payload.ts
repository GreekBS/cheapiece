/** Merchant / request payload — keys are attribute codes. */
export type CatalogPayload = {
  schemaVersionId: string;
  categoryId: string;
  values: Record<string, unknown>;
  meta?: {
    locale?: string;
    submittedAt?: string;
  };
};

/** Canonical product attributes snapshot (same value shape as payload). */
export type CanonicalAttributesSnapshot = {
  schemaVersionId: string;
  values: Record<string, unknown>;
  normalized?: Record<string, unknown>;
};
