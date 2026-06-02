import type { ProductMarketOfferVM } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { formatPdpMoney } from "./format-pdp-money";

type Props = {
  offers: ProductMarketOfferVM[];
  primaryOfferId: string | null;
};

function availabilityLabel(stock: number) {
  return stock > 0 ? "Διαθέσιμο" : "Εξαντλημένο";
}

export function ProductPdpShopList({ offers, primaryOfferId }: Props) {
  if (offers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-900">Καταστήματα</h3>
      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white" role="list">
        {offers.map((offer) => {
          const isBest = primaryOfferId !== null && offer.id === primaryOfferId;
          const inStock = offer.stock > 0;

          return (
            <li
              key={offer.id}
              className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                isBest ? "bg-emerald-50/70" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900">{offer.vendorName}</p>
                <p
                  className={`mt-0.5 text-xs font-medium ${
                    inStock ? "text-emerald-700" : "text-zinc-500"
                  }`}
                >
                  {availabilityLabel(offer.stock)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:text-right">
                <span className="text-base font-bold tabular-nums text-zinc-900">
                  {formatPdpMoney(offer.price, offer.currency)}
                </span>
                {isBest ? (
                  <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                    Καλύτερη τιμή
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
