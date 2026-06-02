import Link from "next/link";

import type { ProductMatchLabel } from "@/modules/catalog-request-matching/queries/fetch-product-match-labels";

type Props = {
  product: ProductMatchLabel;
  matchStatus?: "strict_match" | "mismatch" | "sparse_request" | "sparse_both" | null;
};

export function RecommendedProductPreviewCard({ product, matchStatus }: Props) {
  return (
    <div className="rounded-lg border border-violet-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Προτεινόμενο προϊόν σύνδεσης
        </span>
        {matchStatus === "strict_match" ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
            ✓ Ίδια παραλλαγή — ασφαλής σύνδεση
          </span>
        ) : null}
      </div>
      <p className="font-semibold text-slate-900">{product.title}</p>
      <p className="text-sm text-slate-600">
        {[product.brand, product.model].filter(Boolean).join(" · ") || "—"}
      </p>
      <Link
        href={`/admin/products/${product.id}`}
        className="mt-2 inline-block text-xs font-medium text-violet-800 underline"
      >
        Προβολή στον κατάλογο
      </Link>
    </div>
  );
}
