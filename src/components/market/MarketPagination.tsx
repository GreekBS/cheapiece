import Link from "next/link";

type Props = {
  page: number;
  hasMore: boolean;
  /** Query string keys to preserve (omit empties). */
  params: Record<string, string>;
};

function buildHref(p: number, params: Record<string, string>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) {
      usp.set(k, v);
    }
  }
  usp.set("page", String(p));
  return `/offers?${usp.toString()}`;
}

export function MarketPagination({ page, hasMore, params }: Props) {
  const prev = page > 1 ? page - 1 : null;
  const next = hasMore ? page + 1 : null;

  if (prev == null && next == null) {
    return null;
  }

  return (
    <nav className="flex items-center justify-center gap-4 pt-4" aria-label="Pagination">
      {prev != null ? (
        <Link
          href={buildHref(prev, params)}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          Previous
        </Link>
      ) : (
        <span className="rounded-full border border-transparent px-4 py-2 text-sm text-zinc-300">Previous</span>
      )}
      <span className="text-sm tabular-nums text-zinc-600">
        Page <span className="font-semibold text-zinc-900">{page}</span>
      </span>
      {next != null ? (
        <Link
          href={buildHref(next, params)}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          Next
        </Link>
      ) : (
        <span className="rounded-full border border-transparent px-4 py-2 text-sm text-zinc-300">Next</span>
      )}
    </nav>
  );
}
