import Link from "next/link";

import { formatMoney } from "@/lib/format-money";
import type { CartSnapshot } from "@/modules/customer-cart/types/cart-line.vm";

import { CartDropdownEmpty } from "./CartDropdownEmpty";
import { CartDropdownLine } from "./CartDropdownLine";
import { CartDropdownLoading } from "./CartDropdownLoading";

export const CART_DROPDOWN_PREVIEW_LINE_CAP = 5;

type Props = {
  loading: boolean;
  fetchError: string | null;
  preview: CartSnapshot | null;
  onClose: () => void;
  onPreviewInvalidate: () => void;
};

export function CartDropdownPanel({
  loading,
  fetchError,
  preview,
  onClose,
  onPreviewInvalidate,
}: Props) {
  const isEmpty = !loading && !fetchError && preview !== null && preview.lines.length === 0;
  const visibleLines = preview?.lines.slice(0, CART_DROPDOWN_PREVIEW_LINE_CAP) ?? [];
  const hiddenLineCount = preview ? Math.max(0, preview.lineCount - visibleLines.length) : 0;
  const subtotalLabel =
    preview !== null ? formatMoney(preview.subtotalAmount, preview.currency) : null;

  return (
    <div
      role="dialog"
      aria-label="Προεπισκόπηση καλαθιού"
      className="absolute right-0 top-full z-[110] mt-2 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/10"
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Καλάθι</p>
      </div>

      <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
        {isEmpty ? <CartDropdownEmpty onContinueShopping={onClose} /> : null}

        {loading ? <CartDropdownLoading /> : null}

        {fetchError && !loading ? (
          <p role="alert" className="px-4 py-6 text-center text-sm font-medium text-red-600">
            {fetchError}
          </p>
        ) : null}

        {!loading && !fetchError && preview && preview.lines.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {visibleLines.map((line) => (
              <CartDropdownLine key={line.offerId} line={line} onRemoved={onPreviewInvalidate} />
            ))}
          </div>
        ) : null}
      </div>

      {!loading && !fetchError && preview && preview.lines.length > 0 ? (
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
          {hiddenLineCount > 0 ? (
            <p className="mb-2 text-xs text-slate-600">
              +{hiddenLineCount} {hiddenLineCount === 1 ? "ακόμη γραμμή" : "ακόμη γραμμές"}
            </p>
          ) : null}
          <dl className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Προϊόντα</dt>
              <dd className="font-medium tabular-nums text-slate-900">{preview.itemCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-slate-900">Υποσύνολο</dt>
              <dd className="font-bold tabular-nums text-slate-900">{subtotalLabel}</dd>
            </div>
          </dl>
          <Link
            href="/cart"
            onClick={onClose}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Μετάβαση στο καλάθι
          </Link>
        </div>
      ) : null}
    </div>
  );
}
