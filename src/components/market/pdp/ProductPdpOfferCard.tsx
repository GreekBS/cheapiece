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
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 sm:h-24 sm:w-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400 sm:h-24 sm:w-24"
      aria-hidden
    >
      <svg className="h-8 w-8 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ProductPdpOfferCard({ offer, productImageUrl, productTitle, isBestPrice }: Props) {
  const outOfStock = offer.stock <= 0;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        isBestPrice
          ? "border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200"
          : outOfStock
            ? "border-zinc-200 opacity-90"
            : "border-zinc-200"
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <ProductThumbnail imageUrl={productImageUrl} title={productTitle} />

        <div className="min-w-0 flex-1 space-y-3">
          {isBestPrice ? (
            <span className="inline-flex w-fit items-center rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
              🏆 Καλύτερη τιμή
            </span>
          ) : null}

          <div className="flex items-center gap-2.5">
            <StoreBrandMark vendorName={offer.vendorName} logoUrl={offer.vendorLogoUrl} size={36} />
            <p className="truncate text-sm font-semibold text-zinc-900">{offer.vendorName}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium leading-snug text-zinc-800 sm:text-lg">{offer.title}</h3>
            <p
              className={`text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${
                isBestPrice ? "text-emerald-800" : "text-zinc-900"
              }`}
            >
              {formatPdpMoney(offer.price, offer.currency)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ProductPdpOfferCardAvailability stock={offer.stock} condition={offer.condition} />
            <ProductPdpAddToCartButton className="w-full sm:w-auto sm:min-w-[11rem]" />
          </div>
        </div>
      </div>
    </article>
  );
}
