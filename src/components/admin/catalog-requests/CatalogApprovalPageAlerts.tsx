import Link from "next/link";

import type { CatalogApprovalRecommendation } from "@/modules/catalog-requests/variant-dedup";

type Props = {
  recommendation: CatalogApprovalRecommendation;
  candidateProductLabel?: string | null;
};

export function CatalogApprovalPageAlerts({ recommendation, candidateProductLabel }: Props) {
  const hasSibling = recommendation.pendingSiblingRequestIds.length > 0;
  const hasTenantMatch = Boolean(recommendation.tenantCatalogStrictMatchProductId);

  if (!hasSibling && !hasTenantMatch) {
    return null;
  }

  return (
    <div className="space-y-2">
      {hasSibling ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Εκκρεμείς αδελφές αιτήσεις (ίδια παραλλαγή)</p>
          <p className="mt-1 text-xs sm:text-sm">
            Προτιμήστε σύνδεση με υπάρχον προϊόν. Η δημιουργία νέου απαιτεί ρητή εξαίρεση.
          </p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            {recommendation.pendingSiblingRequestIds.map((id) => (
              <Link
                key={id}
                href={`/admin/catalog-requests/${id}`}
                className="font-medium underline"
              >
                Αίτηση {id.slice(0, 8)}…
              </Link>
            ))}
          </p>
        </div>
      ) : null}

      {hasTenantMatch ? (
        <div
          className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-950"
          role="alert"
        >
          <p className="font-semibold">Ο κατάλογος tenant περιέχει ήδη ίδια παραλλαγή</p>
          <p className="mt-1 text-xs sm:text-sm">
            Η σύνδεση αποφεύγει διπλότυπο προϊόν καταλόγου. Η δημιουργία νέου απαιτεί επιβεβαίωση
            override.
          </p>
          {recommendation.tenantCatalogStrictMatchProductId ? (
            <p className="mt-2 text-xs">
              <Link
                href={`/admin/products/${recommendation.tenantCatalogStrictMatchProductId}`}
                className="font-medium underline"
              >
                {candidateProductLabel ??
                  recommendation.tenantCatalogStrictMatchProductId}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
