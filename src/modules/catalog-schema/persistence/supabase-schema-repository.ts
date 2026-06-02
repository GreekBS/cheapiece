import type { SupabaseClient } from "@supabase/supabase-js";

import type { AttributeDefinition } from "../types/attribute-definition";
import {
  attributeDefinitionToRow,
  recordToCategorySchemaSeed,
  rowToAttributeDefinition,
  seedToFieldRows,
  seedToVersionRow,
} from "./mappers";
import { publishSchema } from "../schema/publish-lifecycle";
import type { SchemaAuditEventInput, SchemaAuditEventRow } from "../audit/audit-event-types";
import { SchemaRepositoryError, type SchemaRepository } from "./schema-repository";
import type {
  CategorySchemaFieldRow,
  CategorySchemaVersionRecord,
  CategorySchemaVersionRow,
  CategorySchemaVersionSummary,
  PublishSchemaInput,
  SaveSchemaDraftInput,
} from "./types";

type FieldInsert = {
  schema_version_id: string;
  attribute_code: string;
  binding: CategorySchemaFieldRow["binding"];
  sort_order: number;
};

export class SupabaseSchemaRepository implements SchemaRepository {
  constructor(private readonly supabase: SupabaseClient<any, "public", any>) {}

  async listAttributeDefinitions(tenantId: string): Promise<AttributeDefinition[]> {
    const { data, error } = await this.supabase
      .from("attribute_definitions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("state", "active")
      .order("code");
    if (error) throw error;
    return (data ?? []).map((row) => rowToAttributeDefinition(row as never));
  }

  async upsertAttributeDefinitions(tenantId: string, definitions: AttributeDefinition[]): Promise<void> {
    for (const def of definitions) {
      const row = attributeDefinitionToRow(tenantId, { ...def, tenantId });
      const { error } = await this.supabase.from("attribute_definitions").upsert(
        {
          tenant_id: row.tenant_id,
          code: row.code,
          primitive: row.primitive,
          definition: row.definition,
          state: row.state,
        },
        { onConflict: "tenant_id,code" },
      );
      if (error) throw error;
    }
  }

  async getVersionById(versionId: string): Promise<CategorySchemaVersionRecord | null> {
    const { data: version, error } = await this.supabase
      .from("category_schema_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();
    if (error) throw error;
    if (!version) return null;
    const fields = await this.loadFields(versionId);
    return { version: version as CategorySchemaVersionRow, fields };
  }

  async listVersionsForCategory(tenantId: string, categoryId: string): Promise<CategorySchemaVersionSummary[]> {
    const { data, error } = await this.supabase
      .from("category_schema_versions")
      .select("id, category_id, version, state, published_at, locale, category_path")
      .eq("tenant_id", tenantId)
      .eq("category_id", categoryId)
      .order("version", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((v) => ({
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
    const { data: version, error } = await this.supabase
      .from("category_schema_versions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category_id", categoryId)
      .eq("state", "published")
      .maybeSingle();
    if (error) throw error;
    if (!version) return null;
    const fields = await this.loadFields(version.id);
    return { version: version as CategorySchemaVersionRow, fields };
  }

  async getDraftVersion(tenantId: string, categoryId: string): Promise<CategorySchemaVersionRecord | null> {
    const { data: version, error } = await this.supabase
      .from("category_schema_versions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category_id", categoryId)
      .eq("state", "draft")
      .maybeSingle();
    if (error) throw error;
    if (!version) return null;
    const fields = await this.loadFields(version.id);
    return { version: version as CategorySchemaVersionRow, fields };
  }

  async saveDraft(input: SaveSchemaDraftInput): Promise<CategorySchemaVersionRecord> {
    const { tenantId, seed, existingDraftId, expectedRevision } = input;
    const doc = { ...seed.document, tenantId, state: "draft" as const, publishedAt: null };
    const draftSeed = { ...seed, document: doc };
    const versionId = existingDraftId ?? doc.id;
    const row = seedToVersionRow(tenantId, draftSeed, "draft", versionId);

    if (!existingDraftId) {
      const existingDraft = await this.getDraftVersion(tenantId, doc.categoryId);
      if (existingDraft) {
        throw new SchemaRepositoryError("A draft already exists for this category", "CONFLICT");
      }
    }

    if (existingDraftId) {
      const existing = await this.getVersionById(existingDraftId);
      if (!existing || existing.version.state !== "draft") {
        throw new SchemaRepositoryError("Draft not found or immutable", "NOT_FOUND");
      }
      if (expectedRevision && existing.version.updated_at !== expectedRevision) {
        throw new SchemaRepositoryError("Revision conflict — draft was modified", "CONFLICT");
      }
      const { error } = await this.supabase
        .from("category_schema_versions")
        .update({
          inherits_from_category_id: row.inherits_from_category_id,
          category_path: row.category_path,
          locale: row.locale,
          matching_config: row.matching_config,
          denormalize_config: row.denormalize_config,
          document_snapshot: row.document_snapshot,
        })
        .eq("id", existingDraftId)
        .eq("state", "draft");
      if (error) throw error;
      await this.replaceFields(existingDraftId, draftSeed);
      return (await this.getVersionById(existingDraftId))!;
    }

    const { error: insertError } = await this.supabase.from("category_schema_versions").insert({
      id: row.id,
      tenant_id: row.tenant_id,
      category_id: row.category_id,
      version: row.version,
      state: row.state,
      inherits_from_category_id: row.inherits_from_category_id,
      category_path: row.category_path,
      locale: row.locale,
      published_at: null,
      matching_config: row.matching_config,
      denormalize_config: row.denormalize_config,
      document_snapshot: row.document_snapshot,
    });
    if (insertError) {
      if (insertError.code === "23505") {
        throw new SchemaRepositoryError("Schema version already exists", "CONFLICT");
      }
      throw insertError;
    }
    await this.replaceFields(row.id, draftSeed);
    return (await this.getVersionById(row.id))!;
  }

  async publishVersion(input: PublishSchemaInput): Promise<CategorySchemaVersionRecord> {
    const record = await this.getVersionById(input.versionId);
    if (!record) throw new SchemaRepositoryError("Version not found", "NOT_FOUND");
    if (record.version.version !== input.expectedVersion) {
      throw new SchemaRepositoryError("Version conflict", "CONFLICT");
    }
    if (record.version.state !== "draft") {
      throw new SchemaRepositoryError("Only drafts can be published", "PUBLISH_BLOCKED");
    }

    const existingPublished = await this.getPublishedVersion(input.tenantId, input.categoryId);
    if (existingPublished && existingPublished.version.id !== record.version.id) {
      const { error: archiveError } = await this.supabase
        .from("category_schema_versions")
        .update({ state: "archived" })
        .eq("id", existingPublished.version.id)
        .eq("state", "published");
      if (archiveError) throw archiveError;
    }

    const seed = recordToCategorySchemaSeed(record);
    const publishedDoc = publishSchema(seed.document, input.publishedAt);
    const publishedSeed = { ...seed, document: publishedDoc };
    const snapshotRow = seedToVersionRow(input.tenantId, publishedSeed, "published", input.versionId);

    const { error } = await this.supabase
      .from("category_schema_versions")
      .update({
        state: "published",
        published_at: input.publishedAt,
        document_snapshot: snapshotRow.document_snapshot,
      })
      .eq("id", input.versionId)
      .eq("state", "draft");
    if (error) {
      if (error.message?.includes("immutable")) {
        throw new SchemaRepositoryError("Published schema is immutable", "IMMUTABLE");
      }
      throw error;
    }

    return (await this.getVersionById(input.versionId))!;
  }

  async listPublishedVersions(tenantId: string): Promise<CategorySchemaVersionRecord[]> {
    const { data, error } = await this.supabase
      .from("category_schema_versions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("state", "published");
    if (error) throw error;
    const records: CategorySchemaVersionRecord[] = [];
    for (const version of data ?? []) {
      const fields = await this.loadFields(version.id);
      records.push({ version: version as CategorySchemaVersionRow, fields });
    }
    return records;
  }

  private async loadFields(versionId: string): Promise<CategorySchemaFieldRow[]> {
    const { data, error } = await this.supabase
      .from("category_schema_fields")
      .select("*")
      .eq("schema_version_id", versionId)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as CategorySchemaFieldRow[];
  }

  private async replaceFields(versionId: string, seed: import("../seed/types").CategorySchemaSeed): Promise<void> {
    const { error: delError } = await this.supabase
      .from("category_schema_fields")
      .delete()
      .eq("schema_version_id", versionId);
    if (delError) throw delError;

    const rows: FieldInsert[] = seedToFieldRows(versionId, seed).map((f) => ({
      schema_version_id: f.schema_version_id,
      attribute_code: f.attribute_code,
      binding: f.binding,
      sort_order: f.sort_order,
    }));

    if (rows.length > 0) {
      const { error } = await this.supabase.from("category_schema_fields").insert(rows);
      if (error) throw error;
    }
  }

  async appendAuditEvent(event: SchemaAuditEventInput): Promise<SchemaAuditEventRow> {
    const { data, error } = await this.supabase
      .from("schema_audit_events")
      .insert({
        tenant_id: event.tenantId,
        category_id: event.categoryId,
        schema_version_id: event.schemaVersionId,
        event_type: event.eventType,
        actor_user_id: event.actorUserId,
        reason: event.reason ?? null,
        payload: event.payload ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;
    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      categoryId: (row.category_id as string) ?? null,
      schemaVersionId: (row.schema_version_id as string) ?? null,
      eventType: row.event_type as SchemaAuditEventInput["eventType"],
      actorUserId: row.actor_user_id as string,
      occurredAt: row.occurred_at as string,
      reason: (row.reason as string) ?? null,
      payload: (row.payload as Record<string, unknown>) ?? {},
    };
  }

  async listAuditEvents(tenantId: string, categoryId: string, limit = 20): Promise<SchemaAuditEventRow[]> {
    const { data, error } = await this.supabase
      .from("schema_audit_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category_id", categoryId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        tenantId: r.tenant_id as string,
        categoryId: (r.category_id as string) ?? null,
        schemaVersionId: (r.schema_version_id as string) ?? null,
        eventType: r.event_type as SchemaAuditEventInput["eventType"],
        actorUserId: r.actor_user_id as string,
        occurredAt: r.occurred_at as string,
        reason: (r.reason as string) ?? null,
        payload: (r.payload as Record<string, unknown>) ?? {},
      };
    });
  }
}
