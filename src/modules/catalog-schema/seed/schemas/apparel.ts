import type { CategorySchemaSeed } from "../types";

const LOCALE = "el";

export function buildApparelSchemaSeed(categoryId: string, versionId: string): CategorySchemaSeed {
  return {
    document: {
      id: versionId,
      categoryId,
      categoryPath: "pilot/royxa",
      version: 1,
      state: "published",
      inheritsFromCategoryId: null,
      tenantId: "pilot",
      publishedAt: "2026-01-01T00:00:00.000Z",
      locale: LOCALE,
      fields: [
        field("core.title", "required", "general", 10, { min_length: 3 }),
        field("apparel.size", "required", "specifications", 20),
        field("apparel.material", "recommended", "specifications", 30),
        field("apparel.gender", "required", "general", 40),
        field("core.color", "required", "specifications", 50),
      ],
    },
    matching: {
      identifierFields: [],
      tupleFields: ["core.title", "apparel.size", "apparel.gender", "core.color"],
      weightedFields: [
        { code: "apparel.size", weight: 0.35 },
        { code: "apparel.gender", weight: 0.25 },
        { code: "core.color", weight: 0.25 },
        { code: "apparel.material", weight: 0.15 },
      ],
    },
    denormalize: {
      title: "core.title",
      slugFrom: "core.title",
    },
  };
}

function field(
  attributeCode: string,
  requiredLevel: "required" | "recommended" | "optional",
  groupCode: string,
  sortOrder: number,
  rules?: { min_length?: number },
) {
  return {
    attributeCode,
    requiredLevel,
    groupCode,
    sortOrder,
    filterable: attributeCode !== "core.title",
    searchable: attributeCode === "core.title",
    comparable: attributeCode.startsWith("apparel.") || attributeCode === "core.color",
    variantAxis: attributeCode === "apparel.size" || attributeCode === "core.color",
    merchantVisible: true,
    validationRules: rules?.min_length
      ? [{ kind: "min_length" as const, value: rules.min_length }]
      : undefined,
  };
}
