import Link from "next/link";

import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { ProductPdpPriceSection } from "./pdp/ProductPdpPriceSection";

type Props = {
  product: ProductMarketViewModel;
};

function computeIdentityConfidence(product: ProductMarketViewModel): number {
  let score = 0.35;
  if (product.brand) score += 0.2;
  if (product.model) score += 0.15;
  if (product.hasPublication) score += 0.15;
  if (product.hasActiveOffers) score += 0.15;
  return Math.min(1, score);
}

export function ProductMarketDetailView({ product }: Props) {
  const confidencePct = Math.round(computeIdentityConfidence(product) * 100);
  const vendors = [
    ...new Set([...product.buyableOffers, ...product.outOfStockOffers].map((o) => o.vendorName)),
  ].sort((a, b) => a.localeCompare(b));
  const heroUrl = product.primaryImageUrl ?? product.galleryImages[0]?.url ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href="/offers"
        className="inline-flex text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
      >
        ← Back to catalog
      </Link>

      {heroUrl || product.galleryImages.length > 0 ? (
        <section className="space-y-3" aria-label="Product images">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
            {heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrl}
                alt={product.title}
                className="aspect-square w-full max-h-[28rem] object-cover object-center"
              />
            ) : (
              <div className="flex aspect-square max-h-[28rem] w-full items-center justify-center text-zinc-400">
                <span className="text-sm">No image</span>
              </div>
            )}
          </div>
          {product.galleryImages.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.galleryImages.map((img) => (
                <div
                  key={img.url}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <header className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Product</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{product.title}</h1>
        {(product.brand || product.model) && (
          <p className="text-sm text-zinc-600">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>
        )}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            <span>Identity confidence</span>
            <span className="tabular-nums text-zinc-500">{confidencePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-500"
              style={{ width: `${confidencePct}%` }}
              title="Deterministic heuristic (not ML)"
            />
          </div>
        </div>
        {!product.isOfferless ? (
          <p className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{product.activeOfferCount}</span> active offers from{" "}
            <span className="font-semibold text-zinc-900">{vendors.length}</span> sellers
            {product.buyableOfferCount < product.activeOfferCount ? (
              <span className="text-zinc-500">
                {" "}
                ({product.buyableOfferCount} in stock, {product.activeOfferCount - product.buyableOfferCount} out of
                stock)
              </span>
            ) : null}
          </p>
        ) : null}
      </header>

      <ProductPdpPriceSection product={product} />
    </div>
  );
}
