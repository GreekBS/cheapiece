import type { SchemaAuditEventRow } from "../audit/audit-event-types";
import type { SchemaDiffDto } from "../diff/diff-types";
import type { AdminPreviewBundleDto } from "../preview/build-admin-preview";
import type { CategorySchemaFieldBinding } from "./schema-field";
import type { AttributeDefinition } from "./attribute-definition";
import type { GovernanceIssue } from "../governance/types";

export type SchemaEditorCategoryDto = {
  id: string;
  name: string;
  slug: string;
  path: string;
};

export type SchemaVersionSummaryDto = {
  id: string;
  version: number;
  state: "draft" | "published" | "archived";
  publishedAt: string | null;
  revisionToken: string;
};

export type SchemaEditorInitialDto = {
  category: SchemaEditorCategoryDto;
  draft: SchemaVersionSummaryDto | null;
  published: SchemaVersionSummaryDto | null;
  bindings: CategorySchemaFieldBinding[];
  matching: import("./category-schema-document").MatchingConfig;
  denormalize: import("./category-schema-document").DenormalizeMap;
  availableAttributes: AttributeDefinition[];
  inheritanceChain: { categoryId: string; categoryPath: string }[];
  preview: AdminPreviewBundleDto | null;
  auditEvents: SchemaAuditEventRow[];
};

export type SaveDraftInputDto = {
  tenantId: string;
  categoryId: string;
  versionId: string;
  expectedVersion: number;
  expectedRevision: string;
  bindings: CategorySchemaFieldBinding[];
};

export type SaveDraftResultDto = {
  ok: boolean;
  revisionToken?: string;
  message?: string;
  issues?: GovernanceIssue[];
};

export type PublishDraftInputDto = {
  tenantId: string;
  categoryId: string;
  versionId: string;
  expectedVersion: number;
  expectedRevision: string;
  diffHash: string;
  reason?: string;
};

export type PublishDraftResultDto = {
  ok: boolean;
  message?: string;
  blockingErrors?: GovernanceIssue[];
  publishedVersionId?: string;
};

export type PreviewResultDto = {
  preview: AdminPreviewBundleDto;
  readiness: { publishReady: boolean; blockingErrors: GovernanceIssue[]; warnings: GovernanceIssue[] };
};

export type DiffResultDto = {
  diff: SchemaDiffDto;
  diffHash: string;
};
