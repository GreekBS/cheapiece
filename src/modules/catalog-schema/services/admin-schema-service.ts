import { randomUUID } from "node:crypto";

import { assembleDocumentMap, recordToCategorySchemaSeed } from "../persistence/mappers";
import { revisionTokenFromVersion, SchemaRepositoryError, type SchemaRepository } from "../persistence/schema-repository";
import { assessPublishReadiness } from "../governance/publish-readiness";
import { diffSchemaVersions } from "../diff/diff-schema-versions";
import { computeDiffHash } from "../diff/diff-hash";
import { buildAdminPreview } from "../preview/build-admin-preview";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { CategorySchemaSeed } from "../seed/types";
import type {
  DiffResultDto,
  PreviewResultDto,
  PublishDraftInputDto,
  PublishDraftResultDto,
  SaveDraftInputDto,
  SaveDraftResultDto,
  SchemaEditorInitialDto,
  SchemaVersionSummaryDto,
} from "../types/admin-dtos";
import type { SchemaDocumentMap } from "../schema/inheritance-resolver";

export type AdminSchemaServiceContext = {
  tenantId: string;
  actorUserId: string;
  repo: SchemaRepository;
};

function toVersionSummary(record: { version: { id: string; version: number; state: "draft" | "published" | "archived"; published_at: string | null; updated_at: string } }): SchemaVersionSummaryDto {
  return {
    id: record.version.id,
    version: record.version.version,
    state: record.version.state,
    publishedAt: record.version.published_at,
    revisionToken: revisionTokenFromVersion(record.version.updated_at),
  };
}

function buildSeedFromBindings(
  base: CategorySchemaSeed,
  bindings: CategorySchemaFieldBinding[],
): CategorySchemaSeed {
  const sorted = bindings.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.attributeCode.localeCompare(b.attributeCode));
  return {
    ...base,
    document: {
      ...base.document,
      fields: sorted,
    },
  };
}

async function loadPublishedMap(repo: SchemaRepository, tenantId: string): Promise<SchemaDocumentMap> {
  const published = await repo.listPublishedVersions(tenantId);
  return assembleDocumentMap(published);
}

function buildInheritanceChain(categoryId: string, documents: SchemaDocumentMap): { categoryId: string; categoryPath: string }[] {
  const chain: { categoryId: string; categoryPath: string }[] = [];
  const visited = new Set<string>();
  let currentId: string | null = categoryId;
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const doc = documents.get(currentId);
    if (!doc) break;
    chain.unshift({ categoryId: doc.categoryId, categoryPath: doc.categoryPath });
    currentId = doc.inheritsFromCategoryId;
  }
  return chain;
}

export async function loadEditorInitial(
  ctx: AdminSchemaServiceContext,
  category: { id: string; name: string; slug: string; path: string },
): Promise<SchemaEditorInitialDto> {
  const { tenantId, repo } = ctx;
  const publishedRecord = await repo.getPublishedVersion(tenantId, category.id);
  let draftRecord = await repo.getDraftVersion(tenantId, category.id);

  if (!draftRecord && publishedRecord) {
    draftRecord = await clonePublishedToDraft(ctx, category.id);
  }

  const publishedMap = await loadPublishedMap(repo, tenantId);
  const attributes = await repo.listAttributeDefinitions(tenantId);
  const auditEvents = await repo.listAuditEvents(tenantId, category.id, 20);

  let bindings: CategorySchemaFieldBinding[] = [];
  let matching = publishedRecord
    ? recordToCategorySchemaSeed(publishedRecord).matching
    : { identifierFields: [], tupleFields: [], weightedFields: [] };
  let denormalize = publishedRecord
    ? recordToCategorySchemaSeed(publishedRecord).denormalize
    : {};

  if (draftRecord) {
    const seed = recordToCategorySchemaSeed(draftRecord);
    bindings = seed.document.fields;
    matching = seed.matching;
    denormalize = seed.denormalize;
  } else if (publishedRecord) {
    bindings = recordToCategorySchemaSeed(publishedRecord).document.fields;
  }

  const draftSeed = draftRecord ? recordToCategorySchemaSeed(draftRecord) : null;
  const preview = draftSeed
    ? buildAdminPreview(draftSeed, publishedMap, attributes)
    : null;

  const documents: SchemaDocumentMap = new Map(publishedMap);
  if (draftSeed) documents.set(category.id, draftSeed.document);

  return {
    category,
    draft: draftRecord ? toVersionSummary(draftRecord) : null,
    published: publishedRecord ? toVersionSummary(publishedRecord) : null,
    bindings,
    matching,
    denormalize,
    availableAttributes: attributes,
    inheritanceChain: buildInheritanceChain(category.id, documents),
    preview,
    auditEvents,
  };
}

