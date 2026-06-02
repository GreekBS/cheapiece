import type { SupabaseClient } from "@supabase/supabase-js";

import { submitCatalogProductRequest } from "../application/submit-catalog-product-request";
import {
  InvalidCatalogRequestError,
  LegacySchemaMigrationRequiredError,
} from "../application/catalog-validation-state";
import { fetchActiveProductIdBySlug, fetchVendorTenantId } from "../queries/catalog-product-request-queries";
import type { CatalogProductRequestAttributePayload } from "../types/phase2-schema-baseline";
import type { SubmitCatalogProductRequestInput } from "../validations/catalog-product-request";

import {
  detectL1MerchantDuplicateSubmission,
  L1_DUPLICATE_WARNING_MESSAGE,
  logVariantDedupEvent,
  isVariantDedupShadowMode,
} from "../variant-dedup";
import { logVariantDedupShadowEvent } from "../variant-dedup/variant-dedup-shadow-log";

import { parseAttributeValuesFromFormData } from "./parse-merchant-attribute-values";

export type SubmitCatalogProductRequestDuplicateWarning = {
  existingRequestId: string;
  message: string;
};

export type SubmitCatalogProductRequestCoreResult =
  | { ok: true; id: string; duplicateWarning?: SubmitCatalogProductRequestDuplicateWarning }
  | { ok: false; message: string };

export type SubmitCatalogProductRequestCoreArgs = {
  userId: string;
  accessibleVendorIds: string[];
  payload: SubmitCatalogProductRequestInput;
  /** STRICT pin — optional; server validates when present. */
  schemaVersionId?: string | null;
  /** Raw attribute values — server builds payload + meta via evaluator. */
  attributeValues?: Record<string, unknown>;
  /** Hint only — validated server-side at submit. */
  merchantSelectedProductId?: string | null;
};

/**
 * Shared submit path for `catalog_product_requests` (dashboard + merchant wizard).
 * WARNING: Inserts are delegated to submitCatalogProductRequest() — the only valid ingestion path.
 */
