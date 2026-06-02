import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketplaceFooter } from "@/components/marketplace-home/sections/MarketplaceFooter";
import { MarketplaceNav } from "@/components/marketplace-home/sections/MarketplaceNav";
import { getHomeMockProduct, homeMockProductParamList } from "@/lib/home-mock-product-pdp";

type Props = { params: { productId: string } };

export function generateStaticParams() {
  return homeMockProductParamList();
}

export function generateMetadata({ params }: Props): Metadata {
  const p = getHomeMockProduct(params.productId);
  if (!p) return { title: "Προϊόν" };
  return { title: p.title };
}

export default function HomeMockProductPage({ params }: Props) {
  const product = getHomeMockProduct(params.productId);
  if (!product) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 antialiased">
      <MarketplaceNav />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-100 via-white to-cyan-50/50 shadow-sm shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.03] lg:aspect-square lg:sticky lg:top-24">
              <div className="absolute inset-0 flex items-center justify-center text-slate-400/90">
                <svg className="h-24 w-24 opacity-50 sm:h-28 sm:w-28" viewBox="0 0 64 64" fill="none" aria-hidden>
                  <rect x="10" y="14" width="44" height="36" rx="6" stroke="currentColor" strokeWidth="2" />
                  <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              {product.badge ? (
                <span className="mb-3 inline-flex w-fit rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/90">
                  {product.badge}
                </span>
              ) : null}
              <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-[1.85rem] lg:leading-tight">
                {product.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-4xl">{product.price}</p>
                {product.oldPrice ? (
                  <p className="text-lg tabular-nums text-slate-400 line-through">{product.oldPrice}</p>
                ) : null}
              </div>

              {product.rating ? (
                <p className="mt-4 text-sm text-slate-600">
                  <span className="font-semibold text-amber-700" aria-hidden>
                    ★
                  </span>{" "}
                  <span className="font-semibold text-slate-800">{product.rating}</span>
                  {product.ratingCount ? <span className="text-slate-500"> ({product.ratingCount})</span> : null}
                </p>
              ) : null}

              {product.metaLine ? <p className="mt-2 text-sm text-slate-500">{product.metaLine}</p> : null}

              <p className="mt-6 max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">{product.description}</p>

              <div className="mt-8">
                <Link
                  href="/cart"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition duration-200 hover:bg-slate-800 sm:w-auto sm:min-w-[14rem]"
                >
                  Προσθήκη στο Καλάθι
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
