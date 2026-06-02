import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";

export const MINOR_EDIT_FIELDS = ["price", "stock"] as const;
const MAJOR_EDIT_FIELDS = [
  "title",
  "brand",
  "model",
  "categoryId",
  "slugSuggestion",
  "gtin",
  "mpn",
  "description",
  "attributes",
] as const;

type MinorField = (typeof MINOR_EDIT_FIELDS)[number];
type MajorField = (typeof MAJOR_EDIT_FIELDS)[number];

export type CatalogRequestEditPayload = {
  requestId: string;
  vendorId: string;
  baselineUpdatedAt: string;
  price: number | null;
  stock: number | null;
  title: string;
  brand: string | null;
  model: string | null;
  categoryId: string | null;
  slugSuggestion: string;
  gtin: string | null;
  mpn: string | null;
  description: string | null;
  attributes: Record<string, unknown>;
  confirmMajor?: boolean;
};

export type EditDiffClassification =
  | {
      kind: "none";
      changedMinor: MinorField[];
      changedMajor: MajorField[];
      unknownFields: string[];
    }
  | {
      kind: "minor";
      changedMinor: MinorField[];
      changedMajor: MajorField[];
      unknownFields: string[];
    }
  | {
      kind: "major";
      changedMinor: MinorField[];
      changedMajor: MajorField[];
      unknownFields: string[];
    };

function normalizeString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function normalizeMoney(value: number | null | undefined): number | null {
  const n = normalizeNumber(value);
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}

const DISPLAY_NULL_SENTINEL = "—";

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortDeep(item));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const v = obj[key];
      if (v !== undefined) out[key] = sortDeep(v);
    }
    return out;
  }
  return value;
}

function canonicalizeAttributeScalar(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length || trimmed === DISPLAY_NULL_SENTINEL) return null;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n;
    }
    return trimmed;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value;
  return value;
}

function canonicalizeAttributeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeAttributeValue(item));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const v = obj[key];
      if (v === undefined) continue;
      const canon = canonicalizeAttributeValue(v);
      if (canon !== null) out[key] = canon;
    }
    return out;
  }
  return canonicalizeAttributeScalar(value);
}

/** Canonical form for diffing — tolerates UI round-trip (—, stringified numbers). */
export function canonicalizeAttributesForComparison(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const sorted = (sortDeep(values ?? {}) as Record<string, unknown>) ?? {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sorted)) {
    const canon = canonicalizeAttributeValue(value);
    if (canon !== null) out[key] = canon;
  }
  return out;
}

function attributesEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(canonicalizeAttributesForComparison(a)) === JSON.stringify(canonicalizeAttributesForComparison(b));
}

function canonicalDescriptionFromRequest(row: CatalogProductRequestRow): string | null {
  return normalizeDescription(row.model);
}

function canonicalDescriptionFromPayload(payload: CatalogRequestEditPayload): string | null {
  return normalizeDescription(payload.description ?? payload.model);
}

function normalizeDescription(value: string | null | undefined): string | null {
  return normalizeString(value);
}

function normalizeCategoryId(value: string | null | undefined): string | null {
  return normalizeString(value);
}

function baseFromRequest(row: CatalogProductRequestRow) {
  return {
    price: normalizeMoney(row.requested_price_amount),
    stock: normalizeNumber(row.requested_stock_quantity),
    title: normalizeString(row.title) ?? "",
    brand: normalizeString(row.brand),
    model: normalizeString(row.model),
    categoryId: normalizeCategoryId(row.category_id),
    slugSuggestion: normalizeString(row.slug_suggestion) ?? "",
    gtin: normalizeString(row.gtin),
    mpn: normalizeString(row.mpn),
    description: canonicalDescriptionFromRequest(row),
    attributes: row.attribute_payload?.values ?? {},
  };
}

function normalizePayload(payload: CatalogRequestEditPayload) {
  return {
    price: normalizeMoney(payload.price),
    stock: normalizeNumber(payload.stock),
    title: normalizeString(payload.title) ?? "",
    brand: normalizeString(payload.brand),
    model: normalizeString(payload.model),
    categoryId: normalizeCategoryId(payload.categoryId),
    slugSuggestion: normalizeString(payload.slugSuggestion) ?? "",
    gtin: normalizeString(payload.gtin),
    mpn: normalizeString(payload.mpn),
    description: canonicalDescriptionFromPayload(payload),
    attributes: payload.attributes ?? {},
  };
}

const KNOWN_DIFF_FIELDS = new Set<string>([...MINOR_EDIT_FIELDS, ...MAJOR_EDIT_FIELDS]);

export function classifyCatalogRequestEditDiff(args: {
  row: CatalogProductRequestRow;
  payload: CatalogRequestEditPayload;
  unknownPayloadFields?: string[];
}): EditDiffClassification {
  const base = baseFromRequest(args.row);
  const next = normalizePayload(args.payload);

  const changedMinor: MinorField[] = [];
  if (base.price !== next.price) changedMinor.push("price");
  if (base.stock !== next.stock) changedMinor.push("stock");

  const changedMajor: MajorField[] = [];
  if (base.title !== next.title) changedMajor.push("title");
  if (base.brand !== next.brand) changedMajor.push("brand");
  if (base.model !== next.model) changedMajor.push("model");
  if (base.categoryId !== next.categoryId) changedMajor.push("categoryId");
  if (base.slugSuggestion !== next.slugSuggestion) changedMajor.push("slugSuggestion");
  if (base.gtin !== next.gtin) changedMajor.push("gtin");
  if (base.mpn !== next.mpn) changedMajor.push("mpn");
  if (base.description !== next.description) changedMajor.push("description");
  if (!attributesEqual(base.attributes, next.attributes)) changedMajor.push("attributes");

  const unknownFields = (args.unknownPayloadFields ?? []).filter((k) => !KNOWN_DIFF_FIELDS.has(k));
  const hasChanges = changedMinor.length > 0 || changedMajor.length > 0 || unknownFields.length > 0;

  if (!hasChanges) {
    return { kind: "none", changedMinor, changedMajor, unknownFields };
  }
  if (changedMajor.length > 0 || unknownFields.length > 0) {
    return { kind: "major", changedMinor, changedMajor, unknownFields };
  }
  return { kind: "minor", changedMinor, changedMajor, unknownFields };
}
