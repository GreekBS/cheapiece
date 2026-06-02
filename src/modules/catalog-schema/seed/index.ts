import { AttributeRegistry } from "../registry/attribute-registry";
import type { CategorySchemaDocument } from "../types/category-schema-document";
import type { SchemaDocumentMap } from "../schema/inheritance-resolver";
import { PILOT_ATTRIBUTES } from "./attributes";
import { buildMobileSchemaSeed } from "./schemas/mobile";
import { buildApparelSchemaSeed } from "./schemas/apparel";
import type { CategorySchemaSeed, PilotCatalogSeed } from "./types";

export type PilotCategoryIds = {
  mobileCategoryId: string;
  apparelCategoryId: string;
  mobileVersionId?: string;
  apparelVersionId?: string;
};

export function buildPilotCatalogSeed(ids: PilotCategoryIds): PilotCatalogSeed {
  const mobileVersionId = ids.mobileVersionId ?? crypto.randomUUID();
  const apparelVersionId = ids.apparelVersionId ?? crypto.randomUUID();
  return {
    attributes: PILOT_ATTRIBUTES,
    schemas: [
      buildMobileSchemaSeed(ids.mobileCategoryId, mobileVersionId),
      buildApparelSchemaSeed(ids.apparelCategoryId, apparelVersionId),
    ],
  };
}

/** Legacy in-memory pilot map (uses placeholder category ids for unit tests). */
export const PILOT_CATALOG_SEED: PilotCatalogSeed = buildPilotCatalogSeed({
  mobileCategoryId: "cat.mobile",
  apparelCategoryId: "cat.apparel",
  mobileVersionId: "schema.mobile.v1",
  apparelVersionId: "schema.apparel.v1",
});

export function createPilotAttributeRegistry(): AttributeRegistry {
  return AttributeRegistry.from(PILOT_ATTRIBUTES);
}

export function createPilotSchemaDocumentMap(): SchemaDocumentMap {
  const map: SchemaDocumentMap = new Map();
  for (const seed of PILOT_CATALOG_SEED.schemas) {
    map.set(seed.document.categoryId, seed.document);
  }
  return map;
}

export function getPilotSchemaSeed(categoryId: string): CategorySchemaSeed | undefined {
  return PILOT_CATALOG_SEED.schemas.find((s) => s.document.categoryId === categoryId);
}

export function getPilotSchemaDocument(categoryId: string): CategorySchemaDocument | undefined {
  return getPilotSchemaSeed(categoryId)?.document;
}
