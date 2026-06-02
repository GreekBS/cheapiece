import "server-only";

import type { SchemaDescriptor } from "@/modules/catalog-schema/types/schema-descriptor";

import type { MerchantFormContractDTO, MerchantFormGroupDTO } from "../dto/merchant-form-contract.dto";

export type MerchantFormContractBuildOptions = {
  /** When set, contract is strict-pin ready (included on DTO). */
  schemaVersionId?: string;
};

/**
 * Maps resolved published schema descriptor → merchant DTO.
 * Server-only: imports catalog-schema descriptor shape.
 */
export function toMerchantFormContract(
  descriptor: SchemaDescriptor,
  options?: MerchantFormContractBuildOptions,
): MerchantFormContractDTO {
  const groupMap = new Map(descriptor.groups.map((g) => [g.code, g]));
  const fieldsByGroup = new Map<string, MerchantFormGroupDTO["fields"]>();

  for (const field of descriptor.fields) {
    if (!field.merchantVisible) {
      continue;
    }
    const list = fieldsByGroup.get(field.groupCode) ?? [];
    list.push({
      code: field.code,
      label: field.label,
      primitive: field.primitive,
      groupCode: field.groupCode,
      requiredLevel: field.requiredLevel,
      helpText: field.helpText,
      enumOptions: field.enumOptions,
      unit: field.unit,
      allowedUnits: field.allowedUnits,
      min: field.min,
      max: field.max,
      maxLength: field.maxLength,
      placeholder: field.placeholder,
    });
    fieldsByGroup.set(field.groupCode, list);
  }

  const groups: MerchantFormGroupDTO[] = descriptor.groups
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      code: g.code,
      label: g.label,
      sortOrder: g.sortOrder,
      fields: (fieldsByGroup.get(g.code) ?? []).sort(
        (a, b) => a.code.localeCompare(b.code),
      ),
    }))
    .filter((g) => g.fields.length > 0 || groupMap.has(g.code));

  const contract: MerchantFormContractDTO = {
    categoryId: descriptor.categoryId,
    locale: descriptor.locale,
    groups,
  };

  if (options?.schemaVersionId) {
    contract.schemaVersionId = options.schemaVersionId;
  }

  return contract;
}
