import Link from "next/link";

import type { MarketOfferDTO } from "@/modules/market/types/market-offer.dto";

type Props = {
  offer: MarketOfferDTO;
};

function formatPrice(amount: number, currency: string) {
  if (!Number.isFinite(amount)) {
    return `— ${currency}`;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function stockLabel(qty: number) {
  if (qty <= 0) {
    return "Out of stock";
  }
  if (qty < 5) {
    return `Only ${qty} left`;
  }
  return "In stock";
}

export function OfferCard({ offer }: Props) {
  const href = `/products/${offer.productId}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-50">
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <span className="line-clamp-3 text-sm font-medium leading-snug text-zinc-600 group-hover:text-zinc-800">
            {offer.title}
          </span>
        </div>
        {offer.condition ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700 shadow-sm backdrop-blur">
            {offer.condition}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-900 sm:text-base">
          {offer.title}
        </h2>
        <p className="text-xs text-zinc-500">{stockLabel(offer.stock)}</p>
        <div className="mt-auto border-t border-zinc-100 pt-3">
          <p className="text-lg font-bold tabular-nums tracking-tight text-zinc-900">
            {formatPrice(offer.price, offer.currency)}
          </p>
        </div>
        <p className="truncate text-xs text-zinc-400">Sold by {offer.vendorName}</p>
      </div>
    </Link>
  );
}
