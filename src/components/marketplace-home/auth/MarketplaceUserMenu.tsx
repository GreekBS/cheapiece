"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { customerSignOutAction } from "@/actions/customer-auth";
import { IconUser } from "@/components/marketplace-home/marketplace-icons";

type Props = {
  displayName: string;
  email: string;
  onSignOut: () => void;
};

export function MarketplaceUserMenu({ displayName, email, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const accountLabel = displayName.trim() || email.trim() || "Χρήστης";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await customerSignOutAction();
    onSignOut();
  }, [onSignOut]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-500 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Λογαριασμός — ${accountLabel}`}
      >
        <IconUser className="h-5 w-5" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[110] mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg shadow-slate-900/10"
        >
          <Link
            href="/account/profile"
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Λογαριασμός
          </Link>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            onClick={() => void handleSignOut()}
          >
            Αποσύνδεση
          </button>
        </div>
      ) : null}
    </div>
  );
}
