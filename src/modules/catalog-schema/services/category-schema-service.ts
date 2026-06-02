import { AttributeRegistry } from "../registry/attribute-registry";
import { buildSchemaDescriptor } from "../descriptor/build-schema-descriptor";
import {
  resolveEffectiveSchema,
  InheritanceResolutionError,
  type SchemaDocumentMap,
} from "../schema/inheritance-resolver";
import { assembleDocumentMap, recordToCategorySchemaSeed } from "../persistence/mappers";
import type { SchemaRepository } from "../persistence/schema-repository";
import type { CategorySchemaSeed } from "../seed/types";
import type { EffectiveCategorySchema } from "../types/effective-schema";
import type { SchemaDescriptor } from "../types/schema-descriptor";

export class CategorySchemaResolutionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NO_PUBLISHED_SCHEMA"
      | "PARENT_NOT_PUBLISHED"
      | "INHERITANCE_ERROR"
      | "MISSING_ATTRIBUTE",
  ) {
    super(message);
    this.name = "CategorySchemaResolutionError";
  }
}

export type ResolvedPublishedSchema = {
  seed: CategorySchemaSeed;
  effective: EffectiveCategorySchema;
  descriptor: SchemaDescriptor;
  registry: AttributeRegistry;
};

/**
 * Fail-closed resolution of a published category schema from persistence.
 * No silent fallback to in-memory pilots.
 */
export async function resolvePublishedCategorySchema(
  repo: SchemaRepository,
  tenantId: string,
  categoryId: string,
): Promise<ResolvedPublishedSchema> {
  const published = await repo.getPublishedVersion(tenantId, categoryId);
  if (!published) {
    throw new CategorySchemaResolutionError(
      `No published schema for category ${categoryId}`,
      "NO_PUBLISHED_SCHEMA",
    );
  }

  const allPublished = await repo.listPublishedVersions(tenantId);
  const documents: SchemaDocumentMap = assembleDocumentMap(allPublished);

  const seed = recordToCategorySchemaSeed(published);
  await assertInheritanceChainPublished(seed, documents);

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
  return { seed, effective, descriptor, registry };
}

async function assertInheritanceChainPublished(
  seed: CategorySchemaSeed,
  documents: SchemaDocumentMap,
): Promise<void> {
  let parentId = seed.document.inheritsFromCategoryId;
  const visited = new Set<string>([seed.document.categoryId]);

  while (parentId) {
    if (visited.has(parentId)) {
      throw new CategorySchemaResolutionError("Circular category inheritance", "INHERITANCE_ERROR");
    }
    visited.add(parentId);
    const parentDoc = documents.get(parentId);
    if (!parentDoc || parentDoc.state !== "published") {
      throw new CategorySchemaResolutionError(
        `Parent category ${parentId} has no published schema`,
        "PARENT_NOT_PUBLISHED",
      );
    }
    parentId = parentDoc.inheritsFromCategoryId;
  }
}
