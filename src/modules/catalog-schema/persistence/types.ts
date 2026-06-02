import type { AttributeDefinition } from "../types/attribute-definition";
import type { CategorySchemaDocument, DenormalizeMap, MatchingConfig } from "../types/category-schema-document";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { CategorySchemaSeed } from "../seed/types";

export type AttributeDefinitionRow = {
  id: string;
  tenant_id: string;
  code: string;
  primitive: string;
  definition: AttributeDefinition;
  state: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type CategorySchemaVersionRow = {
  id: string;
  tenant_id: string;
  category_id: string;
  version: number;
  state: "draft" | "published" | "archived";
  inherits_from_category_id: string | null;
  category_path: string;
  locale: string;
  published_at: string | null;
  matching_config: MatchingConfig;
  denormalize_config: DenormalizeMap;
  document_snapshot: CategorySchemaSeed | null;
  created_at: string;
  updated_at: string;
};

export type CategorySchemaFieldRow = {
  id: string;
  schema_version_id: string;
  attribute_code: string;
  binding: CategorySchemaFieldBinding;
  sort_order: number;
};

export type CategorySchemaVersionRecord = {
  version: CategorySchemaVersionRow;
  fields: CategorySchemaFieldRow[];
};

export type SaveSchemaDraftInput = {
  tenantId: string;
  seed: CategorySchemaSeed;
  /** When updating an existing draft, pass its version row id. */
  existingDraftId?: string;
  /** Optimistic concurrency — must match category_schema_versions.updated_at */
  expectedRevision?: string;
};

export type PublishSchemaInput = {
  tenantId: string;
  categoryId: string;
  versionId: string;
  publishedAt: string;
  /** Expected version number — optimistic concurrency. */
  expectedVersion: number;
};

export type CategorySchemaVersionSummary = {
  id: string;
  categoryId: string;
  version: number;
  state: CategorySchemaVersionRow["state"];
  publishedAt: string | null;
  locale: string;
  categoryPath: string;
};
