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

export function ProductPdpHeroPricing({ product }: Props) {
  if (product.isOfferless) {
    return (
      <aside className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-zinc-800">{PDP_UNAVAILABLE_MESSAGE}</p>
      </aside>
    );
  }

  const shopRows = derivePdpShopRows(product);
  const { visibleOffers, remainingStoreCount } = derivePdpHeroPriceStack(shopRows);
  const primaryOffer = product.primaryOffer ?? shopRows[0] ?? null;
  const showPrimary = showPdpPrimaryPrice(product) || primaryOffer !== null;
  const storeCount = countUniqueOfferVendors(shopRows);

  return (
    <aside className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
      {showPrimary && primaryOffer ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Από τιμή</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-800 sm:text-4xl">
            {formatPdpMoney(primaryOffer.price, primaryOffer.currency)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Καλύτερη τιμή · <span className="font-medium text-zinc-900">{primaryOffer.vendorName}</span>
          </p>
        </div>
      ) : null}

      <ProductPdpPriceStack
        offers={visibleOffers}
        primaryOfferId={product.primaryOffer?.id ?? null}
        remainingStoreCount={remainingStoreCount}
      />

      <p className="text-sm text-zinc-600">
        <span className="font-semibold text-zinc-900">{storeCount}</span>{" "}
        κατάστημα{storeCount === 1 ? "" : "τα"} ·{" "}
        <span className="font-semibold text-zinc-900">{product.activeOfferCount}</span> ενεργές προσφορές
      </p>
    </aside>
  );
}
