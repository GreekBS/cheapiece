import type { FacetFilter } from "@/modules/catalog-products-read/listing/types/category-product-list.dto";

export type CategoryLeafSortKey = "newest" | "title_asc";

export type CategoryBrowseParsed = {
  brand: string | null;
  sort: CategoryLeafSortKey;
  page: number;
  pageSize: number;
  facetFilters: FacetFilter[];
};

export const CATEGORY_LEAF_PAGE_SIZE = 24;

const FACET_PARAM_PATTERN = /^f\[(.+)\]$/;

/** First string value for a search param key. */
function first(raw: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = raw[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseFacetValue(raw: string): string | number | boolean | string[] {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const num = Number(trimmed);
  if (trimmed.length > 0 && Number.isFinite(num) && String(num) === trimmed) {
    return num;
  }
  return trimmed;
}

export function parseCategoryFacetFilters(
  raw: Record<string, string | string[] | undefined>,
): FacetFilter[] {
  const filters: FacetFilter[] = [];

  for (const key of Object.keys(raw)) {
    const match = key.match(FACET_PARAM_PATTERN);
    if (!match) continue;
    const code = match[1]?.trim();
    if (!code) continue;
    const valueRaw = first(raw, key);
    if (valueRaw == null || valueRaw.trim() === "") continue;
    filters.push({ code, value: parseFacetValue(valueRaw) });
  }

  return filters.sort((a, b) => a.code.localeCompare(b.code));
}

export function parseCategoryBrowseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): CategoryBrowseParsed {
  let brand = first(raw, "brand")?.trim() || null;
  if (brand && brand.length > 200) brand = brand.slice(0, 200);

  const sortRaw = first(raw, "sort");
  const sort: CategoryLeafSortKey = sortRaw === "title_asc" ? "title_asc" : "newest";

  const pageRaw = first(raw, "page");
  let page = parseInt(pageRaw ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > 10_000) page = 10_000;

  return {
    brand,
    sort,
    page,
    pageSize: CATEGORY_LEAF_PAGE_SIZE,
    facetFilters: parseCategoryFacetFilters(raw),
  };
}

/** True when listing params differ from default first page / newest-only. */
export function categoryBrowseHasSeoFilteredQuery(parsed: CategoryBrowseParsed): boolean {
  return (
    parsed.brand != null ||
    parsed.sort !== "newest" ||
    parsed.page > 1 ||
    parsed.facetFilters.length > 0
  );
}

function appendFacetParams(params: URLSearchParams, facetFilters: FacetFilter[]): void {
  for (const f of facetFilters) {
    const v = f.value;
    if (Array.isArray(v)) {
      params.set(`f[${f.code}]`, v.join(","));
    } else {
      params.set(`f[${f.code}]`, String(v));
    }
  }
}

export function buildCategoryLeafHref(
  slug: string,
  next: Partial<Pick<CategoryBrowseParsed, "brand" | "sort" | "page" | "facetFilters">>,
  current: CategoryBrowseParsed,
): string {
  const brand = next.brand !== undefined ? next.brand : current.brand;
  const sort = next.sort !== undefined ? next.sort : current.sort;
  const page = next.page !== undefined ? next.page : current.page;
  const facetFilters = next.facetFilters !== undefined ? next.facetFilters : current.facetFilters;

  const params = new URLSearchParams();
  if (brand) params.set("brand", brand);
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  appendFacetParams(params, facetFilters);
  const qs = params.toString();
  return qs ? `/category/${slug}?${qs}` : `/category/${slug}`;
}
