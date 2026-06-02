import type { SchemaDescriptor } from "@/modules/catalog-schema/types/schema-descriptor";

import type { ProductFacetEntry } from "../types/facet-snapshot";

import { formatFieldDisplayValue, normalizeFacetValue } from "./format-field-value";

export function buildProductFacetSnapshot(args: {
  values: Record<string, unknown>;
  descriptor: SchemaDescriptor | null;
}): ProductFacetEntry[] {
  if (!args.descriptor) {
    return [];
  }

  const facets: ProductFacetEntry[] = [];

  for (const field of args.descriptor.fields) {
    if (!field.filterable) {
      continue;
    }
    const raw = args.values[field.code];
    if (raw === undefined || raw === null || raw === "") {
      continue;
    }
    const value = normalizeFacetValue(field.primitive, raw);
    facets.push({
      code: field.code,
      primitive: field.primitive,
      label: field.label,
      value,
      displayValue: formatFieldDisplayValue(field, raw),
    });
  }

  return facets.sort((a, b) => a.code.localeCompare(b.code));
}
