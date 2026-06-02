import type { AttributeDefinition } from "../types/attribute-definition";
import type { AttributePrimitive } from "../types/primitives";
import { normalizeGtin, normalizeMpn } from "../normalization/identifiers";
import { normalizeUnit } from "../normalization/units";
import {
  type ColorValue,
  type DimensionValue,
  type MeasurementValue,
  type MediaGalleryValue,
  isPlainObject,
} from "./value-shapes";

export type CoercionResult =
  | { ok: true; value: unknown; empty: boolean }
  | { ok: false; message: string };

function isEmptyRaw(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === "string") return raw.trim() === "";
  if (Array.isArray(raw)) return raw.length === 0;
  return false;
}

function coerceString(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: "", empty: true };
  if (typeof raw !== "string" && typeof raw !== "number") {
    return { ok: false, message: "Expected text value." };
  }
  return { ok: true, value: String(raw).trim(), empty: false };
}

function coerceInteger(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: null, empty: true };
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, message: "Expected whole number." };
  }
  return { ok: true, value: n, empty: false };
}

function coerceDecimal(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: null, empty: true };
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return { ok: false, message: "Expected numeric value." };
  return { ok: true, value: n, empty: false };
}

function coerceBoolean(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: null, empty: true };
  if (typeof raw === "boolean") return { ok: true, value: raw, empty: false };
  if (raw === "true" || raw === "1") return { ok: true, value: true, empty: false };
  if (raw === "false" || raw === "0") return { ok: true, value: false, empty: false };
  return { ok: false, message: "Expected boolean." };
}

function coerceEnumSingle(raw: unknown, def: AttributeDefinition): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: null, empty: true };
  const code = String(raw).trim();
  const allowed = getActiveEnumCodes(def);
  if (!allowed.has(code)) return { ok: false, message: `Unknown enum code: ${code}` };
  return { ok: true, value: code, empty: false };
}

function coerceEnumMulti(raw: unknown, def: AttributeDefinition): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: [], empty: true };
  const arr = Array.isArray(raw) ? raw : [raw];
  const allowed = getActiveEnumCodes(def);
  const codes: string[] = [];
  for (const item of arr) {
    const code = String(item).trim();
    if (!allowed.has(code)) return { ok: false, message: `Unknown enum code: ${code}` };
    if (!codes.includes(code)) codes.push(code);
  }
  return { ok: true, value: codes, empty: codes.length === 0 };
}

function getActiveEnumCodes(def: AttributeDefinition): Set<string> {
  return new Set(
    (def.enumOptions ?? [])
      .filter((o) => o.state !== "archived")
      .map((o) => o.code),
  );
}

function coerceMeasurement(raw: unknown, def: AttributeDefinition): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: null, empty: true };
  if (!isPlainObject(raw)) return { ok: false, message: "Expected measurement object." };
  const value = Number(raw.value);
  if (!Number.isFinite(value)) return { ok: false, message: "Invalid measurement value." };
  const unit = normalizeUnit(String(raw.unit ?? def.defaultUnit ?? ""));
  if (!unit) return { ok: false, message: "Measurement unit required." };
  if (def.allowedUnits?.length && !def.allowedUnits.includes(unit)) {
    return { ok: false, message: `Unit not allowed: ${unit}` };
  }
  const out: MeasurementValue = { value, unit };
  return { ok: true, value: out, empty: false };
}

function coerceWeight(raw: unknown, def: AttributeDefinition): CoercionResult {
  return coerceMeasurement(raw, def);
}

function coerceDimension(raw: unknown, def: AttributeDefinition): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: null, empty: true };
  if (!isPlainObject(raw)) return { ok: false, message: "Expected dimension object." };
  const length = Number(raw.length);
  const width = Number(raw.width);
  const height = Number(raw.height);
  if (![length, width, height].every(Number.isFinite)) {
    return { ok: false, message: "Invalid dimension values." };
  }
  const unit = normalizeUnit(String(raw.unit ?? def.defaultUnit ?? "cm"));
  if (def.allowedUnits?.length && !def.allowedUnits.includes(unit)) {
    return { ok: false, message: `Unit not allowed: ${unit}` };
  }
  const out: DimensionValue = { length, width, height, unit };
  return { ok: true, value: out, empty: false };
}

