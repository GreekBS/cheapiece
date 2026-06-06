import Link from "next/link";

import { IconCart } from "@/components/marketplace-home/marketplace-icons";

export function CartEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
      <div className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Το καλάθι σου είναι άδειο</h1>
        <div
          className="mt-8 flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.03]"
          aria-hidden
        >
          <IconCart className="h-14 w-14 text-slate-400" />
        </div>
        <p className="mx-auto mt-6 max-w-sm text-sm text-slate-600">
          Περιήγησε στο marketplace και πρόσθεσε προϊόντα στο καλάθι σου από τη σελίδα προϊόντος.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-slate-900/15 transition hover:bg-slate-800"
        >
          Αναζήτηση προϊόντων
        </Link>
      </div>
    </div>
  );
}
