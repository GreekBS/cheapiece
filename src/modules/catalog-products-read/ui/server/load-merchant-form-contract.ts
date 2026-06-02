import "server-only";

import { SupabaseSchemaRepository } from "@/modules/catalog-schema/persistence/supabase-schema-repository";
import { pinPublishedSchemaVersion } from "@/modules/catalog-requests/application/pinned-published-schema";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { MerchantFormContractDTO } from "../dto/merchant-form-contract.dto";
import type { MerchantFormLoadResult } from "../dto/merchant-form-load-result.dto";
import { toMerchantFormContract } from "../mappers/to-merchant-form-contract";
import { resolveActivePublishedSchemaVersion } from "./resolve-active-published-schema-version";

export type LoadMerchantFormContractArgs = {
  tenantId: string;
  categoryId: string | null;
};

function contractHasMerchantFields(contract: MerchantFormContractDTO): boolean {
  return contract.groups.some((g) => g.fields.length > 0);
}

/**
 * Server-only merchant form contract loader.
 * legacy → no published schema; partial → schema present, non-strict submit; strict → full pin + schemaVersionId.
 */
export async function loadMerchantFormContract(
  supabase: SupabaseClient,
  args: LoadMerchantFormContractArgs,
): Promise<MerchantFormLoadResult> {
  if (!args.categoryId) {
    return { mode: "legacy", categoryId: null, contract: null };
  }

  const repo = new SupabaseSchemaRepository(supabase);
  const active = await resolveActivePublishedSchemaVersion(repo, args.tenantId, args.categoryId);
  if (!active) {
    return { mode: "legacy", categoryId: args.categoryId, contract: null };
  }

  const pinResult = await pinPublishedSchemaVersion(repo, {
    schemaVersionId: active.schemaVersionId,
    tenantId: args.tenantId,
    categoryId: args.categoryId,
  });

  if (!pinResult.ok) {
    return {
      mode: "partial",
      categoryId: args.categoryId,
      contract: {
        categoryId: args.categoryId,
        locale: active.locale,
        groups: [],
      },
    };
  }

  const contract = toMerchantFormContract(pinResult.pinned.descriptor);

  if (contractHasMerchantFields(contract)) {
    return {
      mode: "strict",
      categoryId: args.categoryId,
      schemaVersionId: active.schemaVersionId,
      contract: {
        ...contract,
        schemaVersionId: active.schemaVersionId,
      },
    };
  }

  return {
    mode: "partial",
    categoryId: args.categoryId,
    contract,
  };
}
