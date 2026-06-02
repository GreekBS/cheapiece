"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import type { HotProductMock } from "../hot-products-mock";
import { HOT_PRODUCTS_PAGE_SIZE, hotProductsMock } from "../hot-products-mock";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {dir === "left" ? <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" /> : <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function HotProductCard({ p }: { p: HotProductMock }) {
  const isHot = p.badge === "HOT";
  return (
    <article className="flex min-w-[52%] shrink-0 snap-start sm:min-w-[38%] lg:h-[380px] lg:min-h-[380px] lg:max-h-[380px] lg:min-w-0 lg:w-full lg:justify-self-stretch">
      <Link
        href={`/product/hot-${p.id}`}
        className="group mx-auto flex h-full w-full min-h-[392px] max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.02] transition duration-300 ease-out hover:z-[1] hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/[0.12] sm:min-h-[408px] lg:mx-auto lg:h-full lg:min-h-0 lg:w-full lg:max-w-[clamp(calc(16.25rem*1.12),100%,calc(20rem*1.12))]"
      >
        <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-50/80 sm:aspect-[4/3] lg:aspect-auto lg:min-h-0 lg:flex-1">
          <div className="absolute inset-0 flex items-center justify-center text-slate-400/90 transition duration-300 group-hover:scale-105">
            <svg className="h-[4.25rem] w-[4.25rem] opacity-55 sm:h-[4.5rem] sm:w-[4.5rem]" viewBox="0 0 64 64" fill="none" aria-hidden>
              <rect x="10" y="14" width="44" height="36" rx="6" stroke="currentColor" strokeWidth="2" />
              <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          {p.badge ? (
            <span
              className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                isHot ? "bg-orange-100/95 text-orange-900 ring-orange-200/90" : "bg-emerald-100/95 text-emerald-900 ring-emerald-200/80"
              }`}
            >
              {p.badge}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-4 pb-5 sm:gap-3 sm:p-5 sm:pb-6 lg:shrink-0 lg:flex-none lg:gap-2 lg:p-4 lg:pb-4">
          <h3 className="line-clamp-2 min-h-[2.75rem] text-left text-[15px] font-semibold leading-snug tracking-tight text-slate-900 sm:min-h-[3rem] sm:text-base sm:leading-snug">
            {p.title}
          </h3>
          {p.rating ? (
            <p className="shrink-0 text-[13px] text-slate-500 sm:text-sm">
              <span className="font-medium text-amber-700" aria-hidden>
                ★
              </span>{" "}
              <span className="font-medium text-slate-700">{p.rating}</span>
              {p.ratingCount ? <span className="text-slate-400"> ({p.ratingCount})</span> : null}
            </p>
          ) : null}
          <p className="mt-auto shrink-0 pt-1 text-xl font-semibold tabular-nums leading-none tracking-tight text-slate-900 sm:text-2xl">
            {p.price}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function MarketplaceHotProducts() {
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const chunks: HotProductMock[][] = [];
    for (let i = 0; i < hotProductsMock.length; i += HOT_PRODUCTS_PAGE_SIZE) {
      chunks.push(hotProductsMock.slice(i, i + HOT_PRODUCTS_PAGE_SIZE));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, []);

  const totalPages = pages.length;
  const trackPercent = totalPages * 100;
  const slidePercent = totalPages > 0 ? (page * 100) / totalPages : 0;

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const goPrev = useCallback(() => {
    setPage((p) => (p > 0 ? p - 1 : p));
  }, []);

  const goNext = useCallback(() => {
    setPage((p) => (p < totalPages - 1 ? p + 1 : p));
  }, [totalPages]);

  return (
    <section className="border-b border-slate-200/80 bg-slate-50/80 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          <span aria-hidden>🔥</span> Hot Products
        </h2>
      </div>

      <div className="mx-auto mt-8 w-full max-w-[min(100%,calc(7*17.5rem*1.12+6*1.25rem+8rem))] px-4 sm:px-6">
        <div className="flex items-stretch gap-2 sm:gap-3 lg:gap-2">
          {canPrev ? (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous 6 products"
              className="relative z-20 inline-flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03] transition duration-200 ease-out hover:scale-105 hover:border-slate-300/90 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md hover:shadow-slate-900/[0.08] motion-reduce:hover:scale-100"
            >
              <Chevron dir="left" />
            </button>
          ) : null}

          <div className="relative z-0 min-w-0 flex-1 overflow-hidden">
            <div
              className="flex ease-in-out motion-reduce:transition-none transition-[transform] duration-[400ms]"
              style={{
                width: `${trackPercent}%`,
                transform: `translate3d(-${slidePercent}%,0,0)`,
              }}
            >
              {pages.map((chunk, pageIdx) => (
                <div
                  key={pageIdx}
                  className="flex min-w-0 shrink-0 snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible touch-pan-x pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 lg:grid lg:grid-cols-6 lg:items-stretch lg:gap-5 lg:overflow-hidden lg:pb-1 lg:snap-none lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
                  style={{ width: `${100 / totalPages}%` }}
                >
                  {chunk.map((p) => (
                    <HotProductCard key={p.id} p={p} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {canNext ? (
            <button
              type="button"
              onClick={goNext}
              aria-label="Next 6 products"
              className="relative z-20 inline-flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03] transition duration-200 ease-out hover:scale-105 hover:border-slate-300/90 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md hover:shadow-slate-900/[0.08] motion-reduce:hover:scale-100"
            >
              <Chevron dir="right" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
