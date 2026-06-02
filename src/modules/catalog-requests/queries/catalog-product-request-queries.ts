import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeAuditQ } from "@/components/admin/catalog-requests/catalog-request-audit-url-params";
import type { AuditStatusTab } from "@/components/admin/catalog-requests/catalog-request-audit-list-utils";
import { logger } from "@/lib/observability/logger";

import type {
  CatalogProductRequestListRow,
  CatalogProductRequestRow,
  CatalogProductRequestStatus,
} from "../types/catalog-product-request";
import type {
  CatalogProductRequestListQueryResult,
  CatalogProductRequestQueryResult,
  CatalogProductRequestSingleQueryResult,
} from "../types/catalog-product-request-query-result";
import type {
  CatalogValidationMode,
  StoredCatalogProductRequestAttributePayload,
} from "../types/phase2-schema-baseline";

import {
  CATALOG_PRODUCT_REQUEST_SELECT_FLAT,
  UNKNOWN_VENDOR_LABEL,
} from "./catalog-product-request-read-constants";
import {
  executeSupabaseMaybeSingleQuery,
  executeSupabaseQuery,
  logCatalogRequestQueryOutcome,
  toCatalogProductQueryFailure,
  toCatalogProductQuerySuccess,
} from "./execute-supabase-query";

/** Normalizes legacy rows; never surfaces empty-string schemaVersionId. */
export function normalizeStoredAttributePayload(
  raw: unknown,
): StoredCatalogProductRequestAttributePayload {
  const r = (raw ?? {}) as Partial<StoredCatalogProductRequestAttributePayload>;
  const meta = r.meta;
  const values =
    r.values && typeof r.values === "object" && !Array.isArray(r.values) ? r.values : {};

  let schemaVersionId: string | null = meta?.schemaVersionId ?? null;
  if (schemaVersionId === "" || schemaVersionId === undefined) {
    schemaVersionId = null;
  }

  const rawMode = meta?.validationMode as string | undefined;
  const validationMode: CatalogValidationMode =
    rawMode === "LEGACY"
      ? "LEGACY_SAFE"
      : rawMode === "NO_SCHEMA"
        ? "NO_SCHEMA_MINIMAL"
        : rawMode === "STRICT" || rawMode === "LEGACY_SAFE" || rawMode === "NO_SCHEMA_MINIMAL"
          ? rawMode
          : schemaVersionId
            ? "STRICT"
            : "LEGACY_SAFE";

  return {
    values,
    meta: {
      schemaVersionId,
      validatedAt: meta?.validatedAt ?? "",
      validationMode,
    },
  };
}

