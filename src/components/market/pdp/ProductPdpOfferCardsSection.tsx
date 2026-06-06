import type { ProductMarketViewModel } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import {
  countUniqueOfferVendors,
  derivePdpShopRows,
  showPdpPrimaryPrice,
} from "./derive-pdp-pricing";
import { formatPdpMoney } from "./format-pdp-money";
import { ProductPdpOfferCard } from "./ProductPdpOfferCard";

type Props = {
  product: ProductMarketViewModel;
  isAuthenticated?: boolean;
};

export function ProductPdpOfferCardsSection({ product, isAuthenticated = false }: Props) {
  if (product.isOfferless) {
    return null;
  }

  const shopRows = derivePdpShopRows(product);
  if (shopRows.length === 0) {
    return null;
  }

  const storeCount = countUniqueOfferVendors(shopRows);
  const lowestPriceOffer = product.primaryOffer ?? shopRows[0] ?? null;
  const showLowest = showPdpPrimaryPrice(product) || lowestPriceOffer !== null;
  const productImageUrl = product.primaryImageUrl ?? product.galleryImages[0]?.url ?? null;
  const primaryOfferId = product.primaryOffer?.id ?? null;

  return (
    <section
      className="rounded-3xl border border-zinc-200/60 bg-gradient-to-b from-zinc-50/80 to-white/90 p-6 shadow-sm shadow-zinc-900/[0.03] sm:p-8"
      aria-labelledby="pdp-offers-heading"
    >
      <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/90">
            Διαθέσιμες προσφορές
          </p>
          <h2
            id="pdp-offers-heading"
            className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl sm:leading-tight"
          >
            Σύγκριση καταστημάτων
          </h2>
        </div>
        {showLowest && lowestPriceOffer ? (
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-zinc-200/50 sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Χαμηλότερη τιμή</p>
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none tracking-tight text-emerald-800">
              {formatPdpMoney(lowestPriceOffer.price, lowestPriceOffer.currency)}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-800">{storeCount}</span> κατάστημα
              {storeCount === 1 ? "" : "τα"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-600 sm:text-right">
            <span className="font-semibold text-zinc-900">{storeCount}</span> κατάστημα
            {storeCount === 1 ? "" : "τα"}
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {shopRows.map((offer) => (
          <ProductPdpOfferCard
            key={offer.id}
            offer={offer}
            productImageUrl={productImageUrl}
            productTitle={product.title}
            isBestPrice={primaryOfferId !== null && offer.id === primaryOfferId}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    </section>
  );
}
