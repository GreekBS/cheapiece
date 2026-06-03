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
};

export function ProductPdpOfferCardsSection({ product }: Props) {
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
    <section className="space-y-4" aria-labelledby="pdp-offers-heading">
      <div className="space-y-1">
        <h2 id="pdp-offers-heading" className="text-lg font-semibold text-zinc-900 sm:text-xl">
          Σύγκριση καταστημάτων
        </h2>
        {showLowest && lowestPriceOffer ? (
          <p className="text-sm text-zinc-600">
            Χαμηλότερη τιμή{" "}
            <span className="font-bold tabular-nums text-emerald-800">
              {formatPdpMoney(lowestPriceOffer.price, lowestPriceOffer.currency)}
            </span>
            {" · "}
            <span className="font-semibold text-zinc-900">{storeCount}</span> κατάστημα
            {storeCount === 1 ? "" : "τα"}
          </p>
        ) : (
          <p className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{storeCount}</span> κατάστημα
            {storeCount === 1 ? "" : "τα"}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {shopRows.map((offer) => (
          <ProductPdpOfferCard
            key={offer.id}
            offer={offer}
            productImageUrl={productImageUrl}
            productTitle={product.title}
            isBestPrice={primaryOfferId !== null && offer.id === primaryOfferId}
          />
        ))}
      </div>
    </section>
  );
}
