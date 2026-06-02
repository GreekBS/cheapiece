import type {
  CatalogValidationMode,
  StoredCatalogProductRequestAttributePayload,
} from "../types/phase2-schema-baseline";

/** Public error types only — assert helpers are internal to evaluate-catalog-request-state. */

export class InvalidCatalogRequestError extends Error {
  readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super("INVALID_CATALOG_REQUEST");
    this.name = "InvalidCatalogRequestError";
    this.errors = errors;
  }
}

export const LEGACY_SCHEMA_MIGRATION_REQUIRED = "LEGACY_SCHEMA_MIGRATION_REQUIRED" as const;

export class LegacySchemaMigrationRequiredError extends InvalidCatalogRequestError {
  readonly code = LEGACY_SCHEMA_MIGRATION_REQUIRED;

  constructor(detail?: string) {
    super({
      values: [
        detail ??
          "Dot-notation attribute payloads require STRICT schema pinning. Re-submit with schema_version_id.",
      ],
    });
    this.name = "LegacySchemaMigrationRequiredError";
  }
}

export class CatalogValidationModeDowngradeError extends Error {
  constructor(from: CatalogValidationMode, to: CatalogValidationMode) {
    super(`Invalid validation mode downgrade: ${from} → ${to}`);
    this.name = "CatalogValidationModeDowngradeError";
  }
}

export class CatalogSchemaMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogSchemaMutationError";
  }
}

const ALLOWED_MODE_TRANSITIONS: Record<
  CatalogValidationMode,
  ReadonlySet<CatalogValidationMode>
> = {
  STRICT: new Set(["STRICT"]),
  LEGACY_SAFE: new Set(["LEGACY_SAFE", "STRICT"]),
  NO_SCHEMA_MINIMAL: new Set(["NO_SCHEMA_MINIMAL", "STRICT"]),
};

export function inferValidationModeFromRow(row: {
  schema_version_id: string | null;
  attribute_payload?: StoredCatalogProductRequestAttributePayload | null;
}): CatalogValidationMode {
  const mode = row.attribute_payload?.meta?.validationMode;
  if (mode) return mode;
  return row.schema_version_id ? "STRICT" : "LEGACY_SAFE";
}

/** @internal */
export function internalAssertValidationModeTransition(
  from: CatalogValidationMode,
  to: CatalogValidationMode,
): void {
  if (!ALLOWED_MODE_TRANSITIONS[from].has(to)) {
    throw new CatalogValidationModeDowngradeError(from, to);
  }
}

/** @internal */
export function internalAssertCatalogRequestSchemaGovernance(args: {
  previous: {
    schema_version_id: string | null;
    attribute_payload: StoredCatalogProductRequestAttributePayload | null;
  };
  next: {
    schema_version_id?: string | null;
    attribute_payload?: StoredCatalogProductRequestAttributePayload | null;
  };
}): void {
  const prevMode = inferValidationModeFromRow({
    schema_version_id: args.previous.schema_version_id,
    attribute_payload: args.previous.attribute_payload,
  });

  const prevPin = args.previous.schema_version_id;
  const nextPin =
    args.next.schema_version_id !== undefined
      ? args.next.schema_version_id
      : args.next.attribute_payload?.meta?.schemaVersionId ?? prevPin;

  if (!prevPin && nextPin) {
    throw new CatalogSchemaMutationError(
      "schema_version_id cannot be set on an existing request without full STRICT re-validation",
    );
  }

  if (prevPin && nextPin && prevPin !== nextPin) {
    throw new CatalogSchemaMutationError(
      "schema_version_id is immutable after insert; submit a new request to change schema pin",
    );
  }

  if (prevPin && nextPin === null) {
    throw new CatalogSchemaMutationError(
      "schema_version_id cannot be cleared after STRICT pinning (downgrade forbidden)",
    );
  }

  const nextMode = args.next.attribute_payload?.meta?.validationMode;
  if (nextMode && nextMode !== prevMode) {
    internalAssertValidationModeTransition(prevMode, nextMode);
  }
}

/** @internal Option B — LEGACY_SAFE rejects schema-shaped keys. */
export function internalAssertLegacySafePayloadValues(values: Record<string, unknown>): void {
  for (const key of Object.keys(values)) {
    if (key.includes(".")) {
      throw new LegacySchemaMigrationRequiredError(
        `LEGACY_SCHEMA_MIGRATION_REQUIRED: key "${key}" uses dot notation.`,
      );
    }
    if (/^(core|mobile|apparel|catalog)\.[a-z0-9_]+$/i.test(key)) {
      throw new LegacySchemaMigrationRequiredError(
        `LEGACY_SCHEMA_MIGRATION_REQUIRED: key "${key}" resembles a schema attribute code.`,
      );
    }
  }
}
