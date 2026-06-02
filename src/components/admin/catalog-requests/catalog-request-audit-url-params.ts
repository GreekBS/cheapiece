import {
  isSearchActive,
  type AuditStatusTab,
} from "@/components/admin/catalog-requests/catalog-request-audit-list-utils";
import type { CatalogProductRequestStatus } from "@/modules/catalog-requests/types/catalog-product-request";

export const MAX_AUDIT_Q_LENGTH = 200;

const VALID_STATUS = new Set<CatalogProductRequestStatus>([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

export type CatalogRequestAuditFilters = {
  tab: AuditStatusTab;
  q: string;
};

export type SerializedAuditState = {
  filters: CatalogRequestAuditFilters;
  href: string;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return typeof value === "string" ? value : "";
}

export function normalizeAuditQ(q: string): string {
  const trimmed = q.trim();
  if (!isSearchActive(trimmed)) {
    return "";
  }
  return trimmed.length > MAX_AUDIT_Q_LENGTH ? trimmed.slice(0, MAX_AUDIT_Q_LENGTH) : trimmed;
}

export function toCanonicalAuditFilters(input: {
  tab: AuditStatusTab;
  q: string;
}): CatalogRequestAuditFilters {
  const tab: AuditStatusTab =
    input.tab === "all" || VALID_STATUS.has(input.tab as CatalogProductRequestStatus)
      ? input.tab
      : "all";
  return { tab, q: normalizeAuditQ(input.q) };
}

export function buildCatalogRequestAuditSearchParams(
  filters: CatalogRequestAuditFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== "all") {
    params.set("status", filters.tab);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  return params;
}

export function buildCatalogRequestAuditHref(
  pathname: string,
  input: { tab: AuditStatusTab; q: string },
): string {
  const filters = toCanonicalAuditFilters(input);
  const qs = buildCatalogRequestAuditSearchParams(filters).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function serializeAuditState(
  pathname: string,
  input: { tab: AuditStatusTab; q: string },
): SerializedAuditState {
  const filters = toCanonicalAuditFilters(input);
  const href = buildCatalogRequestAuditHref(pathname, filters);
  return { filters, href };
}

export function parseCatalogRequestAuditUrlParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): CatalogRequestAuditFilters {
  const statusRaw =
    input instanceof URLSearchParams ? (input.get("status") ?? "") : firstParam(input.status);
  const qRaw = input instanceof URLSearchParams ? (input.get("q") ?? "") : firstParam(input.q);

  const tab: AuditStatusTab =
    statusRaw && VALID_STATUS.has(statusRaw as CatalogProductRequestStatus)
      ? (statusRaw as CatalogProductRequestStatus)
      : "all";

  return toCanonicalAuditFilters({ tab, q: qRaw });
}

export function canonicalAuditHrefFromSearchParams(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const filters = parseCatalogRequestAuditUrlParams(searchParams);
  return buildCatalogRequestAuditHref(pathname, filters);
}

export function auditFiltersEqual(
  a: CatalogRequestAuditFilters,
  b: CatalogRequestAuditFilters,
): boolean {
  return a.tab === b.tab && a.q === b.q;
}
