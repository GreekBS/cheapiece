import Link from "next/link";

import type { CatalogProductViewDTO } from "@/modules/market/types/catalog-product-view.dto";

type Props = {
  product: CatalogProductViewDTO;
  imageUrl?: string | null;
};

function ImagePlaceholder() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400"
      aria-hidden
    >
      <svg className="h-14 w-14 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  if (!Number.isFinite(amount)) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatBrandModel(brand: string | null, model: string | null) {
  const b = brand?.trim() || "";
  const m = model?.trim() || "";
  if (!b && !m) {
    return null;
  }
  return [b, m].filter(Boolean).join(" · ");
}

export function CatalogProductViewCard({ product, imageUrl }: Props) {
  const { priceRange, bestOffer, identityConfidenceScore } = product;
  const href = `/products/${product.productId}`;
  const samePrice = priceRange.minPrice === priceRange.maxPrice;
  const brandModel = formatBrandModel(product.brand, product.model);
  const confidencePct = Math.round(identityConfidenceScore * 100);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        ) : (
          <ImagePlaceholder />
        )}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
            {product.offerCount} offer{product.offerCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 shadow-sm ring-1 ring-zinc-200/80">
            {product.vendorCount} seller{product.vendorCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-900 sm:text-base">
          {product.title}
        </h2>
        {brandModel ? <p className="text-xs text-zinc-500">{brandModel}</p> : null}
        <div
          className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400"
          title="Identity match strength (deterministic heuristic)"
        >
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <span
              className="block h-full rounded-full bg-zinc-400 transition-all group-hover:bg-zinc-500"
              style={{ width: `${confidencePct}%` }}
            />
          </span>
          <span className="tabular-nums text-zinc-500">{confidencePct}%</span>
        </div>
        <div className="mt-auto space-y-1 border-t border-zinc-100 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Best price</p>
          <p className="text-lg font-bold tabular-nums text-emerald-800">
            {formatMoney(bestOffer.price, bestOffer.currency)}
          </p>
          <p className="text-sm tabular-nums text-zinc-700">
            {samePrice ? (
              <span>{formatMoney(priceRange.minPrice, priceRange.currency)}</span>
            ) : (
              <span>
                {formatMoney(priceRange.minPrice, priceRange.currency)}
                <span className="mx-1 text-zinc-400">→</span>
                {formatMoney(priceRange.maxPrice, priceRange.currency)}
              </span>
            )}
          </p>
        </div>
        <p className="truncate text-xs text-zinc-400">
          Best from <span className="font-medium text-zinc-600">{bestOffer.vendorName}</span>
        </p>
        <p className="text-xs text-zinc-500">{product.stockTotal} units across sellers</p>
      </div>
    </Link>
  );
}
