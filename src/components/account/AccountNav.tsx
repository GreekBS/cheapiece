"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/account", label: "Επισκόπηση" },
  { href: "/account/profile", label: "Προφίλ" },
  { href: "/account/favorites", label: "Αγαπημένα" },
  { href: "/account/orders", label: "Παραγγελίες" },
  { href: "/account/settings", label: "Ρυθμίσεις" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") {
    return pathname === "/account";
  }
  if (href === "/account/profile") {
    return pathname === "/account/profile";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean): string {
  return `block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
    active
      ? "bg-slate-900 text-white shadow-sm shadow-slate-900/15"
      : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-900"
  }`;
}

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Λογαριασμός" className="min-w-0">
      <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-slate-500 lg:block">Λογαριασμός</p>

      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link href={item.href} className={navLinkClass(active)} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
