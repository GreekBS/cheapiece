"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { removeItem, updateQuantity } from "@/actions/customer-cart";
import type { CartLineViewModel } from "@/modules/customer-cart/types/cart-line.vm";

type Props = {
  line: CartLineViewModel;
};

function LineImage({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  if (imageUrl) {
    return (
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100 sm:h-24 sm:w-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-100 text-slate-400 sm:h-24 sm:w-24"
      aria-hidden
    >
      <svg className="h-8 w-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function CartLineItem({ line }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const controlsDisabled = isPending;
  const increaseDisabled = controlsDisabled || !line.isAvailable;

  const runMutation = useCallback(
    (action: () => Promise<{ ok: boolean; message?: string }>) => {
      setErrorMessage(null);

      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          router.refresh();
          return;
        }

        setErrorMessage(result.message ?? "Δεν ήταν δυνατή η ενημέρωση του καλαθιού.");
      });
    },
    [router],
  );

  const onDecrease = useCallback(() => {
    if (controlsDisabled) {
      return;
    }

    if (line.quantity > 1) {
      runMutation(() => updateQuantity(line.offerId, line.quantity - 1));
      return;
    }

    runMutation(() => removeItem(line.offerId));
  }, [controlsDisabled, line.offerId, line.quantity, runMutation]);

  const onIncrease = useCallback(() => {
    if (increaseDisabled) {
      return;
    }

    runMutation(() => updateQuantity(line.offerId, line.quantity + 1));
  }, [increaseDisabled, line.offerId, line.quantity, runMutation]);

  const onRemove = useCallback(() => {
    if (controlsDisabled) {
      return;
    }

    runMutation(() => removeItem(line.offerId));
  }, [controlsDisabled, line.offerId, runMutation]);

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm shadow-slate-900/[0.04] sm:p-5 ${
        line.isAvailable ? "border-slate-200/90" : "border-amber-200/80 bg-slate-50/80"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link href={line.productHref} className="shrink-0">
          <LineImage imageUrl={line.imageUrl} title={line.title} />
        </Link>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <Link href={line.productHref} className="block">
              <h3 className="text-base font-semibold leading-snug text-slate-900 hover:text-slate-700">{line.title}</h3>
            </Link>
            <p className="text-sm text-slate-600">{line.vendorName}</p>
            <p className="text-sm tabular-nums text-slate-700">{line.unitPriceLabel}</p>
          </div>

          {!line.isAvailable && line.unavailabilityReason ? (
            <p className="text-sm font-medium text-amber-800">{line.unavailabilityReason}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2" aria-busy={isPending}>
              <button
                type="button"
                onClick={onDecrease}
                disabled={controlsDisabled}
                aria-label="Μείωση ποσότητας"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                −
              </button>
              <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-slate-900">
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={onIncrease}
                disabled={increaseDisabled}
                aria-label="Αύξηση ποσότητας"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <p className="text-base font-bold tabular-nums tracking-tight text-slate-900">{line.lineTotalLabel}</p>
              <button
                type="button"
                onClick={onRemove}
                disabled={controlsDisabled}
                aria-label="Αφαίρεση από καλάθι"
                className="text-sm font-medium text-slate-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Αφαίρεση
              </button>
            </div>
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
