import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import type { PinnedPublishedSchema } from "@/modules/catalog-requests/application/pinned-published-schema";

import type { ProductPublicationDraft } from "../types/product-publication";
import type { ProductDisplayScalars } from "../types/display-snapshot";

import { buildProductDisplaySnapshot } from "./build-product-display-snapshot";
import { buildProductFacetSnapshot } from "./build-product-facet-snapshot";

export type BuildProductPublicationDraftInput = {
  request: CatalogProductRequestRow;
  pinned: PinnedPublishedSchema | null;
  scalars: ProductDisplayScalars;
  publishedAt: string;
};

export type BuildProductPublicationDraftResult =
  | { ok: true; draft: ProductPublicationDraft }
  | { ok: false; errors: Record<string, string[]> };

/**
 * Builds publication payload from an already-validated request (no re-validation).
 * STRICT requires a pinned schema snapshot for display/facet derivation.
 */
export function buildProductPublicationDraft(
  input: BuildProductPublicationDraftInput,
): BuildProductPublicationDraftResult {
  const { request, pinned, scalars, publishedAt } = input;
  const payload = request.attribute_payload;
  const validationMode = payload.meta.validationMode;
  const values = { ...payload.values };
  const locale = pinned?.locale ?? "el";

  if (validationMode === "STRICT") {
    if (!request.schema_version_id) {
      return {
        ok: false,
        errors: { schema_version_id: ["STRICT publication requires schema_version_id on request."] },
      };
    }
    if (!pinned) {
      return {
        ok: false,
        errors: { schema_version_id: ["STRICT publication requires pinned schema snapshot."] },
      };
    }
    if (pinned.schemaVersionId !== request.schema_version_id) {
      return {
        ok: false,
        errors: { schema_version_id: ["Pinned schema version does not match request."] },
      };
    }
    if (payload.meta.schemaVersionId !== request.schema_version_id) {
      return {
        ok: false,
        errors: { attribute_payload: ["Stored payload schemaVersionId mismatch."] },
      };
    }
  }

  if (validationMode !== "STRICT" && pinned) {
    return {
      ok: false,
      errors: { schema_version_id: ["Non-STRICT publication must not include pinned schema."] },
    };
  }

  const descriptor = validationMode === "STRICT" && pinned ? pinned.descriptor : null;

  const display_snapshot = buildProductDisplaySnapshot({
    validationMode,
    locale,
    scalars,
    values,
    descriptor,
  });

  const facet_snapshot = buildProductFacetSnapshot({ values, descriptor });

  const draft: ProductPublicationDraft = {
    schema_version_id: request.schema_version_id,
    validation_mode: validationMode,
    locale,
    attribute_values: values,
    display_snapshot,
    facet_snapshot,
    published_at: publishedAt,
  };

  return { ok: true, draft };
}
