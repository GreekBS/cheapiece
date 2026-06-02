import type { AttributeDefinition } from "../types/attribute-definition";
import type { SchemaAuditEventInput, SchemaAuditEventRow } from "../audit/audit-event-types";
import type {
  CategorySchemaVersionRecord,
  CategorySchemaVersionSummary,
  PublishSchemaInput,
  SaveSchemaDraftInput,
} from "./types";

export class SchemaRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "IMMUTABLE"
      | "INVALID_REFERENCE"
      | "PUBLISH_BLOCKED",
  ) {
    super(message);
    this.name = "SchemaRepositoryError";
  }
}

/** Persistence port — runtime never imports Supabase directly. */
export interface SchemaRepository {
  listAttributeDefinitions(tenantId: string): Promise<AttributeDefinition[]>;
  upsertAttributeDefinitions(tenantId: string, definitions: AttributeDefinition[]): Promise<void>;

  getVersionById(versionId: string): Promise<CategorySchemaVersionRecord | null>;
  listVersionsForCategory(tenantId: string, categoryId: string): Promise<CategorySchemaVersionSummary[]>;
  getPublishedVersion(tenantId: string, categoryId: string): Promise<CategorySchemaVersionRecord | null>;
  getDraftVersion(tenantId: string, categoryId: string): Promise<CategorySchemaVersionRecord | null>;

  saveDraft(input: SaveSchemaDraftInput): Promise<CategorySchemaVersionRecord>;
  publishVersion(input: PublishSchemaInput): Promise<CategorySchemaVersionRecord>;

  /** All published versions for tenant (for inheritance map building). */
  listPublishedVersions(tenantId: string): Promise<CategorySchemaVersionRecord[]>;

  appendAuditEvent(event: SchemaAuditEventInput): Promise<SchemaAuditEventRow>;
  listAuditEvents(tenantId: string, categoryId: string, limit?: number): Promise<SchemaAuditEventRow[]>;
}

export function revisionTokenFromVersion(updatedAt: string): string {
  return updatedAt;
}
