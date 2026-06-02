import type { SchemaAuditEventRow } from "./audit-event-types";

const EVENT_LABELS: Record<string, string> = {
  draft_saved: "Draft saved",
  draft_created: "Draft created",
  publish_started: "Publish started",
  publish_succeeded: "Publish succeeded",
  publish_failed: "Publish failed",
  version_superseded: "Version superseded",
};

export function formatAuditEntry(row: SchemaAuditEventRow): string {
  const label = EVENT_LABELS[row.eventType] ?? row.eventType;
  const when = new Date(row.occurredAt).toLocaleString("el-GR");
  const reason = row.reason ? ` — ${row.reason}` : "";
  return `${when}: ${label}${reason}`;
}

export function formatAuditEntryShort(row: SchemaAuditEventRow): { label: string; when: string; reason: string | null } {
  return {
    label: EVENT_LABELS[row.eventType] ?? row.eventType,
    when: row.occurredAt,
    reason: row.reason ?? null,
  };
}
