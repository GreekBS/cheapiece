import type { CategorySchemaSeed } from "../seed/types";
import type { CategorySchemaFieldBinding } from "../types/schema-field";
import type { ConfigDiffEntry, FieldChangeKind, FieldDiff, SchemaDiffDto } from "./diff-types";

function stableStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  return JSON.stringify(value, Object.keys(value as object).sort());
}

function diffBindings(before: CategorySchemaFieldBinding[], after: CategorySchemaFieldBinding[]): FieldDiff[] {
  const beforeMap = new Map(before.map((b) => [b.attributeCode, b]));
  const afterMap = new Map(after.map((b) => [b.attributeCode, b]));
  const codes = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const fields: FieldDiff[] = [];

  for (const code of [...codes].sort()) {
    const b = beforeMap.get(code);
    const a = afterMap.get(code);
    if (!b && a) {
      fields.push({
        attributeCode: code,
        change: a.overrides?.hide ? "hidden" : "added",
        after: a,
        changedAspects: [],
      });
      continue;
    }
    if (b && !a) {
      fields.push({ attributeCode: code, change: "removed", before: b, changedAspects: [] });
      continue;
    }
    if (b && a) {
      const changedAspects: FieldDiff["changedAspects"] = [];
      if (b.requiredLevel !== a.requiredLevel) changedAspects.push("requiredLevel");
      if (
        b.filterable !== a.filterable ||
        b.searchable !== a.searchable ||
        b.comparable !== a.comparable ||
        b.variantAxis !== a.variantAxis ||
        b.merchantVisible !== a.merchantVisible
      ) {
        changedAspects.push("flags");
      }
      if (stableStringify(b.overrides?.enumOptionsSubset) !== stableStringify(a.overrides?.enumOptionsSubset)) {
        changedAspects.push("enumSubset");
      }
      if (stableStringify(b.overrides?.label) !== stableStringify(a.overrides?.label)) {
        changedAspects.push("label");
      }
      if (b.sortOrder !== a.sortOrder) changedAspects.push("sortOrder");
      if (b.overrides?.hide !== a.overrides?.hide) changedAspects.push("hide");

      let change: FieldChangeKind = "unchanged";
      if (a.overrides?.hide && !b.overrides?.hide) change = "hidden";
      else if (changedAspects.length > 0) change = "changed";

      fields.push({
        attributeCode: code,
        change,
        before: b,
        after: a,
        changedAspects,
      });
    }
  }

  return fields;
}

function diffConfig(before: Record<string, unknown>, after: Record<string, unknown>): ConfigDiffEntry[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const entries: ConfigDiffEntry[] = [];
  for (const key of [...keys].sort()) {
    const b = before[key];
    const a = after[key];
    if (stableStringify(b) !== stableStringify(a)) {
      entries.push({ key, before: b, after: a });
    }
  }
  return entries;
}

/** Compare two schema seeds (e.g. draft vs published). */
export function diffSchemaVersions(left: CategorySchemaSeed, right: CategorySchemaSeed): SchemaDiffDto {
  const fields = diffBindings(left.document.fields, right.document.fields);
  const matching = diffConfig(
    left.matching as unknown as Record<string, unknown>,
    right.matching as unknown as Record<string, unknown>,
  );
  const denormalize = diffConfig(
    left.denormalize as unknown as Record<string, unknown>,
    right.denormalize as unknown as Record<string, unknown>,
  );

  return {
    summary: {
      fieldsAdded: fields.filter((f) => f.change === "added").length,
      fieldsRemoved: fields.filter((f) => f.change === "removed").length,
      fieldsChanged: fields.filter((f) => f.change === "changed").length,
      fieldsHidden: fields.filter((f) => f.change === "hidden").length,
    },
    fields,
    matching,
    denormalize,
  };
}
