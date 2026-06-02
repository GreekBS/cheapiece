import type { CatalogValidationMode } from "@/modules/catalog-requests/types/phase2-schema-baseline";

export type ProductDisplayScalars = {
  title: string;
  brand: string | null;
  model: string | null;
  gtin: string | null;
  mpn: string | null;
};

export type ProductDisplayField = {
  code: string;
  label: string;
  primitive: string;
  formattedValue: string;
  rawValue: unknown;
};

export type ProductDisplayGroup = {
  code: string;
  label: string;
  sortOrder: number;
  fields: ProductDisplayField[];
};

/**
 * Frozen UI snapshot — built at publish, never from live schema resolution on read.
 */
export type ProductDisplaySnapshot = {
  locale: string;
  validationMode: CatalogValidationMode;
  scalars: ProductDisplayScalars;
  groups: ProductDisplayGroup[];
};
