import type { CatalogProductRequestStatus } from "@/modules/catalog-requests/types/catalog-product-request";

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-emerald-600"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const STYLES: Record<CatalogProductRequestStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-900",
  rejected: "border-rose-200 bg-rose-50 text-rose-900",
  withdrawn: "border-slate-200 bg-slate-100 text-slate-700",
};

const LABELS: Record<CatalogProductRequestStatus, string> = {
  pending: "Εκκρεμεί",
  approved: "Εγκεκριμένη",
  rejected: "Απορρίφθηκε",
  withdrawn: "Ανακλήθηκε",
};

type Props = {
  status: CatalogProductRequestStatus;
};

export function CatalogRequestStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status === "approved" ? <CheckIcon /> : null}
      <span>{LABELS[status]}</span>
    </span>
  );
}
