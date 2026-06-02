import type { AdminPreviewBundleDto } from "@/modules/catalog-schema/preview/build-admin-preview";

type Props = { preview: AdminPreviewBundleDto | null };

export function DescriptorPreviewPanel({ preview }: Props) {
  if (!preview) {
    return <p className="text-sm text-slate-600">No preview available.</p>;
  }

  return (
    <div className="space-y-6">
      {preview.issues.length > 0 ? (
        <ul className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {preview.issues.map((i) => (
            <li key={`${i.code}-${i.message}`}>
              [{i.level}] {i.message}
            </li>
          ))}
        </ul>
      ) : null}

      <section>
        <h3 className="text-sm font-semibold text-slate-700">Form preview</h3>
        <div className="mt-2 space-y-4">
          {preview.formPreview.map((group) => (
            <div key={group.code} className="rounded-lg border border-slate-200 p-3">
              <h4 className="text-xs font-semibold uppercase text-slate-500">{group.label}</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {group.fields.map((f) => (
                  <li key={f.code}>
                    <span className="font-medium">{f.label}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {f.primitive} · {f.requiredLevel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-700">SchemaDescriptor</h3>
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
          {JSON.stringify(preview.descriptor, null, 2)}
        </pre>
      </section>
    </div>
  );
}
