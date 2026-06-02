import type { MarketOfferListFilters } from "../types/market-offer.dto";

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) {
    return v[0] ?? "";
  }
  return typeof v === "string" ? v : "";
}

function parsePositiveNumber(raw: string): number | undefined {
  if (!raw.trim()) {
    return undefined;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}

function parseCondition(raw: string): "new" | "used" | "refurbished" | undefined {
  if (raw === "new" || raw === "used" || raw === "refurbished") {
    return raw;
  }
  return undefined;
}

export type ParsedMarketBrowse = {
  q: string;
  page: number;
  filters: MarketOfferListFilters;
  /** Raw strings for re-filling forms and pagination links */
  raw: {
    minPrice: string;
    maxPrice: string;
    condition: string;
  };
};

export function parseMarketBrowseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ParsedMarketBrowse {
  const q = first(searchParams.q);
  const minPriceStr = first(searchParams.minPrice);
  const maxPriceStr = first(searchParams.maxPrice);
  const conditionStr = first(searchParams.condition);
  const pageRaw = first(searchParams.page);
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);

  const priceMin = parsePositiveNumber(minPriceStr);
  const priceMax = parsePositiveNumber(maxPriceStr);
  const condition = parseCondition(conditionStr);

  const filters: MarketOfferListFilters = {
    page,
    limit: 24,
    state: "active",
  };
  if (priceMin !== undefined) {
    filters.priceMin = priceMin;
  }
  if (priceMax !== undefined) {
    filters.priceMax = priceMax;
  }
  if (condition) {
    filters.condition = condition;
  }

  return {
    q,
    page,
    filters,
    raw: {
      minPrice: minPriceStr,
      maxPrice: maxPriceStr,
      condition: conditionStr,
    },
  };
}

export function toPaginationQuery(parsed: ParsedMarketBrowse): Record<string, string> {
  const out: Record<string, string> = {};
  if (parsed.q.trim()) {
    out.q = parsed.q.trim();
  }
  if (parsed.raw.minPrice.trim()) {
    out.minPrice = parsed.raw.minPrice.trim();
  }
  if (parsed.raw.maxPrice.trim()) {
    out.maxPrice = parsed.raw.maxPrice.trim();
  }
  if (parsed.raw.condition) {
    out.condition = parsed.raw.condition;
  }
  return out;
}
