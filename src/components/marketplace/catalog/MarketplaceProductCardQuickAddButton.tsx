"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";

import { addItem } from "@/actions/customer-cart";
import { IconCart } from "@/components/marketplace-home/marketplace-icons";

type Props = {
  children: ReactNode;
  offerId: string | null;
  stock: number;
  isAuthenticated: boolean;
};

export function MarketplaceProductCardQuickAddButton({
  children,
  offerId,
  stock,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lockRef = useRef(false);

  const disabled = !isAuthenticated || !offerId || stock <= 0 || isPending;

  const title = !isAuthenticated
    ? "Απαιτείται σύνδεση"
    : !offerId || stock <= 0
      ? "Εξαντλημένο"
      : undefined;

  const ariaLabel = isPending ? "Προσθήκη..." : "Προσθήκη στο καλάθι";

  const onClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || lockRef.current || !offerId) {
        return;
      }

      lockRef.current = true;
      setErrorMessage(null);
      setSuccessMessage(null);

      startTransition(async () => {
        try {
          const result = await addItem(offerId);
          if (result.ok) {
            setSuccessMessage("Προστέθηκε στο καλάθι");
            router.refresh();
            return;
          }

          setErrorMessage(result.message);
        } finally {
          lockRef.current = false;
        }
      });
    },
    [disabled, offerId, router],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        {children}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-busy={isPending}
          aria-label={ariaLabel}
          title={title}
          className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition duration-200 ${
            disabled && !isPending
              ? "cursor-not-allowed opacity-50"
              : "hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          } ${isPending ? "cursor-wait opacity-80" : ""}`}
        >
          <IconCart className="h-4 w-4" />
        </button>
      </div>
      {successMessage ? (
        <p role="status" className="text-xs font-medium text-emerald-700">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
