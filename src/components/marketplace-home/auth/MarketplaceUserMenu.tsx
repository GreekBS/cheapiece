"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { customerSignOutAction } from "@/actions/customer-auth";
import { marketplaceSignInCta } from "@/components/marketplace-home/auth/marketplace-auth-tokens";

type Props = {
  displayName: string;
  email: string;
  onSignOut: () => void;
};

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function MarketplaceUserMenu({ displayName, email, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = initialsFrom(displayName, email);

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
        className={`inline-flex max-w-[11rem] items-center gap-2 ${marketplaceSignInCta}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white"
          aria-hidden
        >
          {initials}
        </span>
        <span className="truncate">{displayName || email}</span>
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
            Το προφίλ μου
          </Link>
          <Link
            href="/account/settings"
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Ρυθμίσεις
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
