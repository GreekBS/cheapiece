type PreserveParams = {
  minPrice?: string;
  maxPrice?: string;
  condition?: string;
  page?: string;
};

type Props = {
  defaultQuery: string;
  /** Echo active filters so a new search keeps them (server navigation). */
  preserve?: PreserveParams;
};

function hiddenFields(preserve: PreserveParams | undefined) {
  if (!preserve) {
    return null;
  }
  const entries = Object.entries(preserve).filter(([, v]) => v != null && v !== "");
  return entries.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
}

/**
 * GET `/offers` — full navigation refresh; empty `q` falls back to default listing server-side.
 */
export function MarketSearchBar({ defaultQuery, preserve }: Props) {
  return (
    <form method="get" action="/offers" className="relative max-w-2xl flex-1">
      <input type="hidden" name="page" value="1" />
      {hiddenFields(preserve)}
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search products…"
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-24 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4"
        aria-label="Search products"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 sm:text-sm"
      >
        Search
      </button>
    </form>
  );
}
