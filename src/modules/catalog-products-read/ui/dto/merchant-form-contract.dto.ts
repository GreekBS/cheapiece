/** Merchant attribute field — DTO only; no schema kernel on client. */
export type MerchantFormFieldDTO = {
  code: string;
  label: string;
  primitive: string;
  groupCode: string;
  requiredLevel: string;
  helpText?: string;
  enumOptions?: { code: string; label: string }[];
  unit?: string;
  allowedUnits?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
  placeholder?: string;
};

export type MerchantFormGroupDTO = {
  code: string;
  label: string;
  sortOrder: number;
  fields: MerchantFormFieldDTO[];
};

/**
 * Merchant dynamic form contract.
 * `schemaVersionId` is present only in strict mode — client must not assume it exists.
 */
export type MerchantFormContractDTO = {
  categoryId: string;
  locale: string;
  groups: MerchantFormGroupDTO[];
  schemaVersionId?: string;
};
