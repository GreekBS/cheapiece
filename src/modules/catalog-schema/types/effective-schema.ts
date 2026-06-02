import type { AttributeDefinition } from "./attribute-definition";
import type { CategorySchemaDocument } from "./category-schema-document";
import type { CategorySchemaFieldBinding } from "./schema-field";

export type EffectiveSchemaField = CategorySchemaFieldBinding & {
  definition: AttributeDefinition;
};

/** Resolved schema after inheritance — internal; not sent to client. */
export type EffectiveCategorySchema = {
  document: CategorySchemaDocument;
  fields: EffectiveSchemaField[];
};
