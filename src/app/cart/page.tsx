import type { Metadata } from "next";

import { getCart } from "@/actions/customer-cart";
import { CartEmptyState } from "@/components/cart/CartEmptyState";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { MarketplaceFooter } from "@/components/marketplace-home/sections/MarketplaceFooter";
import { MarketplaceNav } from "@/components/marketplace-home/sections/MarketplaceNav";
import { formatMoney } from "@/lib/format-money";

export const metadata: Metadata = {
  title: "Καλάθι",
  description: "Το καλάθι σου στο Tsipis marketplace.",
};

export default async function CartPage() {
  const cart = await getCart();
  const subtotalLabel = formatMoney(cart.subtotalAmount, cart.currency);
  const isEmpty = cart.lines.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 antialiased">
      <MarketplaceNav />
      <main className="flex flex-1 flex-col">
        {isEmpty ? (
          <CartEmptyState />
        ) : (
          <CartPageContent
            lines={cart.lines}
            itemCount={cart.itemCount}
            lineCount={cart.lineCount}
            subtotalLabel={subtotalLabel}
          />
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
