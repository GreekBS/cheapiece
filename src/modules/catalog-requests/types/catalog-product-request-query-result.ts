import type { CatalogProductRequestListRow, CatalogProductRequestRow } from "./catalog-product-request";

export type CatalogProductRequestQueryMeta = {
  source: "supabase";
  function: string;
  vendorId?: string;
  id?: string;
};

type CatalogProductRequestQueryResultBase<TRow> = {
  data: TRow[];
  error: boolean;
  errorMessage?: string;
  meta: CatalogProductRequestQueryMeta;
};

/** Flat rows (merchant / vendor-scoped lists). */
export type CatalogProductRequestQueryResult = CatalogProductRequestQueryResultBase<CatalogProductRequestRow>;

/** Admin / list rows with vendor_name enrichment. */
export type CatalogProductRequestListQueryResult =
  CatalogProductRequestQueryResultBase<CatalogProductRequestListRow>;

/** Single-row fetch (detail, approve/reject services). */
export type CatalogProductRequestSingleQueryResult = {
  data: CatalogProductRequestListRow | null;
  error: boolean;
  errorMessage?: string;
  meta: CatalogProductRequestQueryMeta;
};
