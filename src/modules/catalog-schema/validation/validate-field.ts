import type { EffectiveSchemaField } from "../types/effective-schema";
import type { FieldValidationIssue } from "../types/validation-result";
import { allowsEmptyForMerchant, type RequiredLevel } from "../types/required-level";
import { coerceFieldValue } from "../primitives/value-coercion";
import { applyValidationRules } from "./rules-engine";

export type ValidateFieldContext = {
  role: "merchant" | "admin";
  locale: string;
};

export type FieldValidationOutput = {
  ok: boolean;
  coerced: unknown;
  empty: boolean;
  issues: FieldValidationIssue[];
};

export function validateField(
  field: EffectiveSchemaField,
  raw: unknown,
  ctx: ValidateFieldContext,
): FieldValidationOutput {
  const { definition, requiredLevel, validationRules, overrides } = field;
  const issues: FieldValidationIssue[] = [];

  if (overrides?.hide && ctx.role === "merchant") {
    return { ok: true, coerced: undefined, empty: true, issues: [] };
  }

  const coercion = coerceFieldValue(definition.primitive, definition, raw);
  if (!coercion.ok) {
    return {
      ok: false,
      coerced: undefined,
      empty: true,
      issues: [{ code: definition.code, message: coercion.message, level: "error" }],
    };
  }

  const effectiveLevel = effectiveRequiredLevel(requiredLevel, ctx.role);
  if (coercion.empty && !allowsEmptyForMerchant(effectiveLevel)) {
    issues.push({
      code: definition.code,
      message: "This field is required.",
      level: "error",
    });
  }

  if (!coercion.empty) {
    issues.push(...applyValidationRules(definition.code, coercion.value, validationRules));
  }

  if (coercion.empty && effectiveLevel === "recommended") {
    issues.push({
      code: definition.code,
      message: "Recommended field is empty.",
      level: "warning",
    });
  }

  const errors = issues.filter((i) => i.level === "error");
  return {
    ok: errors.length === 0,
    coerced: coercion.value,
    empty: coercion.empty,
    issues,
  };
}

function effectiveRequiredLevel(level: RequiredLevel, role: ValidateFieldContext["role"]): RequiredLevel {
  if (role === "admin") return level;
  if (level === "admin_only") return "optional";
  return level;
}
