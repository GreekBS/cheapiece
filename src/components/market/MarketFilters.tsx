type Defaults = {
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  condition?: string;
};

type Props = {
  defaults: Defaults;
};

function hidden(name: string, value: string | undefined) {
  if (!value) {
    return null;
  }
  return <input type="hidden" name={name} value={value} />;
}

/**
 * GET `/offers` — server-side filters; resets to page 1 when applied.
 */
export function MarketFilters({ defaults }: Props) {
  return (
    <form method="get" action="/offers" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
      {hidden("q", defaults.q)}
      <input type="hidden" name="page" value="1" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Min price
            <input
              name="minPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaults.minPrice}
              placeholder="0"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Max price
            <input
              name="maxPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaults.maxPrice}
              placeholder="Any"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Condition
            <select
              name="condition"
              defaultValue={defaults.condition ?? ""}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/10"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}
