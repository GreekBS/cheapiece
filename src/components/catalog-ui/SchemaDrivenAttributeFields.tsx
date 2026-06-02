"use client";

import { memo, useMemo } from "react";

import type {
  MerchantFormContractDTO,
  MerchantFormFieldDTO,
  MerchantFormGroupDTO,
} from "@/modules/catalog-products-read/ui/client";

type Props = {
  contract: MerchantFormContractDTO;
  /** Increment to reset uncontrolled field defaults after category change. */
  formKey: string;
};

const INPUT_CLASS =
  "mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function FieldInput({ field }: { field: MerchantFormFieldDTO }) {
  const name = `attr[${field.code}]`;
  const primitive = field.primitive;

  if (primitive === "boolean") {
    return (
      <select name={name} className={INPUT_CLASS} defaultValue="">
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (
    (primitive === "enum_single" || primitive === "enum_multi" || primitive === "color") &&
    field.enumOptions &&
    field.enumOptions.length > 0
  ) {
    if (primitive === "enum_multi") {
      return (
        <select name={name} multiple className={INPUT_CLASS} size={Math.min(6, field.enumOptions.length + 1)}>
          {field.enumOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <select name={name} className={INPUT_CLASS} defaultValue="">
        <option value="">—</option>
        {field.enumOptions.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (
    primitive === "integer" ||
    primitive === "decimal" ||
    primitive === "measurement" ||
    primitive === "weight" ||
    primitive === "dimension"
  ) {
    return (
      <input
        name={name}
        type="number"
        min={field.min}
        max={field.max}
        step={primitive === "integer" ? 1 : "any"}
        placeholder={field.placeholder}
        className={INPUT_CLASS}
      />
    );
  }

  return (
    <input
      name={name}
      type="text"
      maxLength={field.maxLength}
      placeholder={field.placeholder}
      className={INPUT_CLASS}
    />
  );
}

const GroupSection = memo(function GroupSection({ group }: { group: MerchantFormGroupDTO }) {
  if (group.fields.length === 0) {
    return null;
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {group.label}
      </legend>
      {group.fields.map((field) => (
        <label key={field.code} className="block text-sm font-medium text-slate-700">
          {field.label}
          {field.requiredLevel === "required" ? <span className="text-rose-600"> *</span> : null}
          {field.helpText ? (
            <span className="mt-0.5 block text-xs font-normal text-slate-500">{field.helpText}</span>
          ) : null}
          <FieldInput field={field} />
        </label>
      ))}
    </fieldset>
  );
});

/**
 * Dumb renderer for merchant schema fields — DTO primitives only; no validation engine.
 */
function SchemaDrivenAttributeFieldsInner({ contract, formKey }: Props) {
  const visibleGroups = useMemo(() => {
    return [...contract.groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((g) => g.fields.length > 0);
  }, [contract.groups]);

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <div key={formKey} className="space-y-4 border-t border-slate-200 pt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catalog attributes</p>
      {visibleGroups.map((group) => (
        <GroupSection key={group.code} group={group} />
      ))}
    </div>
  );
}

export const SchemaDrivenAttributeFields = memo(SchemaDrivenAttributeFieldsInner);
