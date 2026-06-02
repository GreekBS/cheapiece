import type { CategorySchemaDocument, DenormalizeMap, MatchingConfig } from "../types/category-schema-document";
import type { AttributeDefinition } from "../types/attribute-definition";

export type CategorySchemaSeed = {
  document: CategorySchemaDocument;
  matching: MatchingConfig;
  denormalize: DenormalizeMap;
};

export type PilotCatalogSeed = {
  attributes: AttributeDefinition[];
  schemas: CategorySchemaSeed[];
};
