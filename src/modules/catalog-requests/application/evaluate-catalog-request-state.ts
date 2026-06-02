/**
 * Deterministic catalog request state machine evaluator (PURE).
 *
 * Determinism invariant:
 *   Same request + same immutable snapshot context → identical output.
 *
 * GUARANTEE: A CatalogProductRequest is valid iff evaluateCatalogRequestState(...).isValid === true.
 * No other source of truth exists.
 *
 * Evaluator receives ONLY immutable snapshot context (see buildCatalogRequestEvaluationContext).
 * schemaVersionId determines validation path via deriveMode (computed once per evaluation).
 *
 * PUBLIC API: evaluateCatalogRequestState only. All helpers are internal.
 */

import {
  normalizePayload,
  validatePayload,
  type CatalogPayload,
} from "@/modules/catalog-schema";

import type {
  CatalogRequestEvaluationContext,
  CatalogRequestEvaluationInput,
  CatalogRequestEvaluationResult,
} from "../types/catalog-request-evaluation";
import type { CatalogValidationMode } from "../types/phase2-schema-baseline";

import {
  CatalogSchemaMutationError,
  internalAssertCatalogRequestSchemaGovernance,
  internalAssertLegacySafePayloadValues,
  InvalidCatalogRequestError,
  LegacySchemaMigrationRequiredError,
} from "./catalog-validation-state";
import {
  assertStoredPayloadInvariant,
  assertValidSchemaVersionId,
  buildStoredPayload,
  coercePayloadValues,
} from "./payload-invariants";
import type { PinnedPublishedSchema } from "./pinned-published-schema";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Sole public export from this module. */
export function evaluateCatalogRequestState(
  request: CatalogRequestEvaluationInput,
  context: CatalogRequestEvaluationContext,
): CatalogRequestEvaluationResult {
  if (request.previous) {
    const mutationError = internalEvaluateMutationGovernance(request);
    if (mutationError) {
      return { isValid: false, errors: mutationError };
    }
  }

  let schemaVersionId: string | null;
  try {
    schemaVersionId = assertValidSchemaVersionId(request.schemaVersionId);
    if (request.attributePayload?.schemaVersionId !== undefined) {
      assertValidSchemaVersionId(request.attributePayload.schemaVersionId);
    }
  } catch (e) {
    return internalInvalidFromThrown(e);
  }

  const pathErrors = internalAssertDeterministicValidationPath(schemaVersionId, request);
  if (Object.keys(pathErrors).length > 0) {
    return { isValid: false, errors: pathErrors };
  }

  const valuesResult = coercePayloadValues(request.attributePayload?.values);
  if (!valuesResult.ok) {
    return { isValid: false, errors: valuesResult.errors };
  }

  // resolvedMode is immutable by contract (not by runtime freeze)
  const resolvedMode = deriveMode({ schemaVersionId, categoryId: request.categoryId });

  const validatedAt = context.now;
  const values = { ...valuesResult.values };

  const contextErrors = internalValidateSubmissionContext(request);
  if (Object.keys(contextErrors).length > 0) {
    return { isValid: false, errors: contextErrors };
  }

  const scalarErrors = internalValidateRequiredScalars(request.submissionScalars);
  if (Object.keys(scalarErrors).length > 0) {
    return { isValid: false, errors: scalarErrors };
  }

  const result = internalEvaluateByFrozenMode({
    resolvedMode,
    request,
    schemaVersionId,
    values,
    validatedAt,
    context,
  });

  if (!result.isValid) {
    return result;
  }

  try {
    assertStoredPayloadInvariant(result.normalizedPayload);
  } catch (e) {
    return internalInvalidFromThrown(e);
  }

  return result;
}

/** Explicit mode derivation — computed once upstream of mode branches. */
function deriveMode(args: {
  schemaVersionId: string | null;
  categoryId: string | null;
}): CatalogValidationMode {
  if (args.schemaVersionId !== null) {
    return "STRICT";
  }
  if (args.categoryId !== null) {
    return "LEGACY_SAFE";
  }
  return "NO_SCHEMA_MINIMAL";
}

type FrozenModeEvaluationArgs = Readonly<{
  resolvedMode: CatalogValidationMode;
  request: CatalogRequestEvaluationInput;
  schemaVersionId: string | null;
  values: Readonly<Record<string, unknown>>;
  validatedAt: string;
  context: CatalogRequestEvaluationContext;
}>;

