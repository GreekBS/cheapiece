"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import { removeItem } from "@/actions/customer-cart";
import type { CartLineViewModel } from "@/modules/customer-cart/types/cart-line.vm";

type Props = {
  line: CartLineViewModel;
  onRemoved: () => void;
};

function LineImage({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  if (imageUrl) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200/90 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-100 text-slate-400"
      aria-hidden
    >
      <svg className="h-5 w-5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function CartDropdownLine({ line, onRemoved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onRemove = useCallback(() => {
    if (isPending) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await removeItem(line.offerId);
      if (result.ok) {
        onRemoved();
        return;
      }

      setErrorMessage(result.message);
    });
  }, [isPending, line.offerId, onRemoved]);

  return (
    <div
      className={`px-4 py-3 ${line.isAvailable ? "" : "bg-amber-50/60"}`}
    >
      <div className="flex gap-3">
        <Link href={line.productHref} className="shrink-0">
          <LineImage imageUrl={line.imageUrl} title={line.title} />
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={line.productHref} className="block">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 hover:text-slate-700">
              {line.title}
            </p>
          </Link>
          <p className="mt-0.5 truncate text-xs text-slate-500">{line.vendorName}</p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">
              Ποσ. <span className="font-semibold tabular-nums text-slate-900">{line.quantity}</span>
              {" · "}
              <span className="font-semibold tabular-nums text-slate-900">{line.lineTotalLabel}</span>
            </p>
            <button
              type="button"
              onClick={onRemove}
              disabled={isPending}
              aria-busy={isPending}
              aria-label="Αφαίρεση από καλάθι"
              className="text-xs font-medium text-slate-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Αφαίρεση
            </button>
          </div>
          {!line.isAvailable && line.unavailabilityReason ? (
            <p className="mt-1.5 text-xs font-medium text-amber-800">{line.unavailabilityReason}</p>
          ) : null}
          {errorMessage ? (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
