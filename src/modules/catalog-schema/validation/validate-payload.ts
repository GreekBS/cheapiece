import type { CatalogPayload } from "../types/payload";
import type { EffectiveCategorySchema } from "../types/effective-schema";
import type { PayloadValidationResult } from "../types/validation-result";
import { validateField, type ValidateFieldContext } from "./validate-field";

export function validatePayload(
  schema: EffectiveCategorySchema,
  payload: CatalogPayload,
  ctx: ValidateFieldContext,
): PayloadValidationResult {
  const fieldErrors: PayloadValidationResult["fieldErrors"] = [];
  const warnings: PayloadValidationResult["warnings"] = [];
  const sanitizedValues: Record<string, unknown> = {};

  const visibleFields = schema.fields.filter((f) => {
    if (ctx.role === "admin") return true;
    if (f.overrides?.hide) return false;
    if (f.requiredLevel === "admin_only") return false;
    return f.merchantVisible;
  });

  for (const field of visibleFields) {
    const raw = payload.values[field.definition.code];
    const result = validateField(field, raw, ctx);

    for (const issue of result.issues) {
      if (issue.level === "error") fieldErrors.push(issue);
      else warnings.push(issue);
    }

    if (!result.empty || field.requiredLevel === "required") {
      if (!result.empty) sanitizedValues[field.definition.code] = result.coerced;
    }
  }

  for (const key of Object.keys(payload.values)) {
    if (!visibleFields.some((f) => f.definition.code === key)) {
      if (ctx.role === "admin") {
        const binding = schema.fields.find((f) => f.definition.code === key);
        if (binding) {
          const result = validateField(binding, payload.values[key], ctx);
          if (!result.empty) sanitizedValues[key] = result.coerced;
        }
      }
    }
  }

  return {
    ok: fieldErrors.length === 0,
    fieldErrors,
    warnings,
    sanitizedValues,
  };
}
