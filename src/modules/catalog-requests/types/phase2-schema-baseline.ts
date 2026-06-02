import type { CatalogPayload } from "@/modules/catalog-schema";
import type { SchemaRepository } from "@/modules/catalog-schema";

/**
 * Phase 2 merchant read port (types only — no runtime repository wrapper).
 *
 * SOURCE OF TRUTH (runtime resolution):
 * - `category_schema_versions` row + `category_schema_fields` bindings
 * - `document_snapshot` is publish-time cache/audit only — never authoritative
 */
export type ReadonlySchemaRepository = Pick<
  SchemaRepository,
  "getVersionById" | "listPublishedVersions" | "listAttributeDefinitions"
>;

/** Input payload (kernel-shaped) before validation. */
export type CatalogProductRequestAttributePayload = CatalogPayload;

/**
 * State transitions (application-enforced):
 *   LEGACY_SAFE → STRICT | NO_SCHEMA_MINIMAL → STRICT — allowed (upgrade)
 *   STRICT → any downgrade — forbidden
 */
export type CatalogValidationMode = "STRICT" | "LEGACY_SAFE" | "NO_SCHEMA_MINIMAL";

/** Persisted JSONB on `catalog_product_requests.attribute_payload` after validation. */
export type StoredCatalogProductRequestAttributePayload = {
  values: Record<string, unknown>;
  meta: {
    schemaVersionId: string | null;
    validatedAt: string;
    validationMode: CatalogValidationMode;
  };
};

/** Phase 2 insert shape; `schema_version_id` optional until merchant runtime pins versions. */
export type CatalogProductRequestInsertPhase2 = {
  schema_version_id?: string | null;
  attribute_payload?: CatalogProductRequestAttributePayload;
};
