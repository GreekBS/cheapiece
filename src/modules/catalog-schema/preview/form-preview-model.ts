import type { SchemaDescriptor } from "../types/schema-descriptor";

export type FormPreviewField = {
  code: string;
  label: string;
  primitive: string;
  groupCode: string;
  requiredLevel: string;
  enumOptions?: { code: string; label: string }[];
};

export type FormPreviewGroup = {
  code: string;
  label: string;
  sortOrder: number;
  fields: FormPreviewField[];
};

export function buildFormPreviewModel(descriptor: SchemaDescriptor): FormPreviewGroup[] {
  const groupMap = new Map(descriptor.groups.map((g) => [g.code, g]));
  const byGroup = new Map<string, FormPreviewField[]>();

  for (const field of descriptor.fields) {
    const list = byGroup.get(field.groupCode) ?? [];
    list.push({
      code: field.code,
      label: field.label,
      primitive: field.primitive,
      groupCode: field.groupCode,
      requiredLevel: field.requiredLevel,
      enumOptions: field.enumOptions,
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
    .filter((g) => g.fields.length > 0 || groupMap.has(g.code));
}
