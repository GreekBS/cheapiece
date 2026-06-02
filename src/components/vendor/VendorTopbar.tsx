"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/actions/auth";

import type { VendorNavContext } from "./VendorSidebar";

type Props = {
  vendors: VendorNavContext[];
  userEmail: string;
  onMenuClick: () => void;
};

export function VendorTopbar({ vendors, userEmail, onMenuClick }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("vendorId") ?? vendors[0]?.id;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectVendor(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("vendorId", id);
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
  }

  const activeVendor = vendors.find((v) => v.id === current);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 md:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {vendors.length > 1 ? (
          <div className="relative min-w-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex max-w-[220px] items-center gap-2 truncate rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50 md:max-w-xs"
            >
              <span className="truncate">{activeVendor?.name ?? "Select vendor"}</span>
              <span className="text-zinc-400">▾</span>
            </button>
            {open ? (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-64 min-w-[220px] overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                {vendors.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectVendor(v.id)}
                    className={[
                      "block w-full truncate px-3 py-2 text-left text-sm",
                      v.id === current ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : vendors.length === 1 ? (
          <span className="truncate text-sm font-medium text-zinc-800">{vendors[0]!.name}</span>
        ) : (
          <span className="text-sm text-zinc-500">No vendor context</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden max-w-[200px] truncate text-xs text-zinc-500 sm:inline" title={userEmail}>
          {userEmail}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
