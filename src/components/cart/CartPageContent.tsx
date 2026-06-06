import type { CartLineViewModel } from "@/modules/customer-cart/types/cart-line.vm";

import { CartLineItem } from "./CartLineItem";
import { CartSummary } from "./CartSummary";

type Props = {
  lines: CartLineViewModel[];
  itemCount: number;
  lineCount: number;
  subtotalLabel: string;
};

export function CartPageContent({ lines, itemCount, lineCount, subtotalLabel }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200/80 pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Καλάθι</h1>
        <p className="mt-2 text-sm text-slate-600">
          {itemCount} {itemCount === 1 ? "προϊόν" : "προϊόντα"} · {lineCount}{" "}
          {lineCount === 1 ? "γραμμή" : "γραμμές"}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-start">
        <ul className="space-y-4" aria-label="Προϊόντα στο καλάθι">
          {lines.map((line) => (
            <li key={line.offerId}>
              <CartLineItem line={line} />
            </li>
          ))}
        </ul>

        <CartSummary itemCount={itemCount} lineCount={lineCount} subtotalLabel={subtotalLabel} />
      </div>
    </div>
  );
}
