"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  merchantStoreHomePath,
  merchantStoreOffersPath,
  merchantStoreSettingsPath,
} from "@/lib/merchant/merchant-store-paths";

export type VendorNavContext = {
  id: string;
  name: string;
};

type Props = {
  vendors: VendorNavContext[];
  open: boolean;
  onNavigate?: () => void;
};

export function VendorSidebar({ vendors, open, onNavigate }: Props) {
  const pathname = usePathname();
  const vendorId = vendors[0]?.id;

  const nav = vendorId
    ? [
        { href: merchantStoreHomePath(vendorId), label: "Store home", match: (p: string) => p.includes(`/merchant/stores/${vendorId}`) },
        { href: merchantStoreOffersPath(vendorId), label: "Offers", match: (p: string) => p.includes(`/merchant/stores/${vendorId}/offers`) },
        { href: merchantStoreSettingsPath(vendorId), label: "Settings", match: (p: string) => p.includes(`/merchant/stores/${vendorId}/settings`) },
      ]
    : [{ href: "/merchant", label: "Merchant sign-in", match: (p: string) => p.startsWith("/merchant") }];

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform md:static md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      ].join(" ")}
    >
      <div className="flex h-14 items-center border-b border-zinc-100 px-5">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Vendor</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={[
                "flex flex-col rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
              ].join(" ")}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/merchant/onboarding"
          onClick={onNavigate}
          className={[
            "flex flex-col rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname.startsWith("/merchant/onboarding")
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
          ].join(" ")}
        >
          <span>Create store</span>
          <span className="mt-0.5 text-xs font-normal text-zinc-400">Onboarding</span>
        </Link>
      </nav>
      <div className="border-t border-zinc-100 p-3">
        <Link
          href="/offers"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          Marketplace
        </Link>
      </div>
    </aside>
  );
}
