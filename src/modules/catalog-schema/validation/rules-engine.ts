import type { ValidationRule } from "../types/validation-rule";
import type { FieldValidationIssue } from "../types/validation-result";

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "value" in value) {
    const v = Number((value as { value: unknown }).value);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Apply field validation rules after coercion. */
export function applyValidationRules(
  code: string,
  value: unknown,
  rules: ValidationRule[] | undefined,
): FieldValidationIssue[] {
  if (!rules?.length) return [];
  const issues: FieldValidationIssue[] = [];

  for (const rule of rules) {
    switch (rule.kind) {
      case "min": {
        const n = numericValue(value);
        if (n !== null && n < rule.value) {
          issues.push({ code, message: `Minimum value is ${rule.value}.`, level: "error" });
        }
        break;
      }
      case "max": {
        const n = numericValue(value);
        if (n !== null && n > rule.value) {
          issues.push({ code, message: `Maximum value is ${rule.value}.`, level: "error" });
        }
        break;
      }
      case "min_length": {
        const s = stringValue(value);
        if (s.length > 0 && s.length < rule.value) {
          issues.push({ code, message: `Minimum length is ${rule.value}.`, level: "error" });
        }
        break;
      }
      case "max_length": {
        const s = stringValue(value);
        if (s.length > rule.value) {
          issues.push({ code, message: `Maximum length is ${rule.value}.`, level: "error" });
        }
        break;
      }
      case "regex": {
        const s = stringValue(value);
        if (s.length > 0) {
          try {
            const re = new RegExp(rule.pattern);
            if (!re.test(s)) {
              issues.push({ code, message: "Value does not match required pattern.", level: "error" });
            }
          } catch {
            issues.push({ code, message: "Invalid regex rule configuration.", level: "error" });
          }
        }
        break;
      }
      case "precision": {
        const n = numericValue(value);
        if (n !== null) {
          const parts = String(n).split(".");
          const decimals = parts[1]?.length ?? 0;
          if (decimals > rule.value) {
            issues.push({ code, message: `At most ${rule.value} decimal places allowed.`, level: "error" });
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return issues;
}
