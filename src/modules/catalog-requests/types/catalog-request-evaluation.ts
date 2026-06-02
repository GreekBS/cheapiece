import type { SchemaDescriptor } from "@/modules/catalog-schema";

import type { PinnedPublishedSchema } from "../application/pinned-published-schema";
import type {
  CatalogProductRequestAttributePayload,
  CatalogValidationMode,
  StoredCatalogProductRequestAttributePayload,
} from "./phase2-schema-baseline";

export type SubmissionScalars = {
  title: string;
  slugSuggestion: string;
  brand?: string | null;
  model?: string | null;
  gtin?: string | null;
  mpn?: string | null;
};

export type CatalogRequestEvaluationInput = Readonly<{
  tenantId: string;
  vendorId: string;
  vendorTenantId: string;
  categoryId: string | null;
  schemaVersionId?: string | null;
  attributePayload?: CatalogProductRequestAttributePayload;
  submissionScalars: SubmissionScalars;
  previous?: Readonly<{
    schema_version_id: string | null;
    attribute_payload: StoredCatalogProductRequestAttributePayload | null;
  }>;
}>;

/**
 * Injected dependencies — evaluator stays pure (no clock, no DB).
 * Orchestration must supply immutable snapshot context (createImmutableSchemaSnapshot).
 */
export type CatalogRequestEvaluationContext = Readonly<{
  now: string;
  /** STRICT only: immutable DTO from pinPublishedSchemaVersion. */
  pinnedSchema?: PinnedPublishedSchema;
  locale?: string;
}>;

export type CatalogRequestEvaluationValid = Readonly<{
  isValid: true;
  resolvedMode: CatalogValidationMode;
  validationMode: CatalogValidationMode;
  schemaVersionId: string | null;
  normalizedPayload: StoredCatalogProductRequestAttributePayload;
  descriptor: SchemaDescriptor | null;
  pinnedSchema: PinnedPublishedSchema | null;
}>;

export type CatalogRequestEvaluationInvalid = Readonly<{
  isValid: false;
  errors: Record<string, string[]>;
}>;

export type CatalogRequestEvaluationResult =
  | CatalogRequestEvaluationValid
  | CatalogRequestEvaluationInvalid;
