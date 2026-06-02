import type { SchemaDescriptorField } from "@/modules/catalog-schema/types/schema-descriptor";

export function formatFieldDisplayValue(
  field: Pick<SchemaDescriptorField, "primitive" | "enumOptions" | "unit">,
  rawValue: unknown,
): string {
  if (rawValue === null || rawValue === undefined) {
    return "";
  }

  switch (field.primitive) {
    case "boolean":
      return rawValue === true ? "Ναι" : "Όχι";
    case "enum_single": {
      const code = String(rawValue);
      const opt = field.enumOptions?.find((o) => o.code === code);
      return opt?.label ?? code;
    }
    case "enum_multi": {
      if (!Array.isArray(rawValue)) {
        return String(rawValue);
      }
      return rawValue
        .map((code) => {
          const c = String(code);
          const opt = field.enumOptions?.find((o) => o.code === c);
          return opt?.label ?? c;
        })
        .join(", ");
    }
    case "integer":
    case "decimal":
      return field.unit ? `${rawValue} ${field.unit}` : String(rawValue);
    case "measurement":
    case "weight":
    case "dimension": {
      if (typeof rawValue === "object" && rawValue !== null && "value" in rawValue) {
        const v = rawValue as { value: unknown; unit?: string };
        const unit = v.unit ?? field.unit;
        return unit ? `${v.value} ${unit}` : String(v.value);
      }
      return String(rawValue);
    }
    default:
      return String(rawValue);
  }
}

export function normalizeFacetValue(
  primitive: string,
  rawValue: unknown,
): ProductFacetValue {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  switch (primitive) {
    case "boolean":
      return rawValue === true;
    case "integer":
    case "decimal":
      return typeof rawValue === "number" ? rawValue : Number(rawValue);
    case "enum_single":
      return String(rawValue);
    case "enum_multi":
      return Array.isArray(rawValue)
        ? [...rawValue].map(String).sort()
        : [String(rawValue)];
    default:
      return String(rawValue);
  }
}

type ProductFacetValue = string | number | boolean | string[] | null;
