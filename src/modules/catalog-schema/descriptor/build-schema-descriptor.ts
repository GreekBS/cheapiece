import type { SchemaDescriptor, SchemaDescriptorField } from "../types/schema-descriptor";
import type { EffectiveCategorySchema } from "../types/effective-schema";
import type { DenormalizeMap, MatchingConfig } from "../types/category-schema-document";
import { STANDARD_ATTRIBUTE_GROUPS } from "../types/attribute-groups";

const GROUP_LABELS: Record<string, Record<string, string>> = {
  general: { el: "Γενικά", en: "General" },
  specifications: { el: "Προδιαγραφές", en: "Specifications" },
  dimensions: { el: "Διαστάσεις", en: "Dimensions" },
  connectivity: { el: "Συνδεσιμότητα", en: "Connectivity" },
  identifiers: { el: "Αναγνωριστικά", en: "Identifiers" },
  media: { el: "Πολυμέσα", en: "Media" },
  compliance: { el: "Συμμόρφωση", en: "Compliance" },
};

export function buildSchemaDescriptor(
  schema: EffectiveCategorySchema,
  matching: MatchingConfig,
  denormalize: DenormalizeMap,
): SchemaDescriptor {
  const locale = schema.document.locale;
  const groupCodes = new Set(schema.fields.map((f) => f.groupCode));
  for (const g of STANDARD_ATTRIBUTE_GROUPS) {
    if (schema.fields.some((f) => f.groupCode === g)) groupCodes.add(g);
  }

  const groups = [...groupCodes].map((code, index) => ({
    code,
    label: GROUP_LABELS[code]?.[locale] ?? GROUP_LABELS[code]?.en ?? code,
    sortOrder: STANDARD_ATTRIBUTE_GROUPS.indexOf(code as (typeof STANDARD_ATTRIBUTE_GROUPS)[number]) >= 0
      ? STANDARD_ATTRIBUTE_GROUPS.indexOf(code as (typeof STANDARD_ATTRIBUTE_GROUPS)[number])
      : 100 + index,
  }));

  groups.sort((a, b) => a.sortOrder - b.sortOrder);

  const fields: SchemaDescriptorField[] = schema.fields
    .filter((f) => f.merchantVisible && !f.overrides?.hide)
    .map((field) => {
      const def = field.definition;
      const label =
        field.overrides?.label?.[locale] ?? def.labels[locale] ?? def.labels.en ?? def.code;
      const enumOptions = resolveEnumOptions(def.enumOptions, field.overrides?.enumOptionsSubset, locale);
      const minRule = field.validationRules?.find((r) => r.kind === "min");
      const maxRule = field.validationRules?.find((r) => r.kind === "max");
      const maxLenRule = field.validationRules?.find((r) => r.kind === "max_length");

      return {
        code: def.code,
        primitive: def.primitive,
        groupCode: field.groupCode,
        label,
        helpText: def.description?.[locale] ?? def.description?.en,
        requiredLevel: field.requiredLevel,
        sortOrder: field.sortOrder,
        enumOptions,
        unit: def.defaultUnit,
        allowedUnits: def.allowedUnits,
        min: minRule?.kind === "min" ? minRule.value : undefined,
        max: maxRule?.kind === "max" ? maxRule.value : undefined,
        maxLength: maxLenRule?.kind === "max_length" ? maxLenRule.value : undefined,
        filterable: field.filterable,
        searchable: field.searchable,
        comparable: field.comparable,
        variantAxis: field.variantAxis,
        merchantVisible: field.merchantVisible,
      };
    });

  fields.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  return {
    schemaVersionId: schema.document.id,
    categoryId: schema.document.categoryId,
    categoryPath: schema.document.categoryPath,
    version: schema.document.version,
    locale,
    groups,
    fields,
    matching: {
      identifierFields: matching.identifierFields,
      brandField: matching.brandField,
      modelField: matching.modelField,
      tupleFields: matching.tupleFields,
      weightedFields: matching.weightedFields,
    },
    denormalize: { ...denormalize },
  };
}

function resolveEnumOptions(
  options: { code: string; labels: Record<string, string>; state?: string }[] | undefined,
  subset: string[] | undefined,
  locale: string,
): { code: string; label: string }[] | undefined {
  if (!options?.length) return undefined;
  let active = options.filter((o) => o.state !== "archived");
  if (subset?.length) {
    const allowed = new Set(subset);
    active = active.filter((o) => allowed.has(o.code));
  }
  return active.map((o) => ({
    code: o.code,
    label: o.labels[locale] ?? o.labels.en ?? o.code,
  }));
}
