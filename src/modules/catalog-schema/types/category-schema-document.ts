import type { CategorySchemaFieldBinding } from "./schema-field";

export type CategorySchemaState = "draft" | "published" | "archived";

export type CategorySchemaDocument = {
  id: string;
  categoryId: string;
  categoryPath: string;
  version: number;
  state: CategorySchemaState;
  inheritsFromCategoryId: string | null;
  tenantId: string;
  fields: CategorySchemaFieldBinding[];
  publishedAt: string | null;
  locale: string;
};

export type DenormalizeMap = {
  title?: string;
  brand?: string;
  model?: string;
  gtin?: string;
  mpn?: string;
  slugFrom?: string;
};

export type MatchingConfig = {
  identifierFields: string[];
  brandField?: string;
  modelField?: string;
  tupleFields: string[];
  weightedFields: { code: string; weight: number }[];
};
