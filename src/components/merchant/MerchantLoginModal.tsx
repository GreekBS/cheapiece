"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { useFormState } from "react-dom";

import { signInWithPasswordAction, type AuthFormState } from "@/actions/auth";
import { dsInput, dsLabel, dsMuted, dsPrimaryButtonLg } from "@/components/ui/merchant-ds";

type Props = {
  open: boolean;
  onClose: () => void;
  returnUrlHint?: string;
};

export function MerchantLoginModal({ open, onClose, returnUrlHint }: Props) {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useFormState(signInWithPasswordAction, null as AuthFormState | null);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => firstFieldRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onOverlayPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const stopPanelPointerBubble = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onPointerDown={onOverlayPointerDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8"
        onPointerDown={stopPanelPointerBubble}
      >
        <h2 id={titleId} className="text-xl font-semibold tracking-tight text-gray-900">
          Σύνδεση
        </h2>
        <p className={`${dsMuted} mt-1 text-sm`}>Συνδεθείτε για να διαχειριστείτε το κατάστημά σας.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value="/merchant" />
          {returnUrlHint ? <input type="hidden" name="returnUrl" value={returnUrlHint} /> : null}
          {state && !state.ok ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.message}</div>
          ) : null}

          <label className={dsLabel}>
            Email
            <input
              ref={firstFieldRef}
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`mt-1 ${dsInput}`}
            />
          </label>

          <label className={dsLabel}>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={`mt-1 ${dsInput}`}
            />
          </label>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="order-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:order-1"
            >
              Ακύρωση
            </button>
            <button type="submit" className={`${dsPrimaryButtonLg} order-1 w-full sm:order-2 sm:w-auto`}>
              Sign in
            </button>
          </div>

          <p className={`${dsMuted} text-xs`}>
            Need access? Contact your platform administrator to enable merchant permissions for your account.
          </p>
        </form>
      </div>
    </div>
  );
}
