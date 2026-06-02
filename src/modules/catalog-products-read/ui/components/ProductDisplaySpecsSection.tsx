import type { ProductDisplayGroup } from "@/modules/catalog-products/types/display-snapshot";

type Props = {
  specGroups: ProductDisplayGroup[];
};

export function ProductDisplaySpecsSection({ specGroups }: Props) {
  if (specGroups.length === 0) {
    return null;
  }

  const sortedGroups = [...specGroups].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="space-y-6" aria-labelledby="product-specs-heading">
      <h2 id="product-specs-heading" className="text-sm font-semibold text-zinc-900">
        Specifications
      </h2>
      {sortedGroups.map((group) => (
        <article
          key={group.code}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
        >
          <header className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:px-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{group.label}</h3>
          </header>
          <dl className="divide-y divide-zinc-100">
            {group.fields.map((field) => (
              <div key={field.code} className="grid gap-1 px-4 py-3 sm:grid-cols-2 sm:gap-4 sm:px-6">
                <dt className="text-sm text-zinc-500">{field.label}</dt>
                <dd className="text-sm font-medium text-zinc-900">{field.formattedValue}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </section>
  );
}
