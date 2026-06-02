import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { CategorySchemaDocument, DenormalizeMap, MatchingConfig } from "../types/category-schema-document";
import type { GovernanceResult } from "./types";
import { issue } from "./types";

export function validateMerchantVisibleSchema(bindings: CategorySchemaFieldBinding[]): GovernanceResult {
  const blockingErrors = [];
  const visible = bindings.filter((b) => b.merchantVisible && !b.overrides?.hide);
  if (visible.length === 0) {
    blockingErrors.push(
      issue("binding.empty_merchant_visible", "Schema must have at least one merchant-visible field", "error"),
    );
  }
  return { blockingErrors, warnings: [], publishReady: blockingErrors.length === 0 };
}

export function validateReservedFields(document: CategorySchemaDocument): GovernanceResult {
  const blockingErrors = [];
  const codes = new Set(document.fields.map((f) => f.attributeCode));
  if (!codes.has("core.title")) {
    blockingErrors.push(issue("binding.missing_core_title", "Missing reserved field: core.title", "error"));
  }
  return { blockingErrors, warnings: [], publishReady: blockingErrors.length === 0 };
}

export function validateMatchingConfigReferences(
  bindings: CategorySchemaFieldBinding[],
  matching: MatchingConfig,
): GovernanceResult {
  const blockingErrors = [];
  const codes = new Set(bindings.map((b) => b.attributeCode));

  for (const field of [...matching.identifierFields, ...matching.tupleFields, matching.brandField, matching.modelField].filter(Boolean) as string[]) {
    if (!codes.has(field)) {
      blockingErrors.push(
        issue("matching.orphan_ref", `Matching config references unbound field: ${field}`, "error"),
      );
    }
  }
  for (const { code } of matching.weightedFields) {
    if (!codes.has(code)) {
      blockingErrors.push(
        issue("matching.orphan_weight", `Weighted field not in bindings: ${code}`, "error"),
      );
    }
  }

  return { blockingErrors, warnings: [], publishReady: blockingErrors.length === 0 };
}

export function validateDenormalizeReferences(
  bindings: CategorySchemaFieldBinding[],
  denormalize: DenormalizeMap,
): GovernanceResult {
  const blockingErrors = [];
  const codes = new Set(bindings.map((b) => b.attributeCode));

  for (const [, fieldCode] of Object.entries(denormalize)) {
    if (fieldCode && !codes.has(fieldCode)) {
      blockingErrors.push(
        issue("denormalize.orphan_ref", `Denormalize references unbound field: ${fieldCode}`, "error"),
      );
    }
  }

  return { blockingErrors, warnings: [], publishReady: blockingErrors.length === 0 };
}
