import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { DenormalizeMap, MatchingConfig } from "../types/category-schema-document";

export type FieldChangeKind = "added" | "removed" | "changed" | "hidden" | "unchanged";

export type FieldDiff = {
  attributeCode: string;
  change: FieldChangeKind;
  before?: CategorySchemaFieldBinding;
  after?: CategorySchemaFieldBinding;
  changedAspects: ("requiredLevel" | "flags" | "enumSubset" | "label" | "sortOrder" | "hide")[];
};

export type ConfigDiffEntry = {
  key: string;
  before: unknown;
  after: unknown;
};

export type SchemaDiffDto = {
  summary: {
    fieldsAdded: number;
    fieldsRemoved: number;
    fieldsChanged: number;
    fieldsHidden: number;
  };
  fields: FieldDiff[];
  matching: ConfigDiffEntry[];
  denormalize: ConfigDiffEntry[];
};
