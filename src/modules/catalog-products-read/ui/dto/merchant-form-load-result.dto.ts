import type { MerchantFormContractDTO } from "./merchant-form-contract.dto";

export type MerchantFormLoadMode = "legacy" | "partial" | "strict";

export type MerchantFormLoadResultLegacy = {
  mode: "legacy";
  categoryId: string | null;
  contract: null;
};

export type MerchantFormLoadResultPartial = {
  mode: "partial";
  categoryId: string;
  contract: MerchantFormContractDTO;
};

export type MerchantFormLoadResultStrict = {
  mode: "strict";
  categoryId: string;
  schemaVersionId: string;
  contract: MerchantFormContractDTO;
};

export type MerchantFormLoadResult =
  | MerchantFormLoadResultLegacy
  | MerchantFormLoadResultPartial
  | MerchantFormLoadResultStrict;