function internalEvaluateByFrozenMode(
  args: FrozenModeEvaluationArgs,
): CatalogRequestEvaluationResult {
  switch (args.resolvedMode) {
    case "STRICT":
      return internalEvaluateStrict(args);
    case "LEGACY_SAFE":
      return internalEvaluateLegacySafe(args);
    case "NO_SCHEMA_MINIMAL":
      return internalEvaluateNoSchemaMinimal(args);
    default:
      return { isValid: false, errors: { _error: [`Unknown validation mode: ${args.resolvedMode}`] } };
  }
}

function internalEvaluateStrict(args: FrozenModeEvaluationArgs): CatalogRequestEvaluationResult {
  // STRICT pinnedSchema: immutable DTO, value-only graph, never mutated or extended after creation
  const pinned = args.context.pinnedSchema;
  if (!pinned) {
    return {
      isValid: false,
      errors: {
        schema_version_id: ["STRICT mode requires context.pinnedSchema (resolve via orchestration layer)."],
      },
    };
  }

  if (args.schemaVersionId === null) {
    return { isValid: false, errors: { schema_version_id: ["STRICT mode requires schemaVersionId."] } };
  }

  if (!args.request.categoryId) {
    return { isValid: false, errors: { category_id: ["STRICT mode requires category_id."] } };
  }

  const pinErrors = internalValidatePinnedSchemaAgainstRequest(pinned, {
    schemaVersionId: args.schemaVersionId,
    tenantId: args.request.tenantId,
    categoryId: args.request.categoryId,
  });
  if (pinErrors) {
    return { isValid: false, errors: pinErrors };
  }

  const locale = args.context.locale ?? pinned.locale;

  const catalogPayload: CatalogPayload = {
    schemaVersionId: pinned.schemaVersionId,
    categoryId: pinned.categoryId,
    values: { ...args.values },
    meta: args.request.attributePayload?.meta,
  };

  const validation = validatePayload(pinned.effective, catalogPayload, {
    role: "merchant",
    locale,
  });

  if (!validation.ok) {
    return { isValid: false, errors: internalGroupFieldErrors(validation.fieldErrors) };
  }

  const normalized = normalizePayload(
    pinned.effective,
    validation.sanitizedValues,
    pinned.denormalize,
  );

  return {
    isValid: true,
    resolvedMode: args.resolvedMode,
    validationMode: args.resolvedMode,
    schemaVersionId: pinned.schemaVersionId,
    descriptor: pinned.descriptor,
    pinnedSchema: pinned,
    normalizedPayload: buildStoredPayload({
      values: normalized.values,
      schemaVersionId: pinned.schemaVersionId,
      validatedAt: args.validatedAt,
      validationMode: "STRICT",
    }),
  };
}

function internalValidatePinnedSchemaAgainstRequest(
  pinned: PinnedPublishedSchema,
  expected: { schemaVersionId: string; tenantId: string; categoryId: string },
): Record<string, string[]> | null {
  if (pinned.schemaVersionId !== expected.schemaVersionId) {
    return {
      schema_version_id: [
        `Pinned schema identity mismatch: pinned=${pinned.schemaVersionId} expected=${expected.schemaVersionId}`,
      ],
    };
  }
  if (pinned.tenantId !== expected.tenantId) {
    return { schema_version_id: ["Pinned schema tenant mismatch."] };
  }
  if (pinned.categoryId !== expected.categoryId) {
    return { schema_version_id: ["Pinned schema category mismatch."] };
  }
  return null;
}

function internalEvaluateLegacySafe(args: FrozenModeEvaluationArgs): CatalogRequestEvaluationResult {
  if (!args.request.categoryId || !UUID_PATTERN.test(args.request.categoryId)) {
    return { isValid: false, errors: { category_id: ["category_id is required for LEGACY_SAFE."] } };
  }

  if (args.context.pinnedSchema) {
    return {
      isValid: false,
      errors: { schema_version_id: ["LEGACY_SAFE must not include context.pinnedSchema."] },
    };
  }

  try {
    internalAssertLegacySafePayloadValues({ ...args.values });
  } catch (e) {
    if (e instanceof LegacySchemaMigrationRequiredError) {
      return { isValid: false, errors: { values: e.errors.values ?? [e.message] } };
    }
    return internalInvalidFromThrown(e);
  }

  return {
    isValid: true,
    resolvedMode: args.resolvedMode,
    validationMode: args.resolvedMode,
    schemaVersionId: null,
    descriptor: null,
    pinnedSchema: null,
    normalizedPayload: buildStoredPayload({
      values: { ...args.values },
      schemaVersionId: null,
      validatedAt: args.validatedAt,
      validationMode: "LEGACY_SAFE",
    }),
  };
}

