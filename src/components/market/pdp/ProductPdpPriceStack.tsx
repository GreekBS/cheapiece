import type { ProductMarketOfferVM } from "@/modules/catalog-products-read/ui/dto/product-market.vm";

import { formatPdpMoney } from "./format-pdp-money";

type Props = {
  offers: ProductMarketOfferVM[];
  primaryOfferId: string | null;
  remainingStoreCount: number;
};

function availabilityShort(stock: number) {
  return stock > 0 ? "Διαθέσιμο" : "Εξαντλημένο";
}

export function ProductPdpPriceStack({ offers, primaryOfferId, remainingStoreCount }: Props) {
  if (offers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Σύγκριση τιμών</p>
      <ul
        className="divide-y divide-zinc-100/90 overflow-hidden rounded-xl border border-zinc-200/60 bg-white shadow-sm"
        role="list"
      >
        {offers.map((offer) => {
          const isBest = primaryOfferId !== null && offer.id === primaryOfferId;
          const inStock = offer.stock > 0;

          return (
            <li
              key={offer.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors duration-200 ease-out ${
                isBest ? "bg-emerald-50/70" : "hover:bg-zinc-50/80"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-800">{offer.vendorName}</p>
                <p className={`mt-0.5 text-xs ${inStock ? "text-emerald-700/90" : "text-zinc-500"}`}>
                  {availabilityShort(offer.stock)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`text-sm font-bold tabular-nums tracking-tight ${
                    isBest ? "text-emerald-800" : "text-zinc-900"
                  }`}
                >
                  {formatPdpMoney(offer.price, offer.currency)}
                </span>
                {isBest ? (
                  <span className="rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm">
                    BEST
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {remainingStoreCount > 0 ? (
        <p className="text-xs font-medium text-zinc-500">
          +{remainingStoreCount} ακόμη κατάστημα{remainingStoreCount === 1 ? "" : "τα"}
        </p>
      ) : null}
    </div>
  );
}
