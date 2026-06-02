import type { SchemaDescriptor } from "@/modules/catalog-schema/types/schema-descriptor";
import type { CatalogValidationMode } from "@/modules/catalog-requests/types/phase2-schema-baseline";

import type {
  ProductDisplayGroup,
  ProductDisplayScalars,
  ProductDisplaySnapshot,
} from "../types/display-snapshot";

import { formatFieldDisplayValue } from "./format-field-value";

export function buildProductDisplaySnapshot(args: {
  validationMode: CatalogValidationMode;
  locale: string;
  scalars: ProductDisplayScalars;
  values: Record<string, unknown>;
  descriptor: SchemaDescriptor | null;
}): ProductDisplaySnapshot {
  const groups =
    args.descriptor && args.validationMode === "STRICT"
      ? buildStrictGroups(args.descriptor, args.values)
      : buildLegacyFlatGroup(args.values, args.validationMode);

  return {
    locale: args.locale,
    validationMode: args.validationMode,
    scalars: args.scalars,
    groups,
  };
}

function buildStrictGroups(
  descriptor: SchemaDescriptor,
  values: Record<string, unknown>,
): ProductDisplayGroup[] {
  const byGroup = new Map<string, ProductDisplayGroup["fields"]>();

  for (const field of descriptor.fields) {
    if (!field.merchantVisible) {
      continue;
    }
    const raw = values[field.code];
    if (raw === undefined || raw === null || raw === "") {
      continue;
    }
    const list = byGroup.get(field.groupCode) ?? [];
    list.push({
      code: field.code,
      label: field.label,
      primitive: field.primitive,
      formattedValue: formatFieldDisplayValue(field, raw),
      rawValue: raw,
    });
    byGroup.set(field.groupCode, list);
  }

  return descriptor.groups
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      code: g.code,
      label: g.label,
      sortOrder: g.sortOrder,
      fields: (byGroup.get(g.code) ?? []).sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .filter((g) => g.fields.length > 0);
}

function buildLegacyFlatGroup(
  values: Record<string, unknown>,
  mode: CatalogValidationMode,
): ProductDisplayGroup[] {
  if (mode === "NO_SCHEMA_MINIMAL" || Object.keys(values).length === 0) {
    return [];
  }

  const fields = Object.keys(values)
    .filter((code) => !code.includes("."))
    .sort()
    .map((code) => {
      const raw = values[code];
      return {
        code,
        label: code,
        primitive: "text",
        formattedValue: raw === null || raw === undefined ? "" : String(raw),
        rawValue: raw,
      };
    })
    .filter((f) => f.formattedValue !== "");

  if (fields.length === 0) {
    return [];
  }

  return [
    {
      code: "attributes",
      label: "Χαρακτηριστικά",
      sortOrder: 0,
      fields,
    },
  ];
}
