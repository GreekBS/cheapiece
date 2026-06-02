import type {
  CatalogValidationMode,
  StoredCatalogProductRequestAttributePayload,
} from "../types/phase2-schema-baseline";

/**
 * LOCKED payload invariant for catalog_product_requests.attribute_payload:
 * { values: Record<string, unknown>, meta: { schemaVersionId, validatedAt, validationMode } }
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Rejects empty string; normalizes undefined/null to null. Validates UUID when set. */
export function assertValidSchemaVersionId(schemaVersionId: string | null | undefined): string | null {
  if (schemaVersionId === undefined || schemaVersionId === null) {
    return null;
  }
  if (schemaVersionId === "") {
    throw new Error("Invalid schemaVersionId: empty string not allowed");
  }
  if (!UUID_PATTERN.test(schemaVersionId)) {
    throw new Error("Invalid schemaVersionId: must be a valid UUID");
  }
  return schemaVersionId;
}

export function isValidSchemaVersionUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Coerces input values to a plain object; rejects invalid shapes. */
export function coercePayloadValues(
  raw: unknown,
): { ok: true; values: Record<string, unknown> } | { ok: false; errors: Record<string, string[]> } {
  if (raw === undefined || raw === null) {
    return { ok: true, values: {} };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: { values: ["Values must be a plain object."] } };
  }
  return { ok: true, values: { ...(raw as Record<string, unknown>) } };
}

export function buildStoredPayload(args: {
  values: Record<string, unknown>;
  schemaVersionId: string | null;
  validatedAt: string;
  validationMode: StoredCatalogProductRequestAttributePayload["meta"]["validationMode"];
}): StoredCatalogProductRequestAttributePayload {
  const payload: StoredCatalogProductRequestAttributePayload = {
    values: args.values,
    meta: {
      schemaVersionId: args.schemaVersionId,
      validatedAt: args.validatedAt,
      validationMode: args.validationMode,
    },
  };
  assertStoredPayloadInvariant(payload);
  return payload;
}

/** Final gate before DB insert — enforces canonical stored shape. */
export function assertStoredPayloadInvariant(payload: StoredCatalogProductRequestAttributePayload): void {
  if (!payload.meta) {
    throw new Error("attribute_payload.meta is required");
  }
  if (payload.values === undefined || typeof payload.values !== "object" || Array.isArray(payload.values)) {
    throw new Error("attribute_payload.values must be a plain object");
  }
  const { schemaVersionId, validatedAt, validationMode } = payload.meta;
  if (schemaVersionId === "") {
    throw new Error("attribute_payload.meta.schemaVersionId cannot be empty string");
  }
  if (schemaVersionId !== null && !isValidSchemaVersionUuid(schemaVersionId)) {
    throw new Error("attribute_payload.meta.schemaVersionId must be null or a valid UUID");
  }
  if (!validatedAt) {
    throw new Error("attribute_payload.meta.validatedAt is required");
  }
  const allowedModes: CatalogValidationMode[] = ["STRICT", "LEGACY_SAFE", "NO_SCHEMA_MINIMAL"];
  if (!validationMode || !allowedModes.includes(validationMode)) {
    throw new Error("attribute_payload.meta.validationMode is invalid");
  }
  if (validationMode === "STRICT" && schemaVersionId === null) {
    throw new Error("STRICT mode requires meta.schemaVersionId UUID");
  }
  if (validationMode !== "STRICT" && schemaVersionId !== null) {
    throw new Error("Non-STRICT mode requires meta.schemaVersionId null");
  }
}
