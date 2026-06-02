import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchBaselinePublicationProductId,
  fetchPendingRevisionForProduct,
  insertPendingProductDefinitionRevision,
} from "@/modules/catalog-requests/queries/product-definition-revision-queries";
import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import type { ProposedProductDefinitionPayload } from "@/modules/catalog-requests/types/product-definition-revision";
import {
  classifyCatalogRequestEditDiff,
  type CatalogRequestEditPayload,
} from "@/modules/catalog-requests/services/classify-catalog-request-edit-diff";

function buildProposedPayload(
  baseline: CatalogProductRequestRow,
  input: CatalogRequestEditPayload,
): ProposedProductDefinitionPayload {
  return {
    title: input.title.trim(),
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    categoryId: input.categoryId?.trim() || null,
    slugSuggestion: input.slugSuggestion.trim(),
    gtin: input.gtin?.trim() || null,
    mpn: input.mpn?.trim() || null,
    description: input.description?.trim() || null,
    attributes: input.attributes ?? {},
    sourceCatalogRequestId: baseline.id,
    sourceCatalogRequestUpdatedAt: baseline.updated_at,
  };
}

function buildDiffSummary(args: {
  changedMajor: string[];
  changedMinor: string[];
  unknownFields: string[];
}): Record<string, unknown> {
  return {
    changedMajor: args.changedMajor,
    changedMinor: args.changedMinor,
    unknownFields: args.unknownFields,
  };
}

export type SubmitProductDefinitionRevisionResult =
  | { ok: true; revisionId: string }
  | { ok: false; code: "not_eligible" | "no_publication" | "pending_exists" | "not_major" | "server_error"; message: string };

export async function submitProductDefinitionRevision(
  supabase: SupabaseClient,
  args: {
    baseline: CatalogProductRequestRow;
    input: CatalogRequestEditPayload;
    submittedBy: string;
    unknownPayloadFields?: string[];
  },
): Promise<SubmitProductDefinitionRevisionResult> {
  if (args.baseline.status !== "approved" || !args.baseline.resolved_product_id) {
    return {
      ok: false,
      code: "not_eligible",
      message: "Οι αλλαγές ορισμού προϊόντος απαιτούν εγκεκριμένο προϊόν.",
    };
  }

  const diff = classifyCatalogRequestEditDiff({
    row: args.baseline,
    payload: args.input,
    unknownPayloadFields: args.unknownPayloadFields,
  });

  if (diff.kind !== "major") {
    return {
      ok: false,
      code: "not_major",
      message: "Δεν εντοπίστηκαν αλλαγές ορισμού προϊόντος.",
    };
  }

  const productId = args.baseline.resolved_product_id;
  const publicationProductId = await fetchBaselinePublicationProductId(supabase, productId);
  if (!publicationProductId) {
    return {
      ok: false,
      code: "no_publication",
      message: "Δεν βρέθηκε δημοσιευμένη έκδοση προϊόντος για αναθεώρηση.",
    };
  }

  const existingPending = await fetchPendingRevisionForProduct(
    supabase,
    args.input.vendorId,
    productId,
  );
  if (existingPending) {
    return {
      ok: false,
      code: "pending_exists",
      message: "Υπάρχει ήδη αίτηση αναθεώρησης σε εξέλιξη για αυτό το προϊόν.",
    };
  }

  const proposedPayload = buildProposedPayload(args.baseline, args.input);
  const changedFields = [...diff.changedMajor, ...diff.unknownFields];

  const insert = await insertPendingProductDefinitionRevision(supabase, {
    tenantId: args.baseline.tenant_id,
    vendorId: args.input.vendorId,
    productId,
    sourceCatalogRequestId: args.baseline.id,
    baselinePublicationProductId: publicationProductId,
    proposedPayload,
    changedFields,
    diffSummary: buildDiffSummary({
      changedMajor: diff.changedMajor,
      changedMinor: diff.changedMinor,
      unknownFields: diff.unknownFields,
    }),
    submittedBy: args.submittedBy,
  });

  if (!insert.ok) {
    const code = insert.message.includes("ήδη") ? "pending_exists" : "server_error";
    return { ok: false, code, message: insert.message };
  }

  return { ok: true, revisionId: insert.revision.id };
}