export async function clonePublishedToDraft(
  ctx: AdminSchemaServiceContext,
  categoryId: string,
): Promise<import("../persistence/types").CategorySchemaVersionRecord> {
  const { tenantId, repo, actorUserId } = ctx;
  const published = await repo.getPublishedVersion(tenantId, categoryId);
  if (!published) {
    throw new SchemaRepositoryError("No published schema to clone", "NOT_FOUND");
  }

  const existingDraft = await repo.getDraftVersion(tenantId, categoryId);
  const publishedSeed = recordToCategorySchemaSeed(published);
  const nextVersion = published.version.version + 1;

  const draftSeed: CategorySchemaSeed = {
    ...publishedSeed,
    document: {
      ...publishedSeed.document,
      id: existingDraft?.version.id ?? randomUUID(),
      version: existingDraft?.version.version ?? nextVersion,
      state: "draft",
      publishedAt: null,
    },
  };

  const saved = await repo.saveDraft({
    tenantId,
    seed: draftSeed,
    existingDraftId: existingDraft?.version.id,
  });

  await repo.appendAuditEvent({
    tenantId,
    categoryId,
    schemaVersionId: saved.version.id,
    eventType: existingDraft ? "draft_saved" : "draft_created",
    actorUserId,
    reason: "Cloned from published",
    payload: { sourceVersion: published.version.version },
  });

  return saved;
}

export async function saveDraftBindings(
  ctx: AdminSchemaServiceContext,
  input: SaveDraftInputDto,
  baseSeed: CategorySchemaSeed,
): Promise<SaveDraftResultDto> {
  const { tenantId, repo, actorUserId } = ctx;

  try {
    const seed = buildSeedFromBindings(baseSeed, input.bindings);
    if (seed.document.version !== input.expectedVersion) {
      return { ok: false, message: "Version number mismatch" };
    }

    const saved = await repo.saveDraft({
      tenantId,
      seed,
      existingDraftId: input.versionId,
      expectedRevision: input.expectedRevision,
    });

    await repo.appendAuditEvent({
      tenantId,
      categoryId: input.categoryId,
      schemaVersionId: saved.version.id,
      eventType: "draft_saved",
      actorUserId,
      payload: { fieldCount: input.bindings.length },
    });

    return { ok: true, revisionToken: revisionTokenFromVersion(saved.version.updated_at) };
  } catch (e) {
    if (e instanceof SchemaRepositoryError) {
      return { ok: false, message: e.message };
    }
    throw e;
  }
}

export async function getPreviewForDraft(
  ctx: AdminSchemaServiceContext,
  draftSeed: CategorySchemaSeed,
): Promise<PreviewResultDto> {
  const publishedMap = await loadPublishedMap(ctx.repo, ctx.tenantId);
  const attributes = await ctx.repo.listAttributeDefinitions(ctx.tenantId);
  const preview = buildAdminPreview(draftSeed, publishedMap, attributes);
  const readiness = assessPublishReadiness({
    draftSeed,
    publishedDocuments: publishedMap,
    attributeDefinitions: attributes,
  });
  return {
    preview,
    readiness: {
      publishReady: readiness.publishReady,
      blockingErrors: readiness.blockingErrors,
      warnings: readiness.warnings,
    },
  };
}