function mapFlatRow(r: Record<string, unknown>): CatalogProductRequestRow {
  return {
    id: r.id as string,
    tenant_id: r.tenant_id as string,
    vendor_id: r.vendor_id as string,
    submitted_by_user_id: r.submitted_by_user_id as string,
    category_id: (r.category_id as string | null) ?? null,
    schema_version_id: (r.schema_version_id as string | null) ?? null,
    attribute_payload: normalizeStoredAttributePayload(r.attribute_payload),
    title: r.title as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    slug_suggestion: r.slug_suggestion as string,
    gtin: (r.gtin as string | null) ?? null,
    mpn: (r.mpn as string | null) ?? null,
    status: r.status as CatalogProductRequestRow["status"],
    rejection_reason: (r.rejection_reason as string | null) ?? null,
    admin_note: (r.admin_note as string | null) ?? null,
    resolved_product_id: (r.resolved_product_id as string | null) ?? null,
    reviewed_by_user_id: (r.reviewed_by_user_id as string | null) ?? null,
    reviewed_at: (r.reviewed_at as string | null) ?? null,
    requested_price_amount:
      r.requested_price_amount == null ? null : Number(r.requested_price_amount),
    requested_stock_quantity:
      r.requested_stock_quantity == null ? null : Number(r.requested_stock_quantity),
    requested_price_currency: (r.requested_price_currency as string | null) ?? null,
    merchant_hidden_at: (r.merchant_hidden_at as string | null) ?? null,
    merchant_hidden_by_user_id: (r.merchant_hidden_by_user_id as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

/** Merchant Store OS: hidden rows must never surface in product lists/tabs. */
export function isCatalogRequestVisibleToMerchant(
  row: Pick<CatalogProductRequestRow, "merchant_hidden_at">,
): boolean {
  return row.merchant_hidden_at == null;
}

/** Admin moderation guard — pending only; withdrawn is terminal. */
export function catalogRequestModerationBlockedMessage(
  status: CatalogProductRequestRow["status"],
): string | null {
  if (status === "withdrawn") {
    return "Η αίτηση ανακλήθηκε από τον έμπορο.";
  }
  if (status !== "pending") {
    return "Η αίτηση έχει ήδη αξιολογηθεί.";
  }
  return null;
}

function toListRow(row: CatalogProductRequestRow, vendorName: string): CatalogProductRequestListRow {
  return { ...row, vendor_name: vendorName };
}

/**
 * Batch vendor name lookup (deduped). Failures are logged; never breaks the caller list.
 */
export async function fetchVendorNamesByIds(
  supabase: SupabaseClient,
  vendorIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(vendorIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.from("vendors").select("id, name").in("id", unique);

  if (error) {
    logger.error({
      domain: "catalog_requests",
      function: "fetchVendorNamesByIds",
      vendorIds: unique,
      error: { message: error.message, code: error.code },
    });
    return new Map();
  }
  if (!data) {
    logger.error({
      domain: "catalog_requests",
      function: "fetchVendorNamesByIds",
      vendorIds: unique,
      error: { message: "vendors select returned no data" },
    });
    return new Map();
  }

  return new Map((data as { id: string; name: string }[]).map((v) => [v.id, v.name]));
}

function resolveVendorDisplayName(vendorNames: Map<string, string>, vendorId: string): string {
  return vendorNames.get(vendorId) ?? UNKNOWN_VENDOR_LABEL;
}

async function enrichRowsWithVendorNames(
  supabase: SupabaseClient,
  rows: CatalogProductRequestRow[],
): Promise<CatalogProductRequestListRow[]> {
  const vendorNames = await fetchVendorNamesByIds(
    supabase,
    rows.map((r) => r.vendor_id),
  );
  return rows.map((r) => toListRow(r, resolveVendorDisplayName(vendorNames, r.vendor_id)));
}

export type InsertCatalogProductRequestInput = {
  tenant_id: string;
  vendor_id: string;
  submitted_by_user_id: string;
  category_id: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  slug_suggestion: string;
  gtin: string | null;
  mpn: string | null;
  schema_version_id?: string | null;
  attribute_payload: StoredCatalogProductRequestAttributePayload;
};

/**
 * @internal Use submitCatalogProductRequest() — sole insert entry point for catalog_product_requests.
 */
export async function insertCatalogProductRequestInternal(
  supabase: SupabaseClient,
  input: InsertCatalogProductRequestInput,
): Promise<{ id: string } | { error: Error }> {
  if (!input.attribute_payload) {
    return { error: new Error("attribute_payload is required (use submitCatalogProductRequest)") };
  }

  const { data, error } = await supabase
    .from("catalog_product_requests")
    .insert({
      tenant_id: input.tenant_id,
      vendor_id: input.vendor_id,
      submitted_by_user_id: input.submitted_by_user_id,
      category_id: input.category_id,
      title: input.title.trim(),
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      slug_suggestion: input.slug_suggestion.trim(),
      gtin: input.gtin?.trim() || null,
      mpn: input.mpn?.trim() || null,
      status: "pending",
      schema_version_id: input.schema_version_id ?? null,
      attribute_payload: input.attribute_payload,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error ?? new Error("insert catalog_product_requests failed") };
  }
  return { id: data.id as string };
}

/** Admin queue: pending only. Flat select + separate vendor enrichment (no embed). */
export async function listPendingCatalogProductRequests(
  supabase: SupabaseClient,
  limit = 100,
): Promise<CatalogProductRequestListQueryResult> {
  const outcome = await executeSupabaseQuery<Record<string, unknown>[]>({
    functionName: "listPendingCatalogProductRequests",
    userErrorMessage: "Αδυναμία φόρτωσης εκκρεμών αιτήσεων καταλόγου.",
    emptyDataMessage: "catalog_product_requests pending list returned null data",
    run: async () =>
      supabase
        .from("catalog_product_requests")
        .select(CATALOG_PRODUCT_REQUEST_SELECT_FLAT)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(limit),
  });

  if (!outcome.ok) {
    return toCatalogProductQueryFailure(outcome);
  }

  const flatRows = outcome.data.map(mapFlatRow);
  const enriched = await enrichRowsWithVendorNames(supabase, flatRows);
  return { ...toCatalogProductQuerySuccess(enriched, outcome), error: false };
}

export type AdminCatalogProductRequestHistoryOptions = {
  tenantId: string;
  tab?: AuditStatusTab;
  q?: string;
  limit?: number;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const ADMIN_CATALOG_REQUEST_COUNT_STATUSES: CatalogProductRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
];

function applyAdminCatalogRequestHistoryScope(
  // Aggregate selects widen PostgREST builder types; scope filters are identical across queries.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  tenantId: string,
  normalizedQ: string,
) {
  let scoped = query.eq("tenant_id", tenantId);
  if (normalizedQ) {
    const pattern = `%${escapeIlikePattern(normalizedQ)}%`;
    scoped = scoped.or(`title.ilike.${pattern},slug_suggestion.ilike.${pattern}`);
  }
  return scoped;
}

export type AdminCatalogProductRequestTabCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  withdrawn: number;
};

export type AdminCatalogProductRequestCountsOptions = {
  tenantId: string;
  q?: string;
};

export type AdminCatalogProductRequestCountsQueryResult = {
  data: AdminCatalogProductRequestTabCounts;
  error: boolean;
  errorMessage?: string;
};

const ZERO_ADMIN_CATALOG_REQUEST_TAB_COUNTS: AdminCatalogProductRequestTabCounts = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  withdrawn: 0,
};

function tabCountsFromStatusGroups(
  groups: { status: CatalogProductRequestStatus; count: number }[],
): AdminCatalogProductRequestTabCounts {
  const counts: AdminCatalogProductRequestTabCounts = { ...ZERO_ADMIN_CATALOG_REQUEST_TAB_COUNTS };
  for (const group of groups) {
    counts[group.status] = group.count;
  }
  counts.all =
    counts.pending + counts.approved + counts.rejected + counts.withdrawn;
  return counts;
}

type StatusCountGroupRow = {
  status: CatalogProductRequestStatus;
  count: number;
};

async function fetchAdminCatalogRequestStatusCountGroups(
  supabase: SupabaseClient,
  tenantId: string,
  normalizedQ: string,
): Promise<{ ok: true; groups: StatusCountGroupRow[] } | { ok: false; errorMessage: string }> {
  const { data, error } = await applyAdminCatalogRequestHistoryScope(
    supabase.from("catalog_product_requests").select("status, count:id.count()"),
    tenantId,
    normalizedQ,
  );

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  if (!Array.isArray(data)) {
    return { ok: false, errorMessage: "catalog_product_requests status counts returned null data" };
  }

  const groups: StatusCountGroupRow[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const status = (row as { status?: unknown }).status;
    const count = (row as { count?: unknown }).count;
    if (
      typeof status !== "string" ||
      !ADMIN_CATALOG_REQUEST_COUNT_STATUSES.includes(status as CatalogProductRequestStatus) ||
      typeof count !== "number"
    ) {
      continue;
    }
    groups.push({ status: status as CatalogProductRequestStatus, count });
  }

  return { ok: true, groups };
}

async function fetchAdminCatalogRequestStatusCountGroupsParallel(
  supabase: SupabaseClient,
  tenantId: string,
  normalizedQ: string,
): Promise<{ ok: true; groups: StatusCountGroupRow[] } | { ok: false; errorMessage: string }> {
  const results = await Promise.all(
    ADMIN_CATALOG_REQUEST_COUNT_STATUSES.map(async (status) => {
      const { count, error } = await applyAdminCatalogRequestHistoryScope(
        supabase.from("catalog_product_requests").select("id", { count: "exact", head: true }),
        tenantId,
        normalizedQ,
      ).eq("status", status);

      if (error) {
        return { status, count: null as number | null, errorMessage: error.message };
      }

      return { status, count: count ?? 0, errorMessage: null as string | null };
    }),
  );

  const failed = results.find((result) => result.errorMessage != null);
  if (failed?.errorMessage) {
    return { ok: false, errorMessage: failed.errorMessage };
  }

  return {
    ok: true,
    groups: results.map((result) => ({
      status: result.status,
      count: result.count ?? 0,
    })),
  };
}

/** Admin audit tab badges: tenant-scoped status totals; optional title/slug search scope. */
export async function listAdminCatalogProductRequestCounts(
  supabase: SupabaseClient,
  options: AdminCatalogProductRequestCountsOptions,
): Promise<AdminCatalogProductRequestCountsQueryResult> {
  const { tenantId, q = "" } = options;
  const normalizedQ = normalizeAuditQ(q);
  const functionName = "listAdminCatalogProductRequestCounts";
  const started = performance.now();

  let grouped = await fetchAdminCatalogRequestStatusCountGroups(supabase, tenantId, normalizedQ);
  if (!grouped.ok) {
    grouped = await fetchAdminCatalogRequestStatusCountGroupsParallel(supabase, tenantId, normalizedQ);
  }

  const durationMs = Math.round(performance.now() - started);

  if (!grouped.ok) {
    logger.error({
      domain: "catalog_requests",
      function: functionName,
      durationMs,
      result: "error",
      error: { message: grouped.errorMessage },
    });
    logCatalogRequestQueryOutcome({
      function: functionName,
      result: "error",
      count: 0,
      durationMs,
    });
    return {
      data: ZERO_ADMIN_CATALOG_REQUEST_TAB_COUNTS,
      error: true,
      errorMessage: "Αδυναμία φόρτωσης μετρητών αιτήσεων καταλόγου.",
    };
  }

  const data = tabCountsFromStatusGroups(grouped.groups);
  logCatalogRequestQueryOutcome({
    function: functionName,
    result: "success",
    count: data.all,
    durationMs,
  });

  return { data, error: false };
}

/** Admin audit history: tenant-scoped; optional status + title/slug search (V1). */
export async function listAdminCatalogProductRequestHistory(
  supabase: SupabaseClient,
  options: AdminCatalogProductRequestHistoryOptions,
): Promise<CatalogProductRequestListQueryResult> {
  const { tenantId, tab = "all", q = "", limit = 200 } = options;
  const normalizedQ = normalizeAuditQ(q);

  const outcome = await executeSupabaseQuery<Record<string, unknown>[]>({
    functionName: "listAdminCatalogProductRequestHistory",
    userErrorMessage: "Αδυναμία φόρτωσης αιτήσεων καταλόγου.",
    emptyDataMessage: "catalog_product_requests admin history returned null data",
    run: async () => {
      let query = applyAdminCatalogRequestHistoryScope(
        supabase.from("catalog_product_requests").select(CATALOG_PRODUCT_REQUEST_SELECT_FLAT),
        tenantId,
        normalizedQ,
      );

      if (tab !== "all") {
        query = query.eq("status", tab);
      }

      return query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
    },
  });

  if (!outcome.ok) {
    return toCatalogProductQueryFailure(outcome);
  }

  const flatRows = outcome.data.map(mapFlatRow);
  const enriched = await enrichRowsWithVendorNames(supabase, flatRows);
  return { ...toCatalogProductQuerySuccess(enriched, outcome), error: false };
}

export async function fetchCatalogProductRequestById(
  supabase: SupabaseClient,
  id: string,
): Promise<CatalogProductRequestSingleQueryResult> {
  const outcome = await executeSupabaseMaybeSingleQuery<Record<string, unknown>>({
    functionName: "fetchCatalogProductRequestById",
    requestId: id,
    userErrorMessage: "Αδυναμία φόρτωσης αιτήσης καταλόγου.",
    emptyDataMessage: "catalog_product_requests row not found",
    run: async () =>
      supabase
        .from("catalog_product_requests")
        .select(CATALOG_PRODUCT_REQUEST_SELECT_FLAT)
        .eq("id", id)
        .maybeSingle(),
  });

  if (!outcome.ok) {
    return {
      data: null,
      error: true,
      errorMessage: outcome.errorMessage,
      meta: outcome.meta,
    };
  }

  if (!outcome.data) {
    return {
      data: null,
      error: false,
      meta: outcome.meta,
    };
  }

  const row = mapFlatRow(outcome.data);
  const vendorNames = await fetchVendorNamesByIds(supabase, [row.vendor_id]);
  return {
    data: toListRow(row, resolveVendorDisplayName(vendorNames, row.vendor_id)),
    error: false,
    meta: outcome.meta,
  };
}

export async function updateCatalogProductRequestRejection(
  supabase: SupabaseClient,
  args: {
    id: string;
    reviewed_by_user_id: string;
    rejection_reason: string;
    admin_note?: string | null;
  },
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("catalog_product_requests")
    .update({
      status: "rejected",
      rejection_reason: args.rejection_reason.trim(),
      reviewed_by_user_id: args.reviewed_by_user_id,
      reviewed_at: new Date().toISOString(),
      admin_note: args.admin_note?.trim() || null,
    })
    .eq("id", args.id)
    .eq("status", "pending");

  return { error: error ?? null };
}

/** Slug conflict check (same tenant, any lifecycle — matches DB unique index). */
export async function fetchActiveProductIdBySlug(
  supabase: SupabaseClient,
  tenantId: string,
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return (data as { id: string }).id;
}

export type VendorTenantRow = { id: string; tenant_id: string };

export async function fetchVendorTenantId(
  supabase: SupabaseClient,
  vendorId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id, tenant_id")
    .eq("id", vendorId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return (data as VendorTenantRow).tenant_id;
}

export async function listCatalogProductRequestsForMerchant(
  supabase: SupabaseClient,
  limit = 50,
): Promise<CatalogProductRequestQueryResult> {
  const outcome = await executeSupabaseQuery<Record<string, unknown>[]>({
    functionName: "listCatalogProductRequestsForMerchant",
    userErrorMessage: "Αποτυχία φόρτωσης αιτήσεων καταλόγου.",
    emptyDataMessage: "catalog_product_requests merchant list returned null data",
    run: async () =>
      supabase
        .from("catalog_product_requests")
        .select(CATALOG_PRODUCT_REQUEST_SELECT_FLAT)
        .order("created_at", { ascending: false })
        .limit(limit),
  });

  if (!outcome.ok) {
    return toCatalogProductQueryFailure(outcome);
  }

  const rows = outcome.data.map(mapFlatRow);
  return { ...toCatalogProductQuerySuccess(rows, outcome), error: false };
}

export async function listCatalogProductRequestsForVendor(
  supabase: SupabaseClient,
  vendorId: string,
  limit = 100,
): Promise<CatalogProductRequestQueryResult> {
  const outcome = await executeSupabaseQuery<Record<string, unknown>[]>({
    functionName: "listCatalogProductRequestsForVendor",
    vendorId,
    userErrorMessage: "Αδυναμία φόρτωσης προϊόντων.",
    emptyDataMessage: "catalog_product_requests vendor list returned null data",
    run: async () =>
      supabase
        .from("catalog_product_requests")
        .select(CATALOG_PRODUCT_REQUEST_SELECT_FLAT)
        .eq("vendor_id", vendorId)
        .is("merchant_hidden_at", null)
        .order("created_at", { ascending: false })
        .limit(limit),
  });

  if (!outcome.ok) {
    return toCatalogProductQueryFailure(outcome);
  }

  const rows = outcome.data.map(mapFlatRow);
  return { ...toCatalogProductQuerySuccess(rows, outcome), error: false };
}
