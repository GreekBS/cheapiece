import type { AttributePrimitive } from "../types/primitives";
import { ATTRIBUTE_PRIMITIVES } from "../types/primitives";

export type PrimitiveCapability = {
  supportsEnumOptions: boolean;
  supportsUnits: boolean;
  supportsNumericRules: boolean;
  supportsLengthRules: boolean;
  isIdentifier: boolean;
  comparableDefault: boolean;
  filterableDefault: boolean;
};

const CAPABILITIES: Record<AttributePrimitive, PrimitiveCapability> = {
  text: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: true,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: false,
  },
  rich_text: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: true,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: false,
  },
  integer: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: true,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: true,
    filterableDefault: true,
  },
  decimal: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: true,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: true,
    filterableDefault: true,
  },
  boolean: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: true,
  },
  enum_single: {
    supportsEnumOptions: true,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: true,
    filterableDefault: true,
  },
  enum_multi: {
    supportsEnumOptions: true,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: true,
  },
  measurement: {
    supportsEnumOptions: false,
    supportsUnits: true,
    supportsNumericRules: true,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: true,
    filterableDefault: true,
  },
  weight: {
    supportsEnumOptions: false,
    supportsUnits: true,
    supportsNumericRules: true,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: true,
    filterableDefault: true,
  },
  dimension: {
    supportsEnumOptions: false,
    supportsUnits: true,
    supportsNumericRules: true,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: false,
  },
  color: {
    supportsEnumOptions: true,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: true,
    filterableDefault: true,
  },
  identifier_gtin: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: true,
    comparableDefault: false,
    filterableDefault: false,
  },
  identifier_mpn: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: true,
    comparableDefault: false,
    filterableDefault: false,
  },
  media_gallery: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: false,
  },
  url: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: true,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: false,
  },
  date: {
    supportsEnumOptions: false,
    supportsUnits: false,
    supportsNumericRules: false,
    supportsLengthRules: false,
    isIdentifier: false,
    comparableDefault: false,
    filterableDefault: true,
  },
};

export function getPrimitiveCapability(primitive: AttributePrimitive): PrimitiveCapability {
  return CAPABILITIES[primitive];
}

export function listPrimitives(): AttributePrimitive[] {
  return [...ATTRIBUTE_PRIMITIVES];
}
