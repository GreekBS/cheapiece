import Link from "next/link";

type Props = {
  itemCount: number;
  lineCount: number;
  subtotalLabel: string;
};

export function CartSummary({ itemCount, lineCount, subtotalLabel }: Props) {
  return (
    <aside className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/[0.04] sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Σύνοψη</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">Προϊόντα</dt>
          <dd className="font-medium tabular-nums text-slate-900">{itemCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">Γραμμές καλαθιού</dt>
          <dd className="font-medium tabular-nums text-slate-900">{lineCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
          <dt className="font-semibold text-slate-900">Υποσύνολο</dt>
          <dd className="text-lg font-bold tabular-nums tracking-tight text-slate-900">{subtotalLabel}</dd>
        </div>
      </dl>
      <Link
        href="/"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
      >
        Συνέχεια αγορών
      </Link>
    </aside>
  );
}
