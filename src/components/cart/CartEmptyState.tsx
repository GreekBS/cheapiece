import Link from "next/link";

import { IconCart } from "@/components/marketplace-home/marketplace-icons";

export function CartEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200/90 bg-white px-6 py-10 text-center shadow-sm shadow-slate-900/[0.04] sm:px-8">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200/90 bg-slate-50 text-slate-400"
          aria-hidden
        >
          <IconCart className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-base font-semibold text-slate-900 sm:text-lg">Το καλάθι σου είναι άδειο</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
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
