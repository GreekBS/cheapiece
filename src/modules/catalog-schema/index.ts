/** Phase 0 catalog schema engine — types, pipeline, seeds. No DB/UI. */

export * from "./types/primitives";
export * from "./types/required-level";
export * from "./types/attribute-groups";
export * from "./types/enum-option";
export * from "./types/attribute-code";
export * from "./types/validation-rule";
export * from "./types/attribute-definition";
export * from "./types/schema-field";
export * from "./types/category-schema-document";
export * from "./types/schema-descriptor";
export * from "./types/payload";
export * from "./types/validation-result";
export * from "./types/matching";
export * from "./types/effective-schema";

export { getPrimitiveCapability, listPrimitives } from "./primitives/registry";
export { coerceFieldValue } from "./primitives/value-coercion";
export { AttributeRegistry } from "./registry/attribute-registry";
export { applyValidationRules } from "./validation/rules-engine";
export { validateField } from "./validation/validate-field";
export { validatePayload } from "./validation/validate-payload";
export {
  resolveEffectiveSchema,
  InheritanceResolutionError,
  type SchemaDocumentMap,
} from "./schema/inheritance-resolver";
export {
  assertMutableDraft,
  assertCanPublish,
  publishSchema,
  PublishedSchemaMutationError,
} from "./schema/publish-lifecycle";
export { normalizePayload, toCanonicalSnapshot } from "./normalization/canonical-attributes";
export { buildSchemaDescriptor } from "./descriptor/build-schema-descriptor";
export { buildCatalogMatchIndex, productFromNormalized, tupleKeyFromFields } from "./matching/build-index";
export { findMatchCandidates } from "./matching/match-candidates";
export { runCatalogPipeline } from "./pipeline/run-catalog-pipeline";
export type { CatalogPipelineInput, CatalogPipelineResult } from "./pipeline/run-catalog-pipeline";

export {
  PILOT_CATALOG_SEED,
  buildPilotCatalogSeed,
  createPilotAttributeRegistry,
  createPilotSchemaDocumentMap,
  getPilotSchemaSeed,
} from "./seed/index";

export type { SchemaRepository } from "./persistence/schema-repository";
export { SchemaRepositoryError } from "./persistence/schema-repository";
export { InMemorySchemaRepository } from "./persistence/in-memory-schema-repository";
export { SupabaseSchemaRepository } from "./persistence/supabase-schema-repository";
export {
  resolvePublishedCategorySchema,
  CategorySchemaResolutionError,
} from "./services/category-schema-service";
export type { ResolvedPublishedSchema } from "./services/category-schema-service";

export * from "./governance";
export { diffSchemaVersions } from "./diff/diff-schema-versions";
export { computeDiffHash } from "./diff/diff-hash";
export type { SchemaDiffDto } from "./diff/diff-types";
export { buildAdminPreview } from "./preview/build-admin-preview";
export type { AdminPreviewBundleDto } from "./preview/build-admin-preview";
export { annotateInheritance } from "./preview/annotate-inheritance";
export * from "./audit/audit-event-types";
export { formatAuditEntry } from "./audit/format-audit-entry";
export {
  loadEditorInitial,
  saveDraftBindings,
  publishDraft,
  getDiffDraftVsPublished,
  getPreviewForDraft,
} from "./services/admin-schema-service";
export type { AdminSchemaServiceContext } from "./services/admin-schema-service";
export type * from "./types/admin-dtos";
