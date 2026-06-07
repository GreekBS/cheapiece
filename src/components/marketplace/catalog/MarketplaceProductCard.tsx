import Link from "next/link";

import { FavoriteHeartButton } from "@/components/marketplace/favorites/FavoriteHeartButton";

import { MarketplaceProductCardQuickAddButton } from "./MarketplaceProductCardQuickAddButton";

export type MarketplaceProductCardProps = {
  href: string;
  title: string;
  brand: string | null;
  model: string | null;
  imageUrl?: string | null;
  priceLabel?: string | null;
  ctaLabel?: string;
  productId?: string;
  initialFavorited?: boolean;
  isAuthenticated?: boolean;
  showQuickAdd?: boolean;
  quickAddOfferId?: string | null;
  quickAddOfferStock?: number;
};

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400" aria-hidden>
      <svg className="h-14 w-14 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * Canonical marketplace product card (browse surfaces only — not homepage sections).
 */
export function MarketplaceProductCard({
  href,
  title,
  brand,
  model,
  imageUrl,
  priceLabel,
  ctaLabel = "Προβολή",
  productId,
  initialFavorited = false,
  isAuthenticated = false,
  showQuickAdd = false,
  quickAddOfferId = null,
  quickAddOfferStock = 0,
}: MarketplaceProductCardProps) {
  const meta = model?.trim() || null;
  const price = priceLabel?.trim() || null;

  return (
    <div className="h-full w-full max-w-[18.75rem]">
      <Link
        href={href}
        className="group flex h-full min-h-[22rem] w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.04] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md motion-reduce:transform-none motion-reduce:hover:translate-y-0"
      >
        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-zinc-100">
          {productId ? (
            <div className="absolute right-2 top-2 z-10">
              <FavoriteHeartButton
                productId={productId}
                initialFavorited={initialFavorited}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ) : null}
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- optional remote URLs; avoids next.config remotePatterns churn
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          ) : (
            <ImagePlaceholder />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2.5">
          <p className="order-1 line-clamp-1 min-h-[1.125rem] text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {brand?.trim() || "\u00a0"}
          </p>
          <h3 className="order-2 mt-1 line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug tracking-tight text-zinc-900">{title}</h3>
          {meta ? (
            <p className="order-3 mt-1 line-clamp-1 text-xs text-zinc-500">{meta}</p>
          ) : (
            <p className="order-3 mt-1 min-h-[1rem] text-xs text-transparent" aria-hidden>
              .
            </p>
          )}

          <div className="order-4 mt-auto flex flex-col gap-2 border-t border-zinc-100 pt-3">
            <p className="min-h-[1.375rem] text-sm font-semibold tabular-nums text-zinc-900">{price ?? "—"}</p>
            {showQuickAdd ? (
              <MarketplaceProductCardQuickAddButton
                offerId={quickAddOfferId}
                stock={quickAddOfferStock}
                isAuthenticated={isAuthenticated}
              >
                <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-center text-xs font-semibold text-white transition group-hover:bg-zinc-800">
                  {ctaLabel}
                </span>
              </MarketplaceProductCardQuickAddButton>
            ) : (
              <span className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-center text-xs font-semibold text-white transition group-hover:bg-zinc-800">
                {ctaLabel}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
