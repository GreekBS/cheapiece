import type { AdminRequestPreviewVM, ProductMarketViewModel } from "@/modules/catalog-products-read/ui/client";

type Props = {
  preview: AdminRequestPreviewVM;
  publishedProduct?: ProductMarketViewModel | null;
};

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function ModeBadge({ mode }: { mode: AdminRequestPreviewVM["mode"] }) {
  const styles =
    mode === "strict"
      ? "bg-violet-100 text-violet-900"
      : mode === "partial"
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${styles}`}>{mode}</span>
  );
}

function SnapshotSection({ preview }: { preview: AdminRequestPreviewVM }) {
  const { scalars } = preview;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Request snapshot</h2>
        <ModeBadge mode={preview.mode} />
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {preview.status}
        </span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Title</dt>
          <dd className="font-medium text-slate-900">{scalars.title ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Brand / Model</dt>
          <dd>{[scalars.brand, scalars.model].filter(Boolean).join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Slug suggestion</dt>
          <dd className="font-mono text-xs">{scalars.slugSuggestion ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">Vendor</dt>
          <dd>{preview.vendorLabel}</dd>
        </div>
        {(scalars.gtin || scalars.mpn) && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">Identifiers</dt>
            <dd className="font-mono text-xs">
              {[scalars.gtin ? `GTIN: ${scalars.gtin}` : null, scalars.mpn ? `MPN: ${scalars.mpn}` : null]
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </div>
        )}
        {preview.merchantIntent ? (
          <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
            <dt className="text-xs font-semibold uppercase text-amber-900">
              Merchant intent (NOT offer)
            </dt>
            <dd className="mt-1 text-sm text-amber-950">
              {preview.merchantIntent.priceAmount != null ? (
                <span className="tabular-nums">
                  Τιμή: {preview.merchantIntent.priceAmount}{" "}
                  {preview.merchantIntent.currency ?? "EUR"}
                </span>
              ) : null}
              {preview.merchantIntent.priceAmount != null &&
              preview.merchantIntent.stockQuantity != null
                ? " · "
                : null}
              {preview.merchantIntent.stockQuantity != null ? (
                <span className="tabular-nums">
                  Απόθεμα: {preview.merchantIntent.stockQuantity}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {preview.schemaVersionId ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">Schema version (stored)</dt>
            <dd className="font-mono text-xs break-all">{preview.schemaVersionId}</dd>
          </div>
        ) : null}
        {preview.validationMode ? (
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Validation mode (stored)</dt>
            <dd>{preview.validationMode}</dd>
          </div>
        ) : null}
      </dl>

      {Object.keys(preview.attributeValues).length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">Raw attribute values</h3>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            {JSON.stringify(preview.attributeValues, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No stored attribute values.</p>
      )}
    </section>
  );
}

function DisplayGroupsSection({ preview }: { preview: AdminRequestPreviewVM }) {
  if (!preview.displayGroups?.length) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Display groups (stored values)</h2>
      {preview.displayGroups.map((g) => (
        <div key={g.group} className="overflow-hidden rounded-lg border border-slate-100">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600">
            {g.group}
          </div>
          <dl className="divide-y divide-slate-100">
            {g.fields.map((f) => (
              <div key={f.code} className="grid gap-1 px-3 py-2 sm:grid-cols-2">
                <dt className="font-mono text-xs text-slate-500">{f.code}</dt>
                <dd className="text-sm text-slate-900">{formatUnknown(f.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}

function FacetDebugSection({ preview }: { preview: AdminRequestPreviewVM }) {
  if (!preview.facetDebug || Object.keys(preview.facetDebug).length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
      <h3 className="text-xs font-semibold uppercase text-slate-500">Facet debug (read-only copy)</h3>
      <pre className="mt-2 max-h-40 overflow-auto text-xs text-slate-700">
        {JSON.stringify(preview.facetDebug, null, 2)}
      </pre>
    </section>
  );
}

function PublishedComparisonSection({
  preview,
  published,
}: {
  preview: AdminRequestPreviewVM;
  published: ProductMarketViewModel;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Approved product comparison</h2>
      <p className="text-xs text-slate-600">Read-only snapshot: request (left) vs published catalog read model (right).</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Request</p>
          <p className="font-medium text-slate-900">{preview.scalars.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {[preview.scalars.brand, preview.scalars.model].filter(Boolean).join(" · ") || "—"}
          </p>
          {preview.displayGroups?.[0] ? (
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {preview.displayGroups.flatMap((g) =>
                g.fields.slice(0, 8).map((f) => (
                  <li key={f.code}>
                    <span className="font-mono text-xs text-slate-500">{f.code}</span>: {formatUnknown(f.value)}
                  </li>
                )),
              )}
            </ul>
          ) : null}
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-emerald-800">Published product</p>
          <p className="font-medium text-slate-900">{published.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {[published.brand, published.model].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Offers: {published.activeOfferCount} active ({published.buyableOfferCount} in stock)
          </p>
          {published.specGroups.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {published.specGroups.flatMap((g) =>
                g.fields.slice(0, 8).map((f) => (
                  <li key={f.code}>
                    <span className="text-slate-500">{f.label}</span>: {f.formattedValue}
                  </li>
                )),
              )}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No display snapshot groups on publication.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function AdminRequestReviewPreview({ preview, publishedProduct }: Props) {
  return (
    <div className="space-y-6">
      <SnapshotSection preview={preview} />
      <DisplayGroupsSection preview={preview} />
      <FacetDebugSection preview={preview} />
      {preview.status === "approved" && publishedProduct ? (
        <PublishedComparisonSection preview={preview} published={publishedProduct} />
      ) : null}
    </div>
  );
}
