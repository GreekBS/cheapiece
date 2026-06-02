const COLOR_ALIASES: Record<string, string> = {
  "midnight black": "black",
  "jet black": "black",
  "matte black": "black",
  "space black": "black",
  "space gray": "gray",
  "space grey": "gray",
  "graphite": "gray",
  "starlight": "gold",
  "product red": "red",
};

const VARIANT_ATTRIBUTE_KEYS = new Set([
  "color",
  "colour",
  "storage",
  "capacity",
  "ram",
  "memory",
  "size",
  "bundle",
  "bundle_type",
  "variant",
  "variant_name",
  "screen_size",
  "weight",
]);

function normalizeString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeColor(value: string): string {
  return COLOR_ALIASES[value] ?? value;
}

function normalizeStorageUnit(value: string): string {
  return value
    .replace(/\s+/g, "")
    .replace(/(\d)(gb|tb|mb|kg|g|ml|l)\b/gi, "$1$2")
    .toLowerCase();
}

function isVariantAttributeKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (VARIANT_ATTRIBUTE_KEYS.has(lower)) return true;
  return (
    lower.includes("color") ||
    lower.includes("storage") ||
    lower.includes("capacity") ||
    lower.includes("bundle") ||
    lower.includes("edition") ||
    lower.includes("language") ||
    lower.includes("lang") ||
    lower.endsWith("_ram") ||
    lower.endsWith("_size")
  );
}

function normalizeAttributeValue(key: string, value: unknown): string | null {
  const asString = normalizeString(value);
  if (!asString) return null;

  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("color") || lowerKey === "colour") {
    return normalizeColor(asString);
  }

  if (
    lowerKey.includes("storage") ||
    lowerKey.includes("capacity") ||
    lowerKey.includes("ram") ||
    lowerKey.includes("memory") ||
    lowerKey.includes("weight") ||
    lowerKey.includes("size")
  ) {
    return normalizeStorageUnit(asString);
  }

  return asString;
}

/**
 * Normalizes variant-defining attribute values for stable fingerprinting.
 * Never throws; returns empty object when input is missing or invalid.
 */
export function normalizeVariantAttributes(
  values: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return {};
  }

  const normalized: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(values)) {
    if (!isVariantAttributeKey(rawKey)) continue;
    const normalizedValue = normalizeAttributeValue(rawKey, rawValue);
    if (!normalizedValue) continue;
    normalized[rawKey.toLowerCase()] = normalizedValue;
  }

  const sorted: Record<string, string> = {};
  for (const key of Object.keys(normalized).sort()) {
    sorted[key] = normalized[key]!;
  }

  return sorted;
}

export function normalizeBrandModel(value: string | null | undefined): string | null {
  return normalizeString(value);
}

export function normalizeGtinMpn(value: string | null | undefined): string | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized.replace(/[\s-]/g, "");
}
