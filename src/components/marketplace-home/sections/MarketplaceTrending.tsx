import Link from "next/link";

import { trendingProducts } from "../marketplace-home-data";

export function MarketplaceTrending() {
  return (
    <section className="border-y border-slate-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Τάση τώρα</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Κάρτες εμπνευσμένες από μεγάλα marketplace — καθαρή ιεραρχία, τιμή, καταστήματα, βαθμολογία και αποστολή.
            </p>
          </div>
          <Link href="/offers" className="shrink-0 text-sm font-semibold text-cyan-900 transition hover:text-cyan-800">
            Δες όλα →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trendingProducts.map((p) => (
            <Link
              key={p.id}
              href={`/product/trending-${p.id}`}
              className="group block h-full transition duration-300 ease-out hover:-translate-y-1"
            >
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 shadow-sm shadow-slate-900/[0.04] transition duration-300 ease-out group-hover:border-slate-300/90 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-slate-900/[0.08]">
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 via-white to-cyan-50/40">
                <div className="absolute inset-0 flex scale-100 items-center justify-center text-slate-400 transition duration-500 ease-out group-hover:scale-105">
                  <svg className="h-16 w-16 opacity-55" viewBox="0 0 64 64" fill="none" aria-hidden>
                    <rect x="10" y="14" width="44" height="36" rx="6" stroke="currentColor" strokeWidth="2" />
                    <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                {p.discount ? (
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-100/95 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/80">
                    {p.discount}
                  </span>
                ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900">{p.title}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-0.5 font-medium text-amber-700">
                    <span aria-hidden>★</span>
                    {p.rating}
                  </span>
                  <span className="text-slate-400">({p.ratingCount})</span>
                </div>
                <div className="mt-auto space-y-2 border-t border-slate-200/80 pt-4">
                  <p className="text-xl font-semibold tabular-nums tracking-tight text-slate-900">{p.bestPrice}</p>
                  <p className="text-xs text-slate-500">
                    {p.storeCount} καταστήματα · <span className="font-medium text-emerald-800/90">{p.availability}</span>
                  </p>
                  {p.shipping ? (
                    <p className="inline-flex w-fit rounded-lg bg-slate-100/90 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                      {p.shipping}
                    </p>
                  ) : null}
                </div>
                  <span className="inline-flex items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition duration-200 group-hover:bg-slate-800">
                    Προσθήκη στο Καλάθι
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
