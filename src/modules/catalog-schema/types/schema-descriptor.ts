import type { AttributePrimitive } from "./primitives";
import type { RequiredLevel } from "./required-level";

/**
 * PUBLIC API CONTRACT — serializable only.
 * No DB ids, audit fields, or React references.
 */
export type SchemaDescriptor = {
  schemaVersionId: string;
  categoryId: string;
  categoryPath: string;
  version: number;
  locale: string;
  groups: SchemaDescriptorGroup[];
  fields: SchemaDescriptorField[];
  matching: SchemaDescriptorMatching;
  denormalize: SchemaDescriptorDenormalize;
};

export type SchemaDescriptorGroup = {
  code: string;
  label: string;
  sortOrder: number;
};

export type SchemaDescriptorField = {
  code: string;
  primitive: AttributePrimitive;
  groupCode: string;
  label: string;
  helpText?: string;
  requiredLevel: RequiredLevel;
  sortOrder: number;
  enumOptions?: { code: string; label: string }[];
  unit?: string;
  allowedUnits?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  filterable: boolean;
  searchable: boolean;
  comparable: boolean;
  variantAxis: boolean;
  merchantVisible: boolean;
};

export type SchemaDescriptorMatching = {
  identifierFields: string[];
  brandField?: string;
  modelField?: string;
  tupleFields: string[];
  weightedFields: { code: string; weight: number }[];
};

export type SchemaDescriptorDenormalize = {
  title?: string;
  brand?: string;
  model?: string;
  gtin?: string;
  mpn?: string;
  slugFrom?: string;
};
