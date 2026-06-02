import type { RequiredLevel } from "./required-level";
import type { ValidationRule } from "./validation-rule";

export type CategorySchemaFieldOverride = {
  enumOptionsSubset?: string[];
  label?: Record<string, string>;
  hide?: boolean;
};

/** Binding of a registry attribute to a category schema version. */
export type CategorySchemaFieldBinding = {
  attributeCode: string;
  requiredLevel: RequiredLevel;
  groupCode: string;
  sortOrder: number;
  validationRules?: ValidationRule[];
  filterable: boolean;
  searchable: boolean;
  comparable: boolean;
  /** Future-ready — no variant engine in Phase 0. */
  variantAxis: boolean;
  merchantVisible: boolean;
  overrides?: CategorySchemaFieldOverride;
};
