"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { addItem } from "@/actions/customer-cart";

type Props = {
  offerId: string;
  stock: number;
  isAuthenticated: boolean;
  className?: string;
};

export function ProductPdpAddToCartButton({
  offerId,
  stock,
  isAuthenticated,
  className = "",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disabled = !isAuthenticated || stock <= 0 || isPending;

  const title = !isAuthenticated
    ? "Απαιτείται σύνδεση"
    : stock <= 0
      ? "Εξαντλημένο"
      : undefined;

  const onClick = useCallback(() => {
    if (disabled) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await addItem(offerId);
      if (result.ok) {
        setSuccessMessage("Προστέθηκε στο καλάθι");
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }, [disabled, offerId, router]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-busy={isPending}
        title={title}
        className={`rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out ${
          disabled && !isPending
            ? "cursor-not-allowed opacity-50 hover:opacity-60"
            : "hover:bg-zinc-800"
        } ${isPending ? "cursor-wait opacity-80" : ""}`}
      >
        {isPending ? "Προσθήκη..." : "Προσθήκη στο καλάθι"}
      </button>
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
