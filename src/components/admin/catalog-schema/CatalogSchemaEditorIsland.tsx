"use client";

import { useCallback, useState } from "react";

import {
  getSchemaDiffAction,
  publishSchemaDraftAction,
  saveSchemaDraftAction,
} from "@/actions/admin-catalog-schema";
import type { SchemaEditorInitialDto } from "@/modules/catalog-schema/types/admin-dtos";
import type { CategorySchemaFieldBinding } from "@/modules/catalog-schema/types/schema-field";
import type { SchemaDiffDto } from "@/modules/catalog-schema/diff/diff-types";
import type { GovernanceIssue } from "@/modules/catalog-schema/governance/types";
import { FieldBindingRow } from "./FieldBindingRow";
import { PublishReviewPanel } from "./PublishReviewPanel";

type Props = {
  initial: SchemaEditorInitialDto;
  tenantId: string;
};

function defaultBinding(code: string, sortOrder: number): CategorySchemaFieldBinding {
  return {
    attributeCode: code,
    requiredLevel: "optional",
    groupCode: "general",
    sortOrder,
    filterable: false,
    searchable: false,
    comparable: false,
    variantAxis: false,
    merchantVisible: true,
  };
}

export function CatalogSchemaEditorIsland({ initial, tenantId }: Props) {
  const [bindings, setBindings] = useState(initial.bindings);
  const [revisionToken, setRevisionToken] = useState(initial.draft?.revisionToken ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [diff, setDiff] = useState<SchemaDiffDto | null>(null);
  const [diffHash, setDiffHash] = useState<string | null>(null);
  const [blockingErrors, setBlockingErrors] = useState<GovernanceIssue[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  const draft = initial.draft;
  const attrMap = new Map(initial.availableAttributes.map((a) => [a.code, a]));

  const handleSave = useCallback(async () => {
    if (!draft) {
      setStatus("No draft version");
      return;
    }
    setSaving(true);
    setStatus(null);
    const result = await saveSchemaDraftAction({
      tenantId,
      categoryId: initial.category.id,
      versionId: draft.id,
      expectedVersion: draft.version,
      expectedRevision: revisionToken,
      bindings,
    });
    setSaving(false);
    if (result.ok && result.revisionToken) {
      setRevisionToken(result.revisionToken);
      setStatus("Draft saved");
      setDiff(null);
      setDiffHash(null);
    } else {
      setStatus(result.message ?? "Save failed");
    }
  }, [bindings, draft, initial.category.id, revisionToken, tenantId]);

  const handleLoadDiff = useCallback(async () => {
    if (!draft) return;
    const result = await getSchemaDiffAction(initial.category.id, draft.id);
    if ("error" in result) {
      setStatus(result.error);
      return;
    }
    setDiff(result.diff);
    setDiffHash(result.diffHash);
    setBlockingErrors([]);
    setStatus("Diff loaded — review and confirm publish");
  }, [draft, initial.category.id]);

  const handlePublish = useCallback(
    async (hash: string) => {
      if (!draft) return;
      setPublishing(true);
      const result = await publishSchemaDraftAction({
        tenantId,
        categoryId: initial.category.id,
        versionId: draft.id,
        expectedVersion: draft.version,
        expectedRevision: revisionToken,
        diffHash: hash,
      });
      setPublishing(false);
      if (result.ok) {
        setStatus("Published successfully");
        setBlockingErrors([]);
      } else {
        setStatus(result.message ?? "Publish failed");
        setBlockingErrors(result.blockingErrors ?? []);
      }
    },
    [draft, initial.category.id, revisionToken, tenantId],
  );

  const addField = (code: string) => {
    if (bindings.some((b) => b.attributeCode === code)) return;
    setBindings([...bindings, defaultBinding(code, (bindings.length + 1) * 10)]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...bindings];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setBindings(next.map((b, i) => ({ ...b, sortOrder: (i + 1) * 10 })));
  };

  if (!draft) {
    return <p className="text-sm text-amber-800">No draft available. Publish a schema first or clone from explorer.</p>;
  }

  const unusedAttributes = initial.availableAttributes.filter(
    (a) => !bindings.some((b) => b.attributeCode === a.code),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={handleLoadDiff}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Prepare publish
        </button>
        <span className="self-center text-xs text-slate-500">
          v{draft.version} · revision {revisionToken.slice(0, 19)}…
        </span>
      </div>

      {status ? <p className="text-sm text-slate-700">{status}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Attribute</th>
              <th className="px-3 py-2">Primitive</th>
              <th className="px-3 py-2">Required</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((b, i) => (
              <FieldBindingRow
                key={b.attributeCode}
                binding={b}
                definition={attrMap.get(b.attributeCode)}
                onChange={(next) => setBindings(bindings.map((x, j) => (j === i ? next : x)))}
                onRemove={() => setBindings(bindings.filter((_, j) => j !== i))}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {unusedAttributes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600">Add field:</span>
          {unusedAttributes.map((a) => (
            <button
              key={a.code}
              type="button"
              className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-xs hover:bg-slate-300"
              onClick={() => addField(a.code)}
            >
              + {a.code}
            </button>
          ))}
        </div>
      ) : null}

      <PublishReviewPanel
        diff={diff}
        diffHash={diffHash}
        blockingErrors={blockingErrors}
        onConfirmPublish={handlePublish}
        publishing={publishing}
      />
    </div>
  );
}
