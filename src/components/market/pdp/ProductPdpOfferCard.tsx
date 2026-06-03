import { StoreBrandMark } from "@/components/merchant-store/StoreBrandMark";
import type { ProductMarketOfferVM } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { ProductPdpAddToCartButton } from "./ProductPdpAddToCartButton";
import { ProductPdpOfferCardAvailability } from "./ProductPdpOfferCardAvailability";
import { formatPdpMoney } from "./format-pdp-money";

type Props = {
  offer: ProductMarketOfferVM;
  productImageUrl: string | null;
  productTitle: string;
  isBestPrice: boolean;
};

function ProductThumbnail({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  if (imageUrl) {
    return (
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-zinc-200/60 bg-zinc-100 shadow-sm sm:h-28 sm:w-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-zinc-50 to-zinc-100/90 text-zinc-400 shadow-sm sm:h-28 sm:w-28"
      aria-hidden
    >
      <svg className="h-9 w-9 opacity-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ProductPdpOfferCard({ offer, productImageUrl, productTitle, isBestPrice }: Props) {
  const outOfStock = offer.stock <= 0;
  const inStock = !outOfStock;

  return (
    <article
      className={`group flex min-h-[9.5rem] flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 ease-out hover:-translate-y-px ${
        isBestPrice
          ? "border-emerald-200/90 shadow-md shadow-emerald-900/[0.06]"
          : outOfStock
            ? "border-zinc-200/60 opacity-95 shadow-sm"
            : "border-zinc-200/60 shadow-sm hover:border-zinc-300/80 hover:shadow-xl hover:shadow-zinc-900/[0.06]"
      }`}
    >
      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <ProductThumbnail imageUrl={productImageUrl} title={productTitle} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isBestPrice ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm shadow-emerald-900/10">
                <span aria-hidden>🏆</span> Καλύτερη τιμή
              </span>
            ) : null}
            {inStock && !isBestPrice ? (
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/70">
                Διαθέσιμο
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p
              className={`order-first shrink-0 text-[2rem] font-bold leading-none tabular-nums tracking-tight sm:order-last sm:text-4xl sm:text-right ${
                isBestPrice ? "text-emerald-800" : "text-zinc-900"
              }`}
            >
              {formatPdpMoney(offer.price, offer.currency)}
            </p>

            <div className="order-last flex min-w-0 items-center gap-3 sm:order-first sm:flex-1">
              <StoreBrandMark vendorName={offer.vendorName} logoUrl={offer.vendorLogoUrl} size={40} />
              <div className="min-w-0 leading-none">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Κατάστημα</p>
                <p className="truncate pt-1 text-sm font-medium text-zinc-700">{offer.vendorName}</p>
              </div>
            </div>
          </div>

          <p className="line-clamp-1 text-sm text-zinc-500/90">{offer.title}</p>

          <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <ProductPdpOfferCardAvailability stock={offer.stock} condition={offer.condition} />
            <ProductPdpAddToCartButton className="w-full sm:w-auto sm:min-w-[11rem]" />
          </div>
        </div>
      </div>
    </article>
  );
}
