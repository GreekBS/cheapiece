import "server-only";

import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import type { StoredCatalogProductRequestAttributePayload } from "@/modules/catalog-requests/types/phase2-schema-baseline";

import type {
  AdminRequestPreviewDisplayGroup,
  AdminRequestPreviewMode,
  AdminRequestPreviewVM,
  AdminRequestValidationModeDisplay,
} from "../dto/admin-request-preview.vm";

function validationModeLabel(
  meta: StoredCatalogProductRequestAttributePayload["meta"] | undefined,
): AdminRequestValidationModeDisplay | undefined {
  if (!meta?.validationMode) {
    return undefined;
  }
  return meta.validationMode === "STRICT" ? "STRICT" : "LENIENT";
}

function derivePreviewMode(
  row: CatalogProductRequestRow,
  values: Record<string, unknown>,
): AdminRequestPreviewMode {
  const pinned = row.schema_version_id != null;
  const metaMode = row.attribute_payload?.meta?.validationMode;
  const hasValues = Object.keys(values).length > 0;

  if (pinned || metaMode === "STRICT") {
    return "strict";
  }
  if (!hasValues && !pinned) {
    return "legacy";
  }
  return "partial";
}

function normalizeAttributeValues(payload: CatalogProductRequestRow["attribute_payload"]): Record<string, unknown> {
  const raw = payload?.values;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return { ...(raw as Record<string, unknown>) };
}

function buildDisplayGroupsFromValues(
  values: Record<string, unknown>,
): AdminRequestPreviewDisplayGroup[] {
  const byGroup = new Map<string, AdminRequestPreviewDisplayGroup["fields"]>();

  for (const [code, value] of Object.entries(values)) {
    const dot = code.indexOf(".");
    const group = dot > 0 ? code.slice(0, dot) : "attributes";
    const list = byGroup.get(group) ?? [];
    list.push({ code, value });
    byGroup.set(group, list);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, fields]) => ({
      group,
      fields: fields.sort((a, b) => a.code.localeCompare(b.code)),
    }));
}

/**
 * Maps catalog_product_requests row → admin preview VM.
 * No schema resolution, validation, or marketplace logic.
 */
export function toAdminRequestPreviewVM(
  row: CatalogProductRequestRow,
  options?: { vendorLabel?: string },
): AdminRequestPreviewVM {
  const payload = row.attribute_payload;
  const values = normalizeAttributeValues(payload);

  const displayGroups = buildDisplayGroupsFromValues(values);
  const schemaVersionId = row.schema_version_id ?? payload?.meta?.schemaVersionId ?? undefined;

  const merchantIntent =
    row.requested_price_amount != null || row.requested_stock_quantity != null
      ? {
          ...(row.requested_price_amount != null
            ? {
                priceAmount: row.requested_price_amount,
                currency: row.requested_price_currency ?? "EUR",
              }
            : {}),
          ...(row.requested_stock_quantity != null
            ? { stockQuantity: row.requested_stock_quantity }
            : {}),
        }
      : undefined;

  return {
    requestId: row.id,
    status: row.status,
    mode: derivePreviewMode(row, values),
    scalars: {
      title: row.title,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      gtin: row.gtin ?? undefined,
      mpn: row.mpn ?? undefined,
      slugSuggestion: row.slug_suggestion,
    },
    merchantIntent,
    attributeValues: values,
    validationMode: validationModeLabel(payload?.meta),
    schemaVersionId: schemaVersionId ?? undefined,
    displayGroups: displayGroups.length > 0 ? displayGroups : undefined,
    facetDebug: Object.keys(values).length > 0 ? { ...values } : undefined,
    createdAt: row.created_at,
    resolvedProductId: row.resolved_product_id,
    categoryId: row.category_id,
    vendorLabel: options?.vendorLabel ?? row.vendor_id,
  };
}
