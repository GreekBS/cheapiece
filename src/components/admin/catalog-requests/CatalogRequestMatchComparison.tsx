import type { AdminRequestPreviewVM } from "@/modules/catalog-products-read/ui/dto/admin-request-preview.vm";
import type { CatalogRequestMatchRow } from "@/modules/catalog-request-matching/queries/fetch-catalog-request-match";
import type { ProductMatchLabel } from "@/modules/catalog-request-matching/queries/fetch-product-match-labels";

type Props = {
  preview: AdminRequestPreviewVM;
  match: CatalogRequestMatchRow | null;
  suggestedProduct: ProductMatchLabel | null;
  merchantSelectedProduct: ProductMatchLabel | null;
};

function ProductCard({
  heading,
  product,
  confidence,
  reasons,
  badge,
}: {
  heading: string;
  product: ProductMatchLabel;
  confidence?: number | null;
  reasons?: string[];
  badge?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{heading}</h3>
        {badge ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
            {badge}
          </span>
        ) : null}
        {confidence != null ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
            {Math.round(confidence * 100)}%
          </span>
        ) : null}
      </div>
      <p className="font-medium text-slate-900">{product.title}</p>
      <p className="text-sm text-slate-600">
        {[product.brand, product.model].filter(Boolean).join(" · ") || "—"}
      </p>
      {reasons && reasons.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {reasons.map((r) => (
            <span
              key={r}
              className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-slate-200"
            >
              {r}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExplainBreakdown({ match }: { match: CatalogRequestMatchRow }) {
  const b = match.score_breakdown;
  return (
    <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
      <div>Τίτλος: {Math.round(b.title_similarity * 100)}%</div>
      <div>Μάρκα: {b.brand_exact ? "ακριβής" : "—"}</div>
      <div>Μοντέλο: {b.model_exact ? "ακριβές" : "—"}</div>
      <div>Χαρακτηριστικά: {Math.round(b.attribute_overlap * 100)}%</div>
    </dl>
  );
}

export function CatalogRequestMatchComparison({
  preview,
  match,
  suggestedProduct,
  merchantSelectedProduct,
}: Props) {
  if (!match) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600">
        Δεν υπάρχουν δεδομένα ταξινόμησης για αυτή την αίτηση.
      </section>
    );
  }

  const merchantDiffers =
    match.merchant_selected_product_id &&
    match.suggested_product_id &&
    match.merchant_selected_product_id !== match.suggested_product_id;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Σύγκριση ταξινόμησης</h2>
      <p className="text-xs text-slate-500">
        Η ταξινόμηση είναι ξεχωριστή από την έγκριση αίτησης. Κατάσταση ταξινόμησης:{" "}
        <strong>{match.match_review_status}</strong>
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Αίτηση καταστήματος</p>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{preview.scalars.title}</p>
            <p className="text-sm text-slate-600">
              {[preview.scalars.brand, preview.scalars.model].filter(Boolean).join(" · ") || "—"}
            </p>
            <p className="mt-2 text-xs text-slate-500">Κατάστημα: {preview.vendorLabel}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Αντιστοίχιση καταλόγου</p>

          {suggestedProduct ? (
            <ProductCard
              heading="Πρόταση συστήματος"
              product={suggestedProduct}
              confidence={match.confidence}
              reasons={match.match_reasons}
            />
          ) : (
            <p className="text-sm text-slate-600">Δεν υπήρχε πρόταση συστήματος κατά την υποβολή.</p>
          )}

          {merchantSelectedProduct ? (
            <ProductCard
              heading={merchantDiffers ? "Επιλογή καταστήματος" : "Επιλογή καταστήματος (ίδια με πρόταση)"}
              product={merchantSelectedProduct}
              badge="Επιλέχθηκε από κατάστημα"
            />
          ) : (
            <p className="text-sm text-slate-500">Το κατάστημα δεν επιβεβαίωσε αντιστοίχιση.</p>
          )}

          {merchantDiffers ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
              Η επιλογή καταστήματος διαφέρει από την πρόταση συστήματος.
            </p>
          ) : null}

          <ExplainBreakdown match={match} />
        </div>
      </div>
    </section>
  );
}
