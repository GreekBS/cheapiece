import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseSchemaRepository } from "@/modules/catalog-schema";

import type { CatalogProductRequestAttributePayload } from "../types/phase2-schema-baseline";
import type { CatalogRequestEvaluationInput } from "../types/catalog-request-evaluation";
import { computeCatalogRequestMatch } from "@/modules/catalog-request-matching/services/compute-catalog-request-match";
import { submitCatalogProductRequestWithMatchRpc } from "@/modules/catalog-request-matching/queries/submit-catalog-request-with-match-rpc";
import { validateMerchantSelectedProductId } from "@/modules/catalog-request-matching/validation/validate-merchant-selection";

import type { InsertCatalogProductRequestInput } from "../queries/catalog-product-request-queries";
import { buildCatalogRequestEvaluationContext } from "./build-evaluation-context";
import { evaluateCatalogRequestState } from "./evaluate-catalog-request-state";
import { InvalidCatalogRequestError } from "./catalog-validation-state";

export type SubmitCatalogProductRequestApplicationInput = Omit<
  InsertCatalogProductRequestInput,
  "attribute_payload" | "schema_version_id"
> & {
  schema_version_id?: string | null;
  attribute_payload?: CatalogProductRequestAttributePayload;
  /** Hint only — validated server-side; ignored if invalid. */
  merchant_selected_product_id?: string | null;
  requested_price_amount?: number | null;
  requested_stock_quantity?: number | null;
  requested_price_currency?: string | null;
};

export type SubmitCatalogProductRequestResult = { id: string };

// WARNING: This is the only valid ingestion path for catalog_product_requests.
// Orchestration: buildEvaluationContext (DB pin) → evaluateCatalogRequestState (pure) → insert.
export async function submitCatalogProductRequest(
  supabase: SupabaseClient,
  input: SubmitCatalogProductRequestApplicationInput,
): Promise<SubmitCatalogProductRequestResult> {
  const repo = new SupabaseSchemaRepository(supabase);

  const evaluationInput: CatalogRequestEvaluationInput = {
    tenantId: input.tenant_id,
    vendorId: input.vendor_id,
    vendorTenantId: input.tenant_id,
    categoryId: input.category_id,
    schemaVersionId: input.schema_version_id,
    attributePayload: input.attribute_payload,
    submissionScalars: {
      title: input.title,
      slugSuggestion: input.slug_suggestion,
      brand: input.brand,
      model: input.model,
      gtin: input.gtin,
      mpn: input.mpn,
    },
  };

  const ctxBuild = await buildCatalogRequestEvaluationContext(
    repo,
    evaluationInput,
    { now: new Date().toISOString() },
  );

  if (!ctxBuild.ok) {
    throw new InvalidCatalogRequestError(ctxBuild.errors);
  }

  const evaluation = evaluateCatalogRequestState(evaluationInput, ctxBuild.context);

  if (!evaluation.isValid) {
    throw new InvalidCatalogRequestError(evaluation.errors);
  }

  const attributeValues = evaluation.normalizedPayload.values ?? {};

  const matchComputed = await computeCatalogRequestMatch(supabase, {
    tenantId: input.tenant_id,
    categoryId: input.category_id,
    title: input.title,
    brand: input.brand,
    model: input.model,
    attributeValues,
  });

  if (!matchComputed.ok) {
    throw new Error(matchComputed.errorMessage);
  }

  const merchantSelected = await validateMerchantSelectedProductId(
    supabase,
    input.merchant_selected_product_id,
    input.tenant_id,
    input.category_id,
  );

  const rpc = await submitCatalogProductRequestWithMatchRpc(
    supabase,
    {
      tenant_id: input.tenant_id,
      vendor_id: input.vendor_id,
      submitted_by_user_id: input.submitted_by_user_id,
      category_id: input.category_id,
      title: input.title,
      brand: input.brand,
      model: input.model,
      slug_suggestion: input.slug_suggestion,
      gtin: input.gtin,
      mpn: input.mpn,
      schema_version_id: evaluation.schemaVersionId,
      attribute_payload: evaluation.normalizedPayload,
      requested_price_amount: input.requested_price_amount ?? null,
      requested_stock_quantity: input.requested_stock_quantity ?? null,
      requested_price_currency:
        input.requested_price_amount != null
          ? (input.requested_price_currency ?? "EUR")
          : null,
    },
    matchComputed.snapshot,
    merchantSelected,
  );

  if ("error" in rpc) {
    throw rpc.error;
  }

  return { id: rpc.id };
}
