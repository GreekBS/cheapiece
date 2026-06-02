"use client";

import type { SchemaDiffDto } from "@/modules/catalog-schema/diff/diff-types";
import type { GovernanceIssue } from "@/modules/catalog-schema/governance/types";

type Props = {
  diff: SchemaDiffDto | null;
  diffHash: string | null;
  blockingErrors: GovernanceIssue[];
  onConfirmPublish: (diffHash: string) => void;
  publishing: boolean;
};

export function PublishReviewPanel({ diff, diffHash, blockingErrors, onConfirmPublish, publishing }: Props) {
  if (blockingErrors.length > 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-semibold">Publish blocked</p>
        <ul className="mt-2 list-disc pl-5">
          {blockingErrors.map((e) => (
            <li key={`${e.code}-${e.message}`}>{e.message}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!diff || !diffHash) {
    return <p className="text-sm text-slate-600">Load diff before publishing.</p>;
  }

  const changes = diff.fields.filter((f) => f.change !== "unchanged");

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">Publish review</h3>
      <p className="text-xs text-slate-600">
        +{diff.summary.fieldsAdded} / −{diff.summary.fieldsRemoved} / ~{diff.summary.fieldsChanged} changed
        {diff.summary.fieldsHidden > 0 ? ` / ${diff.summary.fieldsHidden} hidden` : ""}
      </p>
      {changes.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto text-xs text-slate-700">
          {changes.map((f) => (
            <li key={f.attributeCode} className="border-b border-slate-100 py-1">
              <span className="font-mono">{f.attributeCode}</span> — {f.change}
              {f.changedAspects.length > 0 ? ` (${f.changedAspects.join(", ")})` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No field-level changes vs published.</p>
      )}
      <p className="break-all font-mono text-[10px] text-slate-500">diff: {diffHash.slice(0, 16)}…</p>
      <button
        type="button"
        disabled={publishing}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        onClick={() => onConfirmPublish(diffHash)}
      >
        {publishing ? "Publishing…" : "Confirm publish"}
      </button>
    </div>
  );
}