export async function getDiffDraftVsPublished(
  ctx: AdminSchemaServiceContext,
  draftSeed: CategorySchemaSeed,
  categoryId: string,
): Promise<DiffResultDto | null> {
  const published = await ctx.repo.getPublishedVersion(ctx.tenantId, categoryId);
  if (!published) {
    const diff = diffSchemaVersions(
      { document: { ...draftSeed.document, fields: [] }, matching: draftSeed.matching, denormalize: draftSeed.denormalize },
      draftSeed,
    );
    return { diff, diffHash: computeDiffHash(diff) };
  }
  const publishedSeed = recordToCategorySchemaSeed(published);
  const diff = diffSchemaVersions(publishedSeed, draftSeed);
  return { diff, diffHash: computeDiffHash(diff) };
}

export async function publishDraft(
  ctx: AdminSchemaServiceContext,
  input: PublishDraftInputDto,
  draftSeed: CategorySchemaSeed,
): Promise<PublishDraftResultDto> {
  const { tenantId, repo, actorUserId } = ctx;

  await repo.appendAuditEvent({
    tenantId,
    categoryId: input.categoryId,
    schemaVersionId: input.versionId,
    eventType: "publish_started",
    actorUserId,
    reason: input.reason ?? null,
  });

  const diffResult = await getDiffDraftVsPublished(ctx, draftSeed, input.categoryId);
  if (!diffResult) {
    await repo.appendAuditEvent({
      tenantId,
      categoryId: input.categoryId,
      schemaVersionId: input.versionId,
      eventType: "publish_failed",
      actorUserId,
      reason: "Could not compute diff",
    });
    return { ok: false, message: "Could not compute diff" };
  }

  if (diffResult.diffHash !== input.diffHash) {
    await repo.appendAuditEvent({
      tenantId,
      categoryId: input.categoryId,
      schemaVersionId: input.versionId,
      eventType: "publish_failed",
      actorUserId,
      reason: "Diff hash mismatch",
      payload: { expected: input.diffHash, actual: diffResult.diffHash },
    });
    return { ok: false, message: "Diff hash mismatch — review changes and confirm again" };
  }

  const draftRecord = await repo.getVersionById(input.versionId);
  if (!draftRecord || draftRecord.version.state !== "draft") {
    return { ok: false, message: "Draft not found" };
  }
  if (revisionTokenFromVersion(draftRecord.version.updated_at) !== input.expectedRevision) {
    return { ok: false, message: "Revision conflict — save draft and retry" };
  }

  const publishedMap = await loadPublishedMap(repo, tenantId);
  const attributes = await repo.listAttributeDefinitions(tenantId);
  const readiness = assessPublishReadiness({
    draftSeed,
    publishedDocuments: publishedMap,
    attributeDefinitions: attributes,
  });

  if (!readiness.publishReady) {
    await repo.appendAuditEvent({
      tenantId,
      categoryId: input.categoryId,
      schemaVersionId: input.versionId,
      eventType: "publish_failed",
      actorUserId,
      payload: { errors: readiness.blockingErrors },
    });
    return { ok: false, message: "Publish blocked", blockingErrors: readiness.blockingErrors };
  }

  try {
    const existingPublished = await repo.getPublishedVersion(tenantId, input.categoryId);
    const published = await repo.publishVersion({
      tenantId,
      categoryId: input.categoryId,
      versionId: input.versionId,
      publishedAt: new Date().toISOString(),
      expectedVersion: input.expectedVersion,
    });

    if (existingPublished && existingPublished.version.id !== input.versionId) {
      await repo.appendAuditEvent({
        tenantId,
        categoryId: input.categoryId,
        schemaVersionId: existingPublished.version.id,
        eventType: "version_superseded",
        actorUserId,
        payload: { supersededBy: published.version.id, version: existingPublished.version.version },
      });
    }

    await repo.appendAuditEvent({
      tenantId,
      categoryId: input.categoryId,
      schemaVersionId: published.version.id,
      eventType: "publish_succeeded",
      actorUserId,
      reason: input.reason ?? null,
      payload: { diffHash: input.diffHash, version: published.version.version },
    });

    return { ok: true, publishedVersionId: published.version.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Publish failed";
    await repo.appendAuditEvent({
      tenantId,
      categoryId: input.categoryId,
      schemaVersionId: input.versionId,
      eventType: "publish_failed",
      actorUserId,
      reason: message,
    });
    return { ok: false, message };
  }
}