function internalEvaluateNoSchemaMinimal(
  args: FrozenModeEvaluationArgs,
): CatalogRequestEvaluationResult {
  if (args.context.pinnedSchema) {
    return {
      isValid: false,
      errors: { schema_version_id: ["NO_SCHEMA_MINIMAL must not include context.pinnedSchema."] },
    };
  }

  if (typeof args.values !== "object" || args.values === null || Array.isArray(args.values)) {
    return { isValid: false, errors: { values: ["Values must be a plain object."] } };
  }

  return {
    isValid: true,
    resolvedMode: args.resolvedMode,
    validationMode: args.resolvedMode,
    schemaVersionId: null,
    descriptor: null,
    pinnedSchema: null,
    normalizedPayload: buildStoredPayload({
      values: { ...args.values },
      schemaVersionId: null,
      validatedAt: args.validatedAt,
      validationMode: "NO_SCHEMA_MINIMAL",
    }),
  };
}

function internalEvaluateMutationGovernance(
  request: CatalogRequestEvaluationInput,
): Record<string, string[]> | null {
  try {
    internalAssertCatalogRequestSchemaGovernance({
      previous: {
        schema_version_id: request.previous!.schema_version_id,
        attribute_payload: request.previous!.attribute_payload,
      },
      next: {
        schema_version_id: request.schemaVersionId,
        attribute_payload: request.attributePayload as never,
      },
    });
    return null;
  } catch (e) {
    if (e instanceof CatalogSchemaMutationError) {
      return { schema_version_id: [e.message] };
    }
    if (e instanceof InvalidCatalogRequestError) {
      return e.errors;
    }
    if (e instanceof Error) {
      return { _error: [e.message] };
    }
    return { _error: ["Mutation governance failed."] };
  }
}

function internalAssertDeterministicValidationPath(
  schemaVersionId: string | null,
  input: CatalogRequestEvaluationInput,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const payloadPin = input.attributePayload?.schemaVersionId;

  if (schemaVersionId && payloadPin && payloadPin !== schemaVersionId) {
    errors.schema_version_id = ["Mixed schemaVersionId: row pin and payload disagree."];
  }
  if (!schemaVersionId && payloadPin) {
    errors.schema_version_id = ["Mixed state: payload schemaVersionId without schema_version_id."];
  }
  if (schemaVersionId && !input.categoryId) {
    errors.category_id = ["STRICT mode requires category_id."];
  }
  if (schemaVersionId && input.categoryId && input.attributePayload?.categoryId) {
    if (input.attributePayload.categoryId !== input.categoryId) {
      errors.category_id = ["Mixed categoryId: submission and payload disagree."];
    }
  }

  return errors;
}

function internalValidateSubmissionContext(
  input: CatalogRequestEvaluationInput,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  if (!input.tenantId || !UUID_PATTERN.test(input.tenantId)) {
    errors.tenant_id = ["Valid tenant_id is required."];
  }
  if (!input.vendorId || !UUID_PATTERN.test(input.vendorId)) {
    errors.vendor_id = ["Valid vendor_id is required."];
  }
  if (input.vendorTenantId !== input.tenantId) {
    errors.vendor_id = ["Vendor does not belong to the submission tenant."];
  }

  return errors;
}

function internalValidateRequiredScalars(
  scalars: CatalogRequestEvaluationInput["submissionScalars"],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const title = scalars.title?.trim() ?? "";
  const slug = scalars.slugSuggestion?.trim().toLowerCase() ?? "";

  if (title.length < 2) {
    errors.title = ["Title is required and must be at least 2 characters."];
  }
  if (!slug) {
    errors.slug_suggestion = ["Slug is required."];
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug_suggestion = ["Slug: lowercase letters, numbers, and hyphens only."];
  }

  return errors;
}

function internalInvalidFromThrown(
  e: unknown,
): CatalogRequestEvaluationResult & { isValid: false } {
  if (e instanceof InvalidCatalogRequestError) {
    return { isValid: false, errors: e.errors };
  }
  if (e instanceof Error) {
    return { isValid: false, errors: { _error: [e.message] } };
  }
  return { isValid: false, errors: { _error: ["Validation failed."] } };
}

function internalGroupFieldErrors(
  issues: { code: string; message: string }[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const list = errors[issue.code] ?? [];
    list.push(issue.message);
    errors[issue.code] = list;
  }
  return errors;
}
