"use client";

import { useCallback, useState, useTransition } from "react";

import { toggleCustomerFavorite } from "@/actions/customer-favorites";
import { IconHeart } from "@/components/marketplace-home/marketplace-icons";

type Props = {
  productId: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
};

export function FavoriteHeartButton({ productId, initialFavorited, isAuthenticated }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isAuthenticated || isPending) {
        return;
      }

      const next = !favorited;
      setFavorited(next);

      startTransition(async () => {
        const result = await toggleCustomerFavorite(productId);
        if (!result.ok) {
          setFavorited(!next);
        } else {
          setFavorited(result.favorited);
        }
      });
    },
    [favorited, isAuthenticated, isPending, productId],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAuthenticated || isPending}
      aria-pressed={favorited}
      aria-label={favorited ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/90 bg-white/95 text-slate-500 shadow-sm shadow-slate-900/10 transition duration-200 hover:border-slate-200 hover:text-red-500 disabled:cursor-default disabled:opacity-80 ${
        favorited ? "text-red-500" : ""
      }`}
    >
      <IconHeart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
    </button>
  );
}
