"use client";

import type { AttributeDefinition } from "@/modules/catalog-schema/types/attribute-definition";
import type { CategorySchemaFieldBinding } from "@/modules/catalog-schema/types/schema-field";
import type { RequiredLevel } from "@/modules/catalog-schema/types/required-level";

const REQUIRED_LEVELS: RequiredLevel[] = ["required", "recommended", "optional", "admin_only"];

type Props = {
  binding: CategorySchemaFieldBinding;
  definition: AttributeDefinition | undefined;
  onChange: (binding: CategorySchemaFieldBinding) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function FieldBindingRow({ binding, definition, onChange, onRemove, onMoveUp, onMoveDown }: Props) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-2 font-mono text-xs text-slate-800">{binding.attributeCode}</td>
      <td className="px-3 py-2 text-xs text-slate-600">{definition?.primitive ?? "—"}</td>
      <td className="px-3 py-2">
        <select
          className="rounded border border-slate-200 px-2 py-1 text-xs"
          value={binding.requiredLevel}
          onChange={(e) => onChange({ ...binding, requiredLevel: e.target.value as RequiredLevel })}
        >
          {REQUIRED_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2 text-xs">
          {(["filterable", "searchable", "comparable", "variantAxis", "merchantVisible"] as const).map((flag) => (
            <label key={flag} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={binding[flag]}
                onChange={(e) => onChange({ ...binding, [flag]: e.target.checked })}
              />
              {flag}
            </label>
          ))}
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={onMoveUp}>
            ↑
          </button>
          <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={onMoveDown}>
            ↓
          </button>
          <button type="button" className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700" onClick={onRemove}>
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}
