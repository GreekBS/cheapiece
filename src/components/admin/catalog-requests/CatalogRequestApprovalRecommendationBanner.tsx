import Link from "next/link";

import {
  formatApprovalRecommendationReasons,
  type CatalogApprovalRecommendation,
} from "@/modules/catalog-requests/variant-dedup";

type Props = {
  recommendation: CatalogApprovalRecommendation;
  candidateProductLabel?: string | null;
};

export function CatalogRequestApprovalRecommendationBanner({
  recommendation,
  candidateProductLabel,
}: Props) {
  const reasonLabels = formatApprovalRecommendationReasons(recommendation.reasons);

  if (recommendation.mode === "create" && reasonLabels.length === 0) {
    return null;
  }

  const tone =
    recommendation.mode === "link"
      ? "border-violet-300 bg-gradient-to-br from-violet-50 to-violet-100/80 text-violet-950 shadow-sm"
      : recommendation.mode === "create"
        ? "border-slate-200 bg-slate-50 text-slate-900"
        : "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/60 text-amber-950 shadow-sm";

  const title =
    recommendation.mode === "link"
      ? "Το σύστημα προτείνει ΣΥΝΔΕΣΗ — όχι δημιουργία νέου προϊόντος"
      : recommendation.mode === "create"
        ? "Δημιουργία νέου προϊόντος (χωρίς ταύτιση καταλόγου)"
        : "Απαιτείται κρίση: πιθανό υπάρχον προϊόν";

  const icon =
    recommendation.mode === "link" ? "🔗" : recommendation.mode === "review" ? "🔍" : "➕";

  return (
    <div className={`rounded-xl border px-4 py-4 text-sm ${tone}`} role="status">
      <p className="flex items-start gap-2 font-semibold">
        <span aria-hidden>{icon}</span>
        <span>{title}</span>
      </p>
      {reasonLabels.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs sm:text-sm">
          {reasonLabels.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {recommendation.candidateProductId ? (
        <p className="mt-3 text-sm">
          <span className="text-xs text-violet-800/80">Προτεινόμενο προϊόν: </span>
          <Link
            href={`/admin/products/${recommendation.candidateProductId}`}
            className="font-semibold underline"
          >
            {candidateProductLabel ?? recommendation.candidateProductId}
          </Link>
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
        {recommendation.mode === "link" ? (
          <a href="#approval-link-section" className="text-violet-900 underline">
            Μετάβαση στη σύνδεση ↓
          </a>
        ) : null}
        {(recommendation.mode === "link" || recommendation.mode === "review") &&
        showCreateExceptionLink(recommendation) ? (
          <a href="#approval-create-section" className="text-slate-700 underline">
            Δείτε εξαίρεση δημιουργίας ↓
          </a>
        ) : null}
      </div>
    </div>
  );
}

function showCreateExceptionLink(recommendation: CatalogApprovalRecommendation): boolean {
  return (
    recommendation.mode === "link" ||
    recommendation.pendingSiblingRequestIds.length > 0 ||
    Boolean(recommendation.tenantCatalogStrictMatchProductId)
  );
}
