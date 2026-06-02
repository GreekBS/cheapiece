import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { buildPilotCatalogSeed } from "../seed";
import { assessPublishReadiness } from "../governance/publish-readiness";
import { diffSchemaVersions } from "../diff/diff-schema-versions";
import { computeDiffHash } from "../diff/diff-hash";
import { buildAdminPreview } from "../preview/build-admin-preview";
import { annotateInheritance } from "../preview/annotate-inheritance";
import { formatAuditEntry } from "../audit/format-audit-entry";
import { assembleDocumentMap } from "../persistence/mappers";
import { InMemorySchemaRepository } from "../persistence/in-memory-schema-repository";

const TENANT = "11111111-1111-4111-8111-111111111111";
const CAT = randomUUID();

describe("publish readiness", () => {
  it("blocks missing core.title", () => {
    const pilot = buildPilotCatalogSeed({
      mobileCategoryId: CAT,
      apparelCategoryId: randomUUID(),
    });
    const seed = pilot.schemas[0];
    const draft = {
      ...seed,
      document: {
        ...seed.document,
        fields: seed.document.fields.filter((f) => f.attributeCode !== "core.title"),
      },
    };
    const result = assessPublishReadiness({
      draftSeed: draft,
      publishedDocuments: new Map(),
      attributeDefinitions: pilot.attributes.map((a) => ({ ...a, tenantId: TENANT })),
    });
    assert.equal(result.publishReady, false);
    assert.ok(result.blockingErrors.some((e) => e.code.includes("core.title") || e.message.includes("core.title")));
  });
});

describe("diff engine", () => {
  it("detects added field", () => {
    const pilot = buildPilotCatalogSeed({ mobileCategoryId: CAT, apparelCategoryId: randomUUID() });
    const base = pilot.schemas[0];
    const draft = {
      ...base,
      document: {
        ...base.document,
        fields: base.document.fields.map((f) =>
          f.attributeCode === "mobile.ram_gb" ? { ...f, requiredLevel: "optional" as const } : f,
        ),
      },
    };
    const diff = diffSchemaVersions(base, draft);
    assert.ok(diff.fields.some((f) => f.change === "changed" && f.attributeCode === "mobile.ram_gb"));
    const hash = computeDiffHash(diff);
    assert.equal(hash.length, 64);
  });
});

describe("preview and inheritance annotation", () => {
  it("builds admin preview bundle", () => {
    const pilot = buildPilotCatalogSeed({ mobileCategoryId: CAT, apparelCategoryId: randomUUID() });
    const seed = pilot.schemas[0];
    const preview = buildAdminPreview(seed, new Map(), pilot.attributes.map((a) => ({ ...a, tenantId: TENANT })));
    assert.ok(preview.descriptor.fields.length > 0);
    assert.ok(preview.formPreview.length > 0);
  });

  it("annotates local fields", () => {
    const pilot = buildPilotCatalogSeed({ mobileCategoryId: CAT, apparelCategoryId: randomUUID() });
    const seed = pilot.schemas[0];
    const docs = assembleDocumentMap([]);
    docs.set(CAT, seed.document);
    const views = annotateInheritance(seed.document, docs);
    assert.ok(views.every((v) => v.source === "local"));
  });
});

describe("audit formatter", () => {
  it("formats entry", () => {
    const s = formatAuditEntry({
      id: "1",
      tenantId: TENANT,
      categoryId: CAT,
      schemaVersionId: null,
      eventType: "draft_saved",
      actorUserId: "u1",
      occurredAt: "2026-05-13T12:00:00.000Z",
      reason: null,
      payload: {},
    });
    assert.ok(s.includes("Draft saved"));
  });
});

describe("repository audit", () => {
  it("appends audit events in memory", async () => {
    const repo = new InMemorySchemaRepository();
    const row = await repo.appendAuditEvent({
      tenantId: TENANT,
      categoryId: CAT,
      schemaVersionId: null,
      eventType: "draft_created",
      actorUserId: "user-1",
    });
    const list = await repo.listAuditEvents(TENANT, CAT);
    assert.equal(list.length, 1);
    assert.equal(list[0]!.id, row.id);
  });
});
