import Link from "next/link";

type Props = {
  onContinueShopping?: () => void;
};

export function CartDropdownEmpty({ onContinueShopping }: Props) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-900">Το καλάθι σου είναι άδειο</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-slate-600">
        Περιήγησε στο marketplace και πρόσθεσε προϊόντα από τη σελίδα προϊόντος.
      </p>
      <Link
        href="/"
        onClick={onContinueShopping}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Αναζήτηση προϊόντων
      </Link>
    </div>
  );
}