export async function submitCatalogProductRequestCore(
  supabase: SupabaseClient,
  args: SubmitCatalogProductRequestCoreArgs,
): Promise<SubmitCatalogProductRequestCoreResult> {
  if (!args.accessibleVendorIds.includes(args.payload.vendorId)) {
    return { ok: false, message: "Δεν έχετε πρόσβαση σε αυτό το κατάστημα." };
  }

  const tenantId = await fetchVendorTenantId(supabase, args.payload.vendorId);
  if (!tenantId) {
    return { ok: false, message: "Δεν βρέθηκε tenant για το κατάστημα." };
  }

  const slug = args.payload.slugSuggestion;
  const conflict = await fetchActiveProductIdBySlug(supabase, tenantId, slug);
  if (conflict) {
    return {
      ok: false,
      message:
        "Υπάρχει ήδη προϊόν με αυτό το slug στον tenant. Αναζητήστε τον κατάλογο ή αλλάξτε slug.",
    };
  }

  const schemaVersionId = args.schemaVersionId?.trim() || null;
  let attributePayload: CatalogProductRequestAttributePayload | undefined;

  if (args.attributeValues && Object.keys(args.attributeValues).length > 0) {
    attributePayload = { values: args.attributeValues } as CatalogProductRequestAttributePayload;
  }

  const l1Duplicate = await detectL1MerchantDuplicateSubmission(supabase, {
    vendor_id: args.payload.vendorId,
    category_id: args.payload.categoryId,
    title: args.payload.title,
    brand: args.payload.brand ?? null,
    model: args.payload.model ?? null,
    gtin: args.payload.gtin ?? null,
    mpn: args.payload.mpn ?? null,
    slug_suggestion: slug,
    attribute_payload: attributePayload,
  });

  if (l1Duplicate.isDuplicate && l1Duplicate.existingRequestId) {
    logVariantDedupEvent({
      event: "variant.l1_duplicate_detected",
      vendorId: args.payload.vendorId,
      existingRequestId: l1Duplicate.existingRequestId,
      merchantVariantSignatureHash: l1Duplicate.merchantVariantSignatureHash,
      actionTaken: "warn_before_submit",
    });
    if (isVariantDedupShadowMode()) {
      logVariantDedupShadowEvent({
        event: "would_detect_duplicate",
        vendorId: args.payload.vendorId,
        existingRequestId: l1Duplicate.existingRequestId,
      });
    }
  }

  try {
    const { id } = await submitCatalogProductRequest(supabase, {
      tenant_id: tenantId,
      vendor_id: args.payload.vendorId,
      submitted_by_user_id: args.userId,
      category_id: args.payload.categoryId,
      title: args.payload.title,
      brand: args.payload.brand ?? null,
      model: args.payload.model ?? null,
      slug_suggestion: slug,
      gtin: args.payload.gtin ?? null,
      mpn: args.payload.mpn ?? null,
      schema_version_id: schemaVersionId,
      attribute_payload: attributePayload,
      merchant_selected_product_id: args.merchantSelectedProductId ?? null,
      requested_price_amount: args.payload.requestedPriceAmount ?? null,
      requested_stock_quantity: args.payload.requestedStockQuantity ?? null,
      requested_price_currency:
        args.payload.requestedPriceAmount != null ? "EUR" : null,
    });
    if (l1Duplicate.isDuplicate && l1Duplicate.existingRequestId) {
      logVariantDedupEvent({
        event: "variant.l1_duplicate_detected",
        requestId: id,
        vendorId: args.payload.vendorId,
        existingRequestId: l1Duplicate.existingRequestId,
        merchantVariantSignatureHash: l1Duplicate.merchantVariantSignatureHash,
        actionTaken: "submitted_with_warning",
      });
      return {
        ok: true,
        id,
        duplicateWarning: {
          existingRequestId: l1Duplicate.existingRequestId,
          message: L1_DUPLICATE_WARNING_MESSAGE,
        },
      };
    }

    return { ok: true, id };
  } catch (e) {
    if (e instanceof LegacySchemaMigrationRequiredError) {
      return {
        ok: false,
        message:
          "Απαιτείται schema pinning (STRICT). Υποβάλετε ξανά με δημοσιευμένο schema_version_id.",
      };
    }
    if (e instanceof InvalidCatalogRequestError) {
      const first = Object.values(e.errors)[0]?.[0];
      return { ok: false, message: first ?? "Μη έγκυρο αίτημα καταλόγου." };
    }
    if (e instanceof Error) {
      return { ok: false, message: e.message };
    }
    return { ok: false, message: "Αποτυχία υποβολής αιτήματος." };
  }
}

/** FormData entry point — parses `attr[code]` fields and optional `schemaVersionId`. */
export async function submitCatalogProductRequestCoreFromFormData(
  supabase: SupabaseClient,
  args: Omit<SubmitCatalogProductRequestCoreArgs, "attributeValues" | "schemaVersionId"> & {
    formData: FormData;
  },
): Promise<SubmitCatalogProductRequestCoreResult> {
  const schemaRaw = args.formData.get("schemaVersionId");
  const schemaVersionId =
    typeof schemaRaw === "string" && schemaRaw.trim().length > 0 ? schemaRaw.trim() : null;
  const attributeValues = parseAttributeValuesFromFormData(args.formData);
  const merchantRaw = args.formData.get("merchantSelectedProductId");
  const merchantSelectedProductId =
    typeof merchantRaw === "string" && merchantRaw.trim().length > 0 ? merchantRaw.trim() : null;

  return submitCatalogProductRequestCore(supabase, {
    ...args,
    schemaVersionId,
    attributeValues: Object.keys(attributeValues).length > 0 ? attributeValues : undefined,
    merchantSelectedProductId,
  });
}
