export type SchemaAuditEventType =
  | "draft_saved"
  | "draft_created"
  | "publish_started"
  | "publish_succeeded"
  | "publish_failed"
  | "version_superseded";

export type SchemaAuditEventInput = {
  tenantId: string;
  categoryId: string | null;
  schemaVersionId: string | null;
  eventType: SchemaAuditEventType;
  actorUserId: string;
  reason?: string | null;
  payload?: Record<string, unknown>;
};

export type SchemaAuditEventRow = SchemaAuditEventInput & {
  id: string;
  occurredAt: string;
};
