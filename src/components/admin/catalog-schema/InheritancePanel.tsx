import type { EffectiveFieldView } from "@/modules/catalog-schema/preview/annotate-inheritance";

type Props = {
  chain: { categoryId: string; categoryPath: string }[];
  fieldViews: EffectiveFieldView[];
};

const SOURCE_LABEL: Record<EffectiveFieldView["source"], string> = {
  local: "Local",
  inherited: "Inherited",
  inherited_overridden: "Override",
  inherited_hidden: "Hidden",
};

export function InheritancePanel({ chain, fieldViews }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Inheritance chain</h3>
        <ol className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
          {chain.map((c) => (
            <li key={c.categoryId} className="rounded-full bg-slate-200 px-2 py-0.5">
              {c.categoryPath || c.categoryId}
            </li>
          ))}
        </ol>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">From</th>
            </tr>
          </thead>
          <tbody>
            {fieldViews.map((v) => (
              <tr key={v.attributeCode} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono">{v.attributeCode}</td>
                <td className="px-3 py-2">{SOURCE_LABEL[v.source]}</td>
                <td className="px-3 py-2 text-slate-600">{v.sourceCategoryPath ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
