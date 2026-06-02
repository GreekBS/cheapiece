import {
  AttributeRegistry,
  buildSchemaDescriptor,
  CategorySchemaResolutionError,
  type SchemaDescriptor,
} from "@/modules/catalog-schema";
import { assembleDocumentMap, recordToCategorySchemaSeed } from "@/modules/catalog-schema/persistence/mappers";
import {
  resolveEffectiveSchema,
  InheritanceResolutionError,
} from "@/modules/catalog-schema/schema/inheritance-resolver";
import type { DenormalizeMap } from "@/modules/catalog-schema/types/category-schema-document";
import type { EffectiveCategorySchema } from "@/modules/catalog-schema/types/effective-schema";
import type { CategorySchemaSeed } from "@/modules/catalog-schema/seed/types";
import type { ReadonlySchemaRepository } from "../types/phase2-schema-baseline";

import { createImmutableSchemaSnapshot } from "./immutable-snapshot";

/**
 * STRICT pinnedSchema is:
 * - immutable DTO
 * - value-only object graph
 * - never mutated or extended after creation
 */
export type PinnedPublishedSchema = Readonly<{
  schemaVersionId: string;
  tenantId: string;
  categoryId: string;
  effective: EffectiveCategorySchema;
  descriptor: SchemaDescriptor;
  seed: CategorySchemaSeed;
  locale: string;
  denormalize: DenormalizeMap;
}>;

export type PinPublishedSchemaResult =
  | { ok: true; pinned: PinnedPublishedSchema }
  | { ok: false; errors: Record<string, string[]> };

/**
 * Fetches and freezes published schema state once (STRICT path only).
 * Application is primary validation authority; DB trigger is final safety net only.
 */
export async function pinPublishedSchemaVersion(
  repo: ReadonlySchemaRepository,
  args: { schemaVersionId: string; tenantId: string; categoryId: string },
): Promise<PinPublishedSchemaResult> {
  const record = await repo.getVersionById(args.schemaVersionId);
  if (!record) {
    return { ok: false, errors: { schema_version_id: ["Schema version not found."] } };
  }
  if (record.version.state !== "published") {
    return { ok: false, errors: { schema_version_id: ["Schema version must be published."] } };
  }
  if (record.version.tenant_id !== args.tenantId) {
    return { ok: false, errors: { schema_version_id: ["Schema version tenant mismatch."] } };
  }
  if (record.version.category_id !== args.categoryId) {
    return { ok: false, errors: { schema_version_id: ["Schema version category mismatch."] } };
  }

  try {
    const resolved = await resolvePinnedCategorySchema(repo, args.tenantId, record);
    const pinned = createImmutableSchemaSnapshot({
      schemaVersionId: args.schemaVersionId,
      tenantId: args.tenantId,
      categoryId: record.version.category_id,
      effective: resolved.effective,
      descriptor: resolved.descriptor,
      seed: resolved.seed,
      locale: resolved.seed.document.locale ?? "el",
      denormalize: resolved.seed.denormalize,
    }) as PinnedPublishedSchema;

    return { ok: true, pinned };
  } catch (e) {
    if (e instanceof CategorySchemaResolutionError) {
      return { ok: false, errors: { schema_version_id: [e.message] } };
    }
    throw e;
  }
}

async function resolvePinnedCategorySchema(
  repo: ReadonlySchemaRepository,
  tenantId: string,
  record: NonNullable<Awaited<ReturnType<ReadonlySchemaRepository["getVersionById"]>>>,
): Promise<{
  effective: EffectiveCategorySchema;
  descriptor: SchemaDescriptor;
  seed: CategorySchemaSeed;
}> {
  const allPublished = await repo.listPublishedVersions(tenantId);
  const documents = assembleDocumentMap(allPublished);
  const seed = recordToCategorySchemaSeed(record);

  const definitions = await repo.listAttributeDefinitions(tenantId);
  const registry = AttributeRegistry.from(definitions);

  for (const field of seed.document.fields) {
    if (!registry.has(field.attributeCode)) {
      throw new CategorySchemaResolutionError(
        `Missing attribute definition: ${field.attributeCode}`,
        "MISSING_ATTRIBUTE",
      );
    }
  }

  let effective: EffectiveCategorySchema;
  try {
    effective = resolveEffectiveSchema(seed.document, documents, registry);
  } catch (e) {
    if (e instanceof InheritanceResolutionError) {
      throw new CategorySchemaResolutionError(e.message, "INHERITANCE_ERROR");
    }
    throw e;
  }

  const descriptor = buildSchemaDescriptor(effective, seed.matching, seed.denormalize);
  return { effective, descriptor, seed };
}
