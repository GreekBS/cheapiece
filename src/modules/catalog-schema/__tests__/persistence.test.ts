import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { buildPilotCatalogSeed } from "../seed";
import { InMemorySchemaRepository } from "../persistence/in-memory-schema-repository";
import { recordToCategorySchemaSeed } from "../persistence/mappers";
import { SchemaRepositoryError } from "../persistence/schema-repository";
import {
  CategorySchemaResolutionError,
  resolvePublishedCategorySchema,
} from "../services/category-schema-service";
import { PublishedSchemaMutationError, assertMutableDraft } from "../schema/publish-lifecycle";

const TENANT = "11111111-1111-4111-8111-111111111111";
const MOBILE_CAT = randomUUID();
const APPAREL_CAT = randomUUID();

function pilotSeed() {
  return buildPilotCatalogSeed({
    mobileCategoryId: MOBILE_CAT,
    apparelCategoryId: APPAREL_CAT,
    mobileVersionId: randomUUID(),
    apparelVersionId: randomUUID(),
  });
}

describe("persistence roundtrip", () => {
  it("persists and reloads published schema via repository", async () => {
    const repo = new InMemorySchemaRepository();
    const pilot = pilotSeed();
    await repo.upsertAttributeDefinitions(TENANT, pilot.attributes.map((a) => ({ ...a, tenantId: TENANT })));

    const mobileSeed = pilot.schemas[0];
    const draft = await repo.saveDraft({
      tenantId: TENANT,
      seed: { ...mobileSeed, document: { ...mobileSeed.document, tenantId: TENANT } },
    });
    const published = await repo.publishVersion({
      tenantId: TENANT,
      categoryId: MOBILE_CAT,
      versionId: draft.version.id,
      publishedAt: new Date().toISOString(),
      expectedVersion: 1,
    });

    const loaded = await repo.getPublishedVersion(TENANT, MOBILE_CAT);
    assert.ok(loaded);
    const roundtripped = recordToCategorySchemaSeed(loaded);
    assert.equal(roundtripped.document.categoryId, MOBILE_CAT);
    assert.equal(roundtripped.document.fields.length, mobileSeed.document.fields.length);
    assert.equal(roundtripped.document.state, "published");
    assert.equal(published.version.state, "published");
  });
});

describe("publish immutability", () => {
  it("rejects draft save on published version id semantics", async () => {
    const repo = new InMemorySchemaRepository();
    const pilot = pilotSeed();
    await repo.upsertAttributeDefinitions(TENANT, pilot.attributes.map((a) => ({ ...a, tenantId: TENANT })));
    const seed = pilot.schemas[0];
    const draft = await repo.saveDraft({ tenantId: TENANT, seed: { ...seed, document: { ...seed.document, tenantId: TENANT } } });
    await repo.publishVersion({
      tenantId: TENANT,
      categoryId: MOBILE_CAT,
      versionId: draft.version.id,
      publishedAt: new Date().toISOString(),
      expectedVersion: 1,
    });
    const published = await repo.getPublishedVersion(TENANT, MOBILE_CAT);
    assert.throws(
      () => assertMutableDraft(recordToCategorySchemaSeed(published!).document),
      PublishedSchemaMutationError,
    );
  });
});

describe("version superseding", () => {
  it("archives prior published when publishing v2", async () => {
    const repo = new InMemorySchemaRepository();
    const pilot = pilotSeed();
    await repo.upsertAttributeDefinitions(TENANT, pilot.attributes.map((a) => ({ ...a, tenantId: TENANT })));

    const v1Seed = pilot.schemas[0];
    const d1 = await repo.saveDraft({ tenantId: TENANT, seed: { ...v1Seed, document: { ...v1Seed.document, tenantId: TENANT, version: 1 } } });
    await repo.publishVersion({
      tenantId: TENANT,
      categoryId: MOBILE_CAT,
      versionId: d1.version.id,
      publishedAt: new Date().toISOString(),
      expectedVersion: 1,
    });

    const v2Seed = {
      ...v1Seed,
      document: { ...v1Seed.document, id: randomUUID(), version: 2, tenantId: TENANT, state: "draft" as const, publishedAt: null },
    };
    const d2 = await repo.saveDraft({ tenantId: TENANT, seed: v2Seed });
    await repo.publishVersion({
      tenantId: TENANT,
      categoryId: MOBILE_CAT,
      versionId: d2.version.id,
      publishedAt: new Date().toISOString(),
      expectedVersion: 2,
    });

    const versions = await repo.listVersionsForCategory(TENANT, MOBILE_CAT);
    const published = versions.filter((v) => v.state === "published");
    const archived = versions.filter((v) => v.state === "archived");
    assert.equal(published.length, 1);
    assert.equal(published[0].version, 2);
    assert.equal(archived.length, 1);
    assert.equal(archived[0].version, 1);
  });

  it("rejects publish when expected version mismatches", async () => {
    const repo = new InMemorySchemaRepository();
    const pilot = pilotSeed();
    await repo.upsertAttributeDefinitions(TENANT, pilot.attributes.map((a) => ({ ...a, tenantId: TENANT })));
    const draft = await repo.saveDraft({
      tenantId: TENANT,
      seed: { ...pilot.schemas[0], document: { ...pilot.schemas[0].document, tenantId: TENANT } },
    });
    await assert.rejects(
      () =>
        repo.publishVersion({
          tenantId: TENANT,
          categoryId: MOBILE_CAT,
          versionId: draft.version.id,
          publishedAt: new Date().toISOString(),
          expectedVersion: 99,
        }),
      SchemaRepositoryError,
    );
  });
});

describe("resolve fail-closed", () => {
  it("throws when no published schema", async () => {
    const repo = new InMemorySchemaRepository();
    await assert.rejects(
      () => resolvePublishedCategorySchema(repo, TENANT, MOBILE_CAT),
      CategorySchemaResolutionError,
    );
  });

  it("throws when attribute definition missing", async () => {
    const repo = new InMemorySchemaRepository();
    const pilot = pilotSeed();
    const seed = pilot.schemas[0];
    const draft = await repo.saveDraft({ tenantId: TENANT, seed: { ...seed, document: { ...seed.document, tenantId: TENANT } } });
    await repo.publishVersion({
      tenantId: TENANT,
      categoryId: MOBILE_CAT,
      versionId: draft.version.id,
      publishedAt: new Date().toISOString(),
      expectedVersion: 1,
    });
    await assert.rejects(
      () => resolvePublishedCategorySchema(repo, TENANT, MOBILE_CAT),
      (e: unknown) => e instanceof CategorySchemaResolutionError && e.code === "MISSING_ATTRIBUTE",
    );
  });
});
