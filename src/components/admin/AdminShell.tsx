"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Προϊόντα" },
  { href: "/admin/catalog-requests", label: "Αιτήσεις καταλόγου" },
  { href: "/admin/catalog-schema", label: "Catalog Schema" },
  { href: "/admin/stores", label: "Καταστήματα" },
  { href: "/admin/users", label: "Χρήστες" },
  { href: "/admin/orders", label: "Παραγγελίες / Αγορές" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/click-tracking", label: "Click Tracking" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Ρυθμίσεις" },
];

function titleForPath(pathname: string): string {
  const hit = NAV.find((n) =>
    n.href === "/admin" ? pathname === "/admin" : pathname === n.href || pathname.startsWith(`${n.href}/`),
  );
  return hit?.label ?? "Admin";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const title = titleForPath(pathname ?? "");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const linkActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname?.startsWith(`${href}/`));

  const isBlueHeader =
    pathname === "/admin/products" ||
    pathname?.startsWith("/admin/products/") ||
    pathname === "/admin/catalog-requests" ||
    pathname?.startsWith("/admin/catalog-requests/");

  const headerAccent = isBlueHeader
    ? "border-b-blue-500/70 shadow-[inset_0_-3px_0_0_rgba(59,130,246,0.55)]"
    : "border-b-red-500/55 shadow-[inset_0_-3px_0_0_rgba(239,68,68,0.45)]";

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 antialiased">
      {open ? (
        <button type="button" className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden" aria-label="Κλείσιμο μενού" onClick={close} />
      ) : null}

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-200 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-800/90 px-4">
          <span className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">Admin</span>
          <span className="text-sm font-semibold text-white">Tsipis</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Διαχείριση">
          {NAV.map((item) => {
            const active = linkActive(item.href);
            const isProducts = item.href === "/admin/products" || item.href === "/admin/catalog-requests";
            const linkClass = isProducts
              ? active
                ? "border-2 border-blue-400/70 bg-blue-600/25 text-white shadow-sm shadow-blue-950/40 ring-1 ring-blue-400/30"
                : "border-l-4 border-blue-500 text-blue-100 hover:bg-blue-950/50 hover:text-white"
              : active
                ? "border-2 border-red-500/60 bg-red-950/45 text-red-50 shadow-sm shadow-red-950/30 ring-1 ring-red-500/25"
                : "border-l-4 border-red-600/80 text-red-100/90 hover:bg-red-950/35 hover:text-red-50";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${linkClass}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="border-t border-red-900/40 bg-red-950/20 p-4 text-[11px] leading-relaxed text-red-300/90">
          Mock UI · χωρίς σύνδεση backend
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-0">
        <header
          className={`sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/90 bg-white/95 px-4 shadow-sm shadow-slate-900/[0.04] backdrop-blur-md sm:px-6 ${headerAccent}`}
        >
          <button
            type="button"
            className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 lg:hidden"
            aria-expanded={open}
            aria-controls="admin-sidebar"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h1>
        </header>
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
