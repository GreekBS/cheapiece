import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import {
  PDP_UNAVAILABLE_MESSAGE,
  countUniqueOfferVendors,
  derivePdpHeroPriceStack,
  derivePdpShopRows,
  showPdpPrimaryPrice,
} from "./derive-pdp-pricing";
import { formatPdpMoney } from "./format-pdp-money";
import { ProductPdpPriceStack } from "./ProductPdpPriceStack";

type Props = {
  product: ProductMarketViewModel;
};

function OfferlessPanel() {
  return (
    <aside className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-md shadow-zinc-900/[0.04] sm:p-8">
      <div className="flex gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200/60"
          aria-hidden
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6.75h-3m3 0a1.5 1.5 0 0 1 1.5 1.5v1.5m-4.5-3v1.5a1.5 1.5 0 0 0 1.5 1.5m-9 3.75h12M6 19.5h12a1.5 1.5 0 0 0 1.5-1.5V9.75a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 9.75v8.25A1.5 1.5 0 0 0 6 19.5Z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold tracking-tight text-zinc-900">Δεν υπάρχουν προσφορές ακόμα</p>
          <p className="text-sm leading-relaxed text-zinc-600">{PDP_UNAVAILABLE_MESSAGE}</p>
        </div>
      </div>
    </aside>
  );
}

export function ProductPdpHeroPricing({ product }: Props) {
  if (product.isOfferless) {
    return <OfferlessPanel />;
  }

  const shopRows = derivePdpShopRows(product);
  const { visibleOffers, remainingStoreCount } = derivePdpHeroPriceStack(shopRows);
  const primaryOffer = product.primaryOffer ?? shopRows[0] ?? null;
  const showPrimary = showPdpPrimaryPrice(product) || primaryOffer !== null;
  const storeCount = countUniqueOfferVendors(shopRows);

  return (
    <aside className="space-y-6 rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-lg shadow-zinc-900/[0.05] sm:p-8 lg:sticky lg:top-8">
      {showPrimary && primaryOffer ? (
        <div className="space-y-3 border-b border-zinc-100/90 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Από τιμή</p>
          <p className="text-4xl font-bold tabular-nums leading-none tracking-tight text-emerald-800 sm:text-[2.75rem]">
            {formatPdpMoney(primaryOffer.price, primaryOffer.currency)}
          </p>
          <p className="text-sm leading-snug text-zinc-600">
            Καλύτερη τιμή ·{" "}
            <span className="font-medium text-zinc-800">{primaryOffer.vendorName}</span>
          </p>
        </div>
      ) : null}

      <ProductPdpPriceStack
        offers={visibleOffers}
        primaryOfferId={product.primaryOffer?.id ?? null}
        remainingStoreCount={remainingStoreCount}
      />

      <p className="rounded-xl bg-zinc-50/90 px-4 py-3 text-sm leading-relaxed text-zinc-600 ring-1 ring-zinc-100/80">
        <span className="font-semibold text-zinc-900">{storeCount}</span> κατάστημα
        {storeCount === 1 ? "" : "τα"} ·{" "}
        <span className="font-semibold text-zinc-900">{product.activeOfferCount}</span> ενεργές προσφορές
      </p>
    </aside>
  );
}
