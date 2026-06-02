import type {
  CatalogProductRequestListRow,
  CatalogProductRequestStatus,
} from "@/modules/catalog-requests/types/catalog-product-request";

export type AuditStatusTab = "all" | CatalogProductRequestStatus;

const STATUS_RANK: Record<CatalogProductRequestStatus, number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
  withdrawn: 3,
};

function createdAtMs(row: CatalogProductRequestListRow): number {
  const ms = new Date(row.created_at ?? "").getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function compareByCreatedAtDesc(
  a: CatalogProductRequestListRow,
  b: CatalogProductRequestListRow,
): number {
  const diff = createdAtMs(b) - createdAtMs(a);
  if (diff !== 0) return diff;
  return a.id.localeCompare(b.id);
}

export function sortAuditRows(
  rows: CatalogProductRequestListRow[],
  tab: AuditStatusTab,
): CatalogProductRequestListRow[] {
  const copy = [...rows];
  if (tab === "all") {
    copy.sort((a, b) => {
      const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (rankDiff !== 0) return rankDiff;
      return compareByCreatedAtDesc(a, b);
    });
    return copy;
  }
  copy.sort(compareByCreatedAtDesc);
  return copy;
}

export function filterByTab(
  rows: CatalogProductRequestListRow[],
  tab: AuditStatusTab,
): CatalogProductRequestListRow[] {
  if (tab === "all") return rows;
  return rows.filter((r) => r.status === tab);
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("el-GR");
}

export function isSearchActive(query: string): boolean {
  return normalizeSearch(query).length > 0;
}

export function filterBySearch(
  rows: CatalogProductRequestListRow[],
  query: string,
): CatalogProductRequestListRow[] {
  const q = normalizeSearch(query);
  if (!q) return rows;
  return rows.filter((r) => {
    const vendor = (r.vendor_name ?? r.vendor_id ?? "").toLocaleLowerCase("el-GR");
    const title = (r.title ?? "").toLocaleLowerCase("el-GR");
    const slug = (r.slug_suggestion ?? "").toLocaleLowerCase("el-GR");
    return vendor.includes(q) || title.includes(q) || slug.includes(q);
  });
}

export function buildDisplayRows(
  rows: CatalogProductRequestListRow[],
  tab: AuditStatusTab,
  searchQuery: string,
): CatalogProductRequestListRow[] {
  const sorted = sortAuditRows(rows, tab);
  const tabFiltered = filterByTab(sorted, tab);
  return filterBySearch(tabFiltered, searchQuery);
}
