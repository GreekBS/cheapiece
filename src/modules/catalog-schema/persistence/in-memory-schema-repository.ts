import type { AttributeDefinition } from "../types/attribute-definition";
import { assertCanPublish, publishSchema as publishDocument } from "../schema/publish-lifecycle";
import type { CategorySchemaSeed } from "../seed/types";
import {
  recordToCategorySchemaSeed,
  seedToFieldRows,
  seedToVersionRow,
} from "./mappers";
import type { SchemaAuditEventInput, SchemaAuditEventRow } from "../audit/audit-event-types";
import { SchemaRepositoryError, type SchemaRepository } from "./schema-repository";
import type {
  AttributeDefinitionRow,
  CategorySchemaFieldRow,
  CategorySchemaVersionRecord,
  CategorySchemaVersionRow,
  CategorySchemaVersionSummary,
  PublishSchemaInput,
  SaveSchemaDraftInput,
} from "./types";

function now(): string {
  return new Date().toISOString();
}

/** In-memory repository for tests and local deterministic persistence roundtrips. */
export class InMemorySchemaRepository implements SchemaRepository {
  private attributes = new Map<string, AttributeDefinitionRow>();
  private versions = new Map<string, CategorySchemaVersionRow>();
  private fields = new Map<string, CategorySchemaFieldRow[]>();
  private auditEvents: SchemaAuditEventRow[] = [];

  async listAttributeDefinitions(tenantId: string): Promise<AttributeDefinition[]> {
    return [...this.attributes.values()]
      .filter((r) => r.tenant_id === tenantId && r.state === "active")
      .map((r) => r.definition);
  }

  async upsertAttributeDefinitions(tenantId: string, definitions: AttributeDefinition[]): Promise<void> {
    const ts = now();
    for (const def of definitions) {
      const key = `${tenantId}:${def.code}`;
      const existing = [...this.attributes.values()].find((r) => r.tenant_id === tenantId && r.code === def.code);
      this.attributes.set(key, {
        id: existing?.id ?? crypto.randomUUID(),
        tenant_id: tenantId,
        code: def.code,
        primitive: def.primitive,
        definition: { ...def, tenantId },
        state: def.state,
        created_at: existing?.created_at ?? ts,
        updated_at: ts,
      });
    }
  }

  async getVersionById(versionId: string): Promise<CategorySchemaVersionRecord | null> {
    const version = this.versions.get(versionId);
    if (!version) return null;
    return { version, fields: this.fields.get(versionId) ?? [] };
  }

  async listVersionsForCategory(tenantId: string, categoryId: string): Promise<CategorySchemaVersionSummary[]> {
    return [...this.versions.values()]
      .filter((v) => v.tenant_id === tenantId && v.category_id === categoryId)
      .sort((a, b) => b.version - a.version)
      .map((v) => ({
        id: v.id,
        categoryId: v.category_id,
        version: v.version,
        state: v.state,
        publishedAt: v.published_at,
        locale: v.locale,
        categoryPath: v.category_path,
      }));
  }

  async getPublishedVersion(tenantId: string, categoryId: string): Promise<CategorySchemaVersionRecord | null> {
    const version = [...this.versions.values()].find(
      (v) => v.tenant_id === tenantId && v.category_id === categoryId && v.state === "published",
    );
    if (!version) return null;
    return { version, fields: this.fields.get(version.id) ?? [] };
  }

  async getDraftVersion(tenantId: string, categoryId: string): Promise<CategorySchemaVersionRecord | null> {
    const version = [...this.versions.values()].find(
      (v) => v.tenant_id === tenantId && v.category_id === categoryId && v.state === "draft",
    );
    if (!version) return null;
    return { version, fields: this.fields.get(version.id) ?? [] };
  }