function coerceColor(raw: unknown, def: AttributeDefinition): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: null, empty: true };
  if (typeof raw === "string") {
    const code = raw.trim();
    const allowed = getActiveEnumCodes(def);
    if (allowed.size > 0 && !allowed.has(code)) {
      return { ok: false, message: `Unknown color code: ${code}` };
    }
    return { ok: true, value: { code } satisfies ColorValue, empty: false };
  }
  if (isPlainObject(raw) && typeof raw.code === "string") {
    return coerceColor(raw.code, def);
  }
  return { ok: false, message: "Expected color code." };
}

function coerceIdentifierGtin(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: "", empty: true };
  const normalized = normalizeGtin(String(raw));
  if (normalized.length < 8 || normalized.length > 14) {
    return { ok: false, message: "GTIN length must be 8–14 digits." };
  }
  return { ok: true, value: normalized, empty: false };
}

function coerceIdentifierMpn(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: "", empty: true };
  const normalized = normalizeMpn(String(raw));
  if (!normalized) return { ok: false, message: "MPN required." };
  return { ok: true, value: normalized, empty: false };
}

function coerceMediaGallery(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: { items: [] } satisfies MediaGalleryValue, empty: true };
  let items: unknown[] = [];
  if (Array.isArray(raw)) items = raw;
  else if (isPlainObject(raw) && Array.isArray(raw.items)) items = raw.items;
  else return { ok: false, message: "Expected media gallery items." };

  const parsed: MediaGalleryValue["items"] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isPlainObject(item) || typeof item.url !== "string" || !item.url.trim()) {
      return { ok: false, message: "Invalid media item." };
    }
    parsed.push({
      url: item.url.trim(),
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : i,
      alt: typeof item.alt === "string" ? item.alt : undefined,
    });
  }
  return { ok: true, value: { items: parsed }, empty: parsed.length === 0 };
}

function coerceDate(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: "", empty: true };
  const s = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, message: "Date must be YYYY-MM-DD." };
  }
  return { ok: true, value: s, empty: false };
}

function coerceUrl(raw: unknown): CoercionResult {
  if (isEmptyRaw(raw)) return { ok: true, value: "", empty: true };
  const s = String(raw).trim();
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, message: "URL must be http or https." };
    }
  } catch {
    return { ok: false, message: "Invalid URL." };
  }
  return { ok: true, value: s, empty: false };
}

/** Deterministic coercion from raw input to stored value shape. */
export function coerceFieldValue(
  primitive: AttributePrimitive,
  definition: AttributeDefinition,
  raw: unknown,
): CoercionResult {
  switch (primitive) {
    case "text":
    case "rich_text":
      return coerceString(raw);
    case "integer":
      return coerceInteger(raw);
    case "decimal":
      return coerceDecimal(raw);
    case "boolean":
      return coerceBoolean(raw);
    case "enum_single":
      return coerceEnumSingle(raw, definition);
    case "enum_multi":
      return coerceEnumMulti(raw, definition);
    case "measurement":
      return coerceMeasurement(raw, definition);
    case "weight":
      return coerceWeight(raw, definition);
    case "dimension":
      return coerceDimension(raw, definition);
    case "color":
      return coerceColor(raw, definition);
    case "identifier_gtin":
      return coerceIdentifierGtin(raw);
    case "identifier_mpn":
      return coerceIdentifierMpn(raw);
    case "media_gallery":
      return coerceMediaGallery(raw);
    case "url":
      return coerceUrl(raw);
    case "date":
      return coerceDate(raw);
    default:
      return { ok: false, message: "Unsupported primitive." };
  }
}
