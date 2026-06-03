import Link from "next/link";

import { StoreBrandMark } from "@/components/merchant-store/StoreBrandMark";
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
  const inStock = offer.stock > 0;

  return (
    <Link
      href={href}
      className="group flex h-full min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-px hover:border-zinc-300/80 hover:shadow-xl hover:shadow-zinc-900/[0.06]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-zinc-50 via-zinc-100/80 to-zinc-50">
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center transition-colors duration-300 group-hover:bg-white/10">
          <span className="line-clamp-3 text-sm font-medium leading-snug text-zinc-600 group-hover:text-zinc-800">
            {offer.title}
          </span>
        </div>
        {offer.condition ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold capitalize text-zinc-700 shadow-sm ring-1 ring-zinc-200/60">
            {offer.condition}
          </span>
        ) : null}
        {inStock ? (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-600/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm shadow-emerald-900/10">
            Available
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-900 sm:text-base">
          {offer.title}
        </h2>
        <p className={`text-xs font-medium ${inStock ? "text-emerald-700/90" : "text-zinc-500"}`}>
          {stockLabel(offer.stock)}
        </p>
        <div className="mt-auto space-y-3 border-t border-zinc-100/80 pt-4">
          <p className="text-2xl font-bold leading-none tabular-nums tracking-tight text-zinc-900">
            {formatPrice(offer.price, offer.currency)}
          </p>
          <div className="flex items-center gap-2.5">
            <StoreBrandMark vendorName={offer.vendorName} logoUrl={offer.vendorLogoUrl} size={32} />
            <div className="min-w-0 leading-none">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sold by</p>
              <p className="truncate pt-1 text-xs font-medium text-zinc-700">{offer.vendorName}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
