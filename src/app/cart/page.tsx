import type { Metadata } from "next";

import { IconCart } from "@/components/marketplace-home/marketplace-icons";
import { MarketplaceFooter } from "@/components/marketplace-home/sections/MarketplaceFooter";
import { MarketplaceNav } from "@/components/marketplace-home/sections/MarketplaceNav";

export const metadata: Metadata = {
  title: "Καλάθι",
  description: "Το καλάθι σου στο Tsipis marketplace.",
};

/** Placeholder: replace with real cart state when backend is wired. */
const MOCK_CART_ITEM_COUNT = 0;

export default function CartPage() {
  const isEmpty = MOCK_CART_ITEM_COUNT === 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 antialiased">
      <MarketplaceNav />
      <main className="flex flex-1 flex-col">
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
            <div className="flex max-w-md flex-col items-center text-center">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Το καλάθι σου είναι άδειο</h1>
              <div
                className="mt-8 flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.03]"
                aria-hidden
              >
                <IconCart className="h-14 w-14 text-slate-400" />
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
