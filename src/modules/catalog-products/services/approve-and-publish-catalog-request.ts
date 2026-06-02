import type { SupabaseClient } from "@supabase/supabase-js";

import { createImmutableSchemaSnapshot } from "@/modules/catalog-requests/application/immutable-snapshot";
import { pinPublishedSchemaVersion } from "@/modules/catalog-requests/application/pinned-published-schema";
import { fetchCatalogProductRequestById, catalogRequestModerationBlockedMessage } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import type { ReadonlySchemaRepository } from "@/modules/catalog-requests/types/phase2-schema-baseline";

import { buildPublicationIndex } from "@/modules/catalog-products-index/build-publication-index";

import { buildProductPublicationDraft } from "../application/build-product-publication-draft";
import { approveCatalogRequestPublishRpc } from "../queries/approve-catalog-request-publish-rpc";

export type ApproveAndPublishCatalogRequestInput = {
  requestId: string;
  finalSlug: string;
  title: string;
  brand: string | null;
  model: string | null;
  categoryId: string | null;
  adminNote?: string | null;
};

/**
 * Phase 3A approval orchestrator (single transaction via publish RPC).
 * Snapshot building lives here; DB RPC is a dumb atomic writer only.
 */
export async function approveAndPublishCatalogProductRequest(
  supabase: SupabaseClient,
  repo: ReadonlySchemaRepository,
  input: ApproveAndPublishCatalogRequestInput,
  clock: { now: string },
): Promise<{ ok: true; productId: string } | { ok: false; code: string; message: string }> {
  const fetched = await fetchCatalogProductRequestById(supabase, input.requestId);
  if (fetched.error) {
    return {
      ok: false,
      code: "QUERY_FAILED",
      message: fetched.errorMessage ?? "Αδυναμία φόρτωσης αιτήσης καταλόγου.",
    };
  }
  if (!fetched.data) {
    return { ok: false, code: "NOT_FOUND", message: "Η αίτηση δεν βρέθηκε." };
  }
  const row = fetched.data;
  const moderationBlocked = catalogRequestModerationBlockedMessage(row.status);
  if (moderationBlocked) {
    return {
      ok: false,
      code: row.status === "withdrawn" ? "WITHDRAWN" : "INVALID_STATE",
      message: moderationBlocked,
    };
  }

  const slug = input.finalSlug.trim().toLowerCase();
  if (!slug) {
    return { ok: false, code: "INVALID_SLUG", message: "Μη έγκυρο slug." };
  }

  const categoryId = input.categoryId ?? row.category_id;
  const validationMode = row.attribute_payload.meta.validationMode;

  let pinned = null;
  if (validationMode === "STRICT") {
    if (!row.schema_version_id) {
      return {
        ok: false,
        code: "SCHEMA_PIN_REQUIRED",
        message: "STRICT αίτηση χωρίς schema_version_id.",
      };
    }
    if (!categoryId) {
      return {
        ok: false,
        code: "CATEGORY_REQUIRED",
        message: "STRICT αίτηση χωρίς category_id.",
      };
    }

    const pinResult = await pinPublishedSchemaVersion(repo, {
      schemaVersionId: row.schema_version_id,
      tenantId: row.tenant_id,
      categoryId,
    });

    if (!pinResult.ok) {
      const first = Object.values(pinResult.errors)[0]?.[0];
      return {
        ok: false,
        code: "SCHEMA_PIN_FAILED",
        message: first ?? "Αποτυχία pin published schema.",
      };
    }
    pinned = pinResult.pinned;
  }

  const draftResult = buildProductPublicationDraft({
    request: row,
    pinned,
    scalars: {
      title: input.title.trim(),
      brand: input.brand?.trim() ?? null,
      model: input.model?.trim() ?? null,
      gtin: row.gtin,
      mpn: row.mpn,
    },
    publishedAt: clock.now,
  });

  if (!draftResult.ok) {
    const first = Object.values(draftResult.errors)[0]?.[0];
    return {
      ok: false,
      code: "PUBLICATION_DRAFT_INVALID",
      message: first ?? "Μη έγκυρο publication draft.",
    };
  }

  const publication = createImmutableSchemaSnapshot(draftResult.draft);

  const index =
    categoryId != null
      ? buildPublicationIndex(publication, {
          id: "",
          tenant_id: row.tenant_id,
          category_id: categoryId,
        })
      : null;

  return approveCatalogRequestPublishRpc(supabase, {
    requestId: input.requestId,
    finalSlug: slug,
    title: input.title.trim(),
    brand: input.brand?.trim() ?? "",
    model: input.model?.trim() ?? "",
    categoryId,
    adminNote: input.adminNote?.trim() ?? "",
    publication,
    index,
  });
}