  async saveDraft(input: SaveSchemaDraftInput): Promise<CategorySchemaVersionRecord> {
    const { tenantId, seed, existingDraftId, expectedRevision } = input;
    const doc = { ...seed.document, tenantId, state: "draft" as const, publishedAt: null };
    const draftSeed: CategorySchemaSeed = { ...seed, document: doc };

    if (!existingDraftId) {
      const existingDraft = await this.getDraftVersion(tenantId, doc.categoryId);
      if (existingDraft) {
        throw new SchemaRepositoryError("A draft already exists for this category", "CONFLICT");
      }
    }

    if (existingDraftId) {
      const existing = this.versions.get(existingDraftId);
      if (!existing || existing.state !== "draft") {
        throw new SchemaRepositoryError("Draft version not found or not mutable", "NOT_FOUND");
      }
      if (expectedRevision && existing.updated_at !== expectedRevision) {
        throw new SchemaRepositoryError("Revision conflict — draft was modified", "CONFLICT");
      }
      if (existing.version !== doc.version) {
        throw new SchemaRepositoryError("Version conflict on draft save", "CONFLICT");
      }
      const row = seedToVersionRow(tenantId, draftSeed, "draft", existingDraftId);
      const version: CategorySchemaVersionRow = { ...row, created_at: existing.created_at, updated_at: now() };
      this.versions.set(version.id, version);
      this.fields.set(version.id, seedToFieldRows(version.id, draftSeed).map((f) => ({ ...f, id: crypto.randomUUID() })));
      return { version, fields: this.fields.get(version.id)! };
    }

    const conflict = [...this.versions.values()].some(
      (v) => v.tenant_id === tenantId && v.category_id === doc.categoryId && v.version === doc.version,
    );
    if (conflict) {
      throw new SchemaRepositoryError(`Version ${doc.version} already exists for category`, "CONFLICT");
    }

    const row = seedToVersionRow(tenantId, draftSeed, "draft");
    const version: CategorySchemaVersionRow = { ...row, created_at: now(), updated_at: now() };
    this.versions.set(version.id, version);
    this.fields.set(version.id, seedToFieldRows(version.id, draftSeed).map((f) => ({ ...f, id: crypto.randomUUID() })));
    return { version, fields: this.fields.get(version.id)! };
  }

  async publishVersion(input: PublishSchemaInput): Promise<CategorySchemaVersionRecord> {
    const record = await this.getVersionById(input.versionId);
    if (!record) throw new SchemaRepositoryError("Version not found", "NOT_FOUND");
    if (record.version.tenant_id !== input.tenantId || record.version.category_id !== input.categoryId) {
      throw new SchemaRepositoryError("Version/category mismatch", "INVALID_REFERENCE");
    }
    if (record.version.version !== input.expectedVersion) {
      throw new SchemaRepositoryError("Version number conflict", "CONFLICT");
    }
    if (record.version.state !== "draft") {
      throw new SchemaRepositoryError("Only draft versions can be published", "PUBLISH_BLOCKED");
    }

    const seed = recordToCategorySchemaSeed(record);
    assertCanPublish(seed.document);

    const existingPublished = await this.getPublishedVersion(input.tenantId, input.categoryId);
    if (existingPublished && existingPublished.version.id !== record.version.id) {
      const archived: CategorySchemaVersionRow = {
        ...existingPublished.version,
        state: "archived",
        updated_at: now(),
      };
      this.versions.set(archived.id, archived);
    }

    const publishedDoc = publishDocument(seed.document, input.publishedAt);
    const publishedSeed: CategorySchemaSeed = { ...seed, document: publishedDoc };
    const row = seedToVersionRow(input.tenantId, publishedSeed, "published", record.version.id);
    const version: CategorySchemaVersionRow = {
      ...row,
      created_at: record.version.created_at,
      updated_at: now(),
    };
    this.versions.set(version.id, version);
    return { version, fields: this.fields.get(version.id)! };
  }

  async listPublishedVersions(tenantId: string): Promise<CategorySchemaVersionRecord[]> {
    return [...this.versions.values()]
      .filter((v) => v.tenant_id === tenantId && v.state === "published")
      .map((v) => ({ version: v, fields: this.fields.get(v.id) ?? [] }));
  }

  async appendAuditEvent(event: SchemaAuditEventInput): Promise<SchemaAuditEventRow> {
    const row: SchemaAuditEventRow = {
      ...event,
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    };
    this.auditEvents.push(row);
    return row;
  }

  async listAuditEvents(tenantId: string, categoryId: string, limit = 20): Promise<SchemaAuditEventRow[]> {
    return this.auditEvents
      .filter((e) => e.tenantId === tenantId && e.categoryId === categoryId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit);
  }
}
