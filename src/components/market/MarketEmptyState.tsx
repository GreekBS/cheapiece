import Link from "next/link";

type Props = {
  signedIn?: boolean;
  searched?: boolean;
};

export function MarketEmptyState({ signedIn, searched }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-20 text-center shadow-sm">
      <p className="text-lg font-semibold text-zinc-900">
        {searched ? "No results for this search" : "No listings match yet"}
      </p>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        {searched
          ? "Try a broader term or clear filters. Search runs on product title, slug, brand, and model (no separate description field in this catalog)."
          : "Active offers will appear here when sellers publish them. Adjust filters or check back soon."}
      </p>
      {!signedIn ? (
        <Link
          href="/merchant"
          className="mt-8 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign in
        </Link>
      ) : null}
    </div>
  );
}
