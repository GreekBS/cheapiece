import Link from "next/link";

import type { ProductAggregateDTO } from "@/modules/market/types/product-aggregate.dto";

type Props = {
  product: ProductAggregateDTO;
};

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

export function ProductCard({ product }: Props) {
  const { priceRange, bestOffer } = product;
  const href = `/products/${product.productId}`;
  const samePrice = priceRange.minPrice === priceRange.maxPrice;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-50">
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
            {product.totalOffers} offer{product.totalOffers === 1 ? "" : "s"}
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <span className="line-clamp-3 text-sm font-medium leading-snug text-zinc-600 group-hover:text-zinc-800">
            {product.productTitle}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-900 sm:text-base">
          {product.productTitle}
        </h2>
        {(product.productBrand || product.productModel) && (
          <p className="text-xs text-zinc-500">
            {[product.productBrand, product.productModel].filter(Boolean).join(" · ")}
          </p>
        )}
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
        <p className="text-xs text-zinc-500">{product.availableStockTotal} units across sellers</p>
      </div>
    </Link>
  );
}
