import type { CategorySchemaSeed } from "../types";

const LOCALE = "el";

export function buildMobileSchemaSeed(categoryId: string, versionId: string): CategorySchemaSeed {
  return {
    document: {
      id: versionId,
      categoryId,
      categoryPath: "pilot/kinhta",
      version: 1,
      state: "published",
      inheritsFromCategoryId: null,
      tenantId: "pilot",
      publishedAt: "2026-01-01T00:00:00.000Z",
      locale: LOCALE,
      fields: [
        field("core.title", "required", "general", 10, { min_length: 3, max_length: 200 }),
        field("core.brand", "required", "general", 20),
        field("core.model", "required", "general", 30),
        field("mobile.ram_gb", "required", "specifications", 100, { min: 1, max: 64 }),
        field("mobile.storage_gb", "required", "specifications", 110, { min: 8, max: 2048 }),
        field("mobile.screen_size", "recommended", "specifications", 120, { min: 3, max: 8, precision: 2 }),
        field("core.color", "optional", "specifications", 130),
      ],
    },
    matching: {
      identifierFields: [],
      brandField: "core.brand",
      modelField: "core.model",
      tupleFields: ["core.brand", "core.model", "mobile.ram_gb", "mobile.storage_gb"],
      weightedFields: [
        { code: "mobile.ram_gb", weight: 0.35 },
        { code: "mobile.storage_gb", weight: 0.35 },
        { code: "mobile.screen_size", weight: 0.15 },
        { code: "core.color", weight: 0.15 },
      ],
    },
    denormalize: {
      title: "core.title",
      brand: "core.brand",
      model: "core.model",
      slugFrom: "core.title",
    },
  };
}

function field(
  attributeCode: string,
  requiredLevel: "required" | "recommended" | "optional",
  groupCode: string,
  sortOrder: number,
  rules?: { min?: number; max?: number; precision?: number; min_length?: number; max_length?: number },
) {
  const validationRules = rules
    ? ([
        rules.min !== undefined ? { kind: "min" as const, value: rules.min } : null,
        rules.max !== undefined ? { kind: "max" as const, value: rules.max } : null,
        rules.precision !== undefined ? { kind: "precision" as const, value: rules.precision } : null,
        rules.min_length !== undefined ? { kind: "min_length" as const, value: rules.min_length } : null,
        rules.max_length !== undefined ? { kind: "max_length" as const, value: rules.max_length } : null,
      ].filter(Boolean) as import("../../types/validation-rule").ValidationRule[])
    : undefined;

  return {
    attributeCode,
    requiredLevel,
    groupCode,
    sortOrder,
    filterable: attributeCode !== "core.title",
    searchable: attributeCode === "core.title" || attributeCode === "core.brand",
    comparable: attributeCode.startsWith("mobile."),
    variantAxis: attributeCode === "mobile.ram_gb" || attributeCode === "mobile.storage_gb",
    merchantVisible: true,
    validationRules,
  };
}
