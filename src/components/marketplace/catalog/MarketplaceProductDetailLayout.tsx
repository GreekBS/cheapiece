import Link from "next/link";

import type { CatalogProductPublicRow } from "@/modules/catalog/queries/product-queries";

type Props = {
  product: CatalogProductPublicRow;
  priceLabel?: string | null;
  merchantHint?: string | null;
};

function GalleryPlaceholder() {
  return (
    <div className="flex aspect-square w-full max-w-xl items-center justify-center rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 text-zinc-400 lg:max-w-none" aria-hidden>
      <svg className="h-24 w-24 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * Marketplace-first PDP shell: gallery | info (presentation only).
 */
export function MarketplaceProductDetailLayout({ product, priceLabel, merchantHint }: Props) {
  const brandModel = [product.brand, product.model].filter(Boolean).join(" · ");
  const price = priceLabel?.trim() || null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-10">
      <div className="min-w-0">
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 lg:mx-0 lg:max-w-none">
          <GalleryPlaceholder />
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        {product.brand ? <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{product.brand}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{product.title}</h1>
        {brandModel ? <p className="text-sm text-zinc-600">{brandModel}</p> : null}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Τιμή</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{price ?? "—"}</p>
        </div>

        {merchantHint ? <p className="text-sm text-zinc-600">{merchantHint}</p> : null}

        <div className="pt-2">
          <Link
            href="/offers"
            className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Σύγκριση προσφορών
          </Link>
        </div>

        <p className="text-xs text-zinc-400">SKU · {product.slug}</p>
      </div>
    </div>
  );
}
