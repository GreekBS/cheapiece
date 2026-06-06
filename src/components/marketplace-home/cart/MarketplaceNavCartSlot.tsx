"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCart } from "@/actions/customer-cart";
import { IconCart } from "@/components/marketplace-home/marketplace-icons";
import type { CartSnapshot } from "@/modules/customer-cart/types/cart-line.vm";

import { CartDropdownPanel } from "./CartDropdownPanel";

type Props = {
  initialItemCount: number;
};

function badgeDisplay(count: number): string {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

export function MarketplaceNavCartSlot({ initialItemCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CartSnapshot | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const previewCountRef = useRef<number | null>(null);

  const invalidatePreview = useCallback(() => {
    setPreview(null);
    previewCountRef.current = null;
  }, []);

  useEffect(() => {
    if (previewCountRef.current !== null && previewCountRef.current !== initialItemCount) {
      invalidatePreview();
    }
  }, [initialItemCount, invalidatePreview]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (preview !== null && previewCountRef.current === initialItemCount) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    void getCart()
      .then((cart) => {
        if (cancelled) {
          return;
        }
        setPreview(cart);
        previewCountRef.current = initialItemCount;
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setFetchError("Δεν ήταν δυνατή η φόρτωση του καλαθιού.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, initialItemCount, preview]);

  const onToggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
  }, []);

  const onPreviewInvalidate = useCallback(() => {
    invalidatePreview();
    router.refresh();
  }, [invalidatePreview, router]);

  const cartAriaLabel =
    initialItemCount > 0 ? `Καλάθι — ${initialItemCount} προϊόντα` : "Καλάθι";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex rounded-xl border border-slate-200/90 bg-white p-2 text-slate-500 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={cartAriaLabel}
      >
        <IconCart className="h-5 w-5" />
        {initialItemCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold leading-none text-white">
            {badgeDisplay(initialItemCount)}
          </span>
        ) : null}
      </button>

      {open ? (
        <CartDropdownPanel
          loading={loading}
          fetchError={fetchError}
          preview={preview}
          onClose={onClose}
          onPreviewInvalidate={onPreviewInvalidate}
        />
      ) : null}
    </div>
  );
}
