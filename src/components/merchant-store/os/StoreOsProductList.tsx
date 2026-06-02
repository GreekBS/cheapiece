"use client";

/**
 * Presentational product table — pure render layer.
 *
 * HARD RULES:
 * - MUST NOT filter, mutate, or compute product state
 * - MUST NOT call setState or touch productsState
 * - ONLY renders the pre-derived `visibleProducts` prop
 */

import { StoreOsBadge, storeOfferStateVariant } from "@/components/merchant-store/os/StoreOsBadge";
import {
  CATALOG_REJECTION_LABEL,
  canActivateOffer,
  canDeactivateOffer,
  canRemoveMerchantProduct,
  OFFER_STATE_LABELS,
  PRODUCT_STATUS_LABELS,
  type StoreOsProduct,
  type StoreOsProductTab,
} from "@/components/merchant-store/os/store-os-product-list-types";
import { storeOsCard, storeOsGhostBtn, storeOsSectionLabel } from "@/components/merchant-store/os/store-os-tokens";

type Props = {
  visibleProducts: StoreOsProduct[];
  activeTab: StoreOsProductTab;
  showToggleActions?: boolean;
  togglingProductId?: string | null;
  removingProductId?: string | null;
  onViewProduct: (product: StoreOsProduct) => void;
  onEditProduct: (product: StoreOsProduct) => void;
  onDeactivateProduct?: (product: StoreOsProduct) => void;
  onActivateProduct?: (product: StoreOsProduct) => void;
  onRemoveProduct?: (product: StoreOsProduct) => void;
};

function statusVariant(status: StoreOsProduct["status"]) {
  if (status === "active") return "active" as const;
  if (status === "pending") return "draft" as const;
  return "paused" as const;
}

function renderStatusBadge(item: StoreOsProduct) {
  if (item.requestStatus === "rejected") {
    return <StoreOsBadge variant="paused">{CATALOG_REJECTION_LABEL}</StoreOsBadge>;
  }

  if (item.offerState) {
    const label = OFFER_STATE_LABELS[item.offerState] ?? item.offerState;
    return (
      <StoreOsBadge variant={storeOfferStateVariant(item.offerState)}>{label}</StoreOsBadge>
    );
  }

  return (
    <StoreOsBadge variant={statusVariant(item.status)}>{PRODUCT_STATUS_LABELS[item.status]}</StoreOsBadge>
  );
}

function formatPrice(price: number | null, currency: string | null): string {
  if (price == null) return "—";
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: currency || "EUR" }).format(price);
}

const EMPTY_COPY: Record<StoreOsProductTab, { title: string; description: string }> = {
  active: {
    title: "Δεν υπάρχουν ενεργά προϊόντα",
    description: "Τα ενεργά προϊόντα εμφανίζονται εδώ όταν είναι διαθέσιμα στην αγορά.",
  },
  pending: {
    title: "Δεν υπάρχουν προϊόντα σε αναμονή",
    description: "Νέα προϊόντα προς έγκριση ή ολοκλήρωση εμφανίζονται σε αυτή την καρτέλα.",
  },
  inactive: {
    title: "Δεν υπάρχουν μη ενεργά προϊόντα",
    description: "Εξαντλημένα ή απενεργοποιημένα προϊόντα εμφανίζονται εδώ.",
  },
};

export function StoreOsProductList({
  visibleProducts,
  activeTab,
  showToggleActions = false,
  togglingProductId = null,
  removingProductId = null,
  onViewProduct,
  onEditProduct,
  onDeactivateProduct,
  onActivateProduct,
  onRemoveProduct,
}: Props) {
  if (visibleProducts.length === 0) {
    const copy = EMPTY_COPY[activeTab];
    return (
      <section className={`${storeOsCard} flex flex-col items-center px-6 py-16 text-center`}>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" d="M20 7H4M4 12h16M4 17h10" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{copy.description}</p>
      </section>
    );
  }

  return (
    <section className={`${storeOsCard} overflow-hidden`}>
      <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <p className={storeOsSectionLabel}>Κατάλογος προϊόντων</p>
        <p className="mt-0.5 text-xs text-slate-500">{visibleProducts.length} εγγραφές στην τρέχουσα προβολή</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 sm:px-6">Προϊόν</th>
              <th className="px-5 py-3 sm:px-6">Κατάσταση</th>
              <th className="px-5 py-3 sm:px-6">Τιμή</th>
              <th className="px-5 py-3 sm:px-6">Απόθεμα</th>
              <th className="px-5 py-3 sm:px-6 text-right">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleProducts.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-5 py-3.5 sm:px-6">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  {item.category ? <p className="mt-0.5 text-xs text-slate-500">{item.category}</p> : null}
                </td>
                <td className="px-5 py-3.5 sm:px-6">{renderStatusBadge(item)}</td>
                <td className="px-5 py-3.5 sm:px-6 tabular-nums text-slate-700">{formatPrice(item.price, item.currency)}</td>
                <td className="px-5 py-3.5 sm:px-6 tabular-nums text-slate-700">{item.stock ?? "—"}</td>
                <td className="px-5 py-3.5 sm:px-6">
                  <div className="flex flex-wrap justify-end gap-1">
                    <button type="button" className={storeOsGhostBtn} onClick={() => onViewProduct(item)}>
                      Προβολή
                    </button>
                    <button type="button" className={storeOsGhostBtn} onClick={() => onEditProduct(item)}>
                      Επεξεργασία
                    </button>
                    {showToggleActions && canDeactivateOffer(item) && onDeactivateProduct ? (
                      <button
                        type="button"
                        className={storeOsGhostBtn}
                        disabled={togglingProductId === item.id || removingProductId === item.id}
                        onClick={() => onDeactivateProduct(item)}
                      >
                        {togglingProductId === item.id ? "Απενεργ…" : "Απενεργοποίηση"}
                      </button>
                    ) : null}
                    {showToggleActions && canActivateOffer(item) && onActivateProduct ? (
                      <button
                        type="button"
                        className={storeOsGhostBtn}
                        disabled={togglingProductId === item.id || removingProductId === item.id}
                        onClick={() => onActivateProduct(item)}
                      >
                        {togglingProductId === item.id ? "Ενεργ…" : "Ενεργοποίηση"}
                      </button>
                    ) : null}
                    {showToggleActions && canRemoveMerchantProduct(item) && onRemoveProduct ? (
                      <button
                        type="button"
                        className={`${storeOsGhostBtn} text-rose-700 hover:bg-rose-50`}
                        disabled={removingProductId === item.id || togglingProductId === item.id}
                        onClick={() => onRemoveProduct(item)}
                      >
                        {removingProductId === item.id ? "Διαγραφή…" : "Διαγραφή"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
