import Link from "next/link";

import { bestDeals } from "../marketplace-home-data";

export function MarketplaceDeals() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Κορυφαίες προσφορές</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Οριζόντιο scroll, έντονη αλλά ήρεμη πορτοκαλί έμφαση — ξεχωρίζει από τις υπόλοιπες κάρτες.
          </p>
        </div>
        <Link href="/offers" className="shrink-0 text-sm font-semibold text-orange-900/90 transition hover:text-orange-800">
          Όλες οι εκπτώσεις →
        </Link>
      </div>
      <div className="mt-8 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
        {bestDeals.map((d) => (
          <Link
            key={d.id}
            href={`/product/deal-${d.id}`}
            className="block w-[min(100%,300px)] shrink-0 snap-start transition duration-300 ease-out hover:-translate-y-1"
          >
          <article className="h-full rounded-2xl border border-orange-100/90 bg-gradient-to-b from-white via-orange-50/30 to-orange-50/60 p-5 shadow-md shadow-orange-900/[0.06] ring-1 ring-orange-100/50 transition duration-300 ease-out hover:shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-900 ring-1 ring-orange-200/90">
                {d.badge}
              </span>
              <span className="rounded-lg bg-orange-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-orange-950">
                {d.discountPercent}
              </span>
            </div>
            {d.urgency ? (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-orange-900/80">{d.urgency}</p>
            ) : null}
            <h3 className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900">{d.title}</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums text-slate-900">{d.newPrice}</span>
              <span className="text-sm tabular-nums text-slate-400 line-through">{d.oldPrice}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{d.stores} καταστήματα</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-orange-950/90">
              Λεπτομέρειες →
            </span>
          </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
