import Link from "next/link";

import type { VendorDashboardOfferRow } from "@/modules/offers/queries/vendor-dashboard-offers";
import { fallbackProductLabel } from "@/lib/vendor-enrichment-label";
import { merchantStoreOfferEditPath } from "@/lib/merchant/merchant-store-paths";

import { StoreOsBadge, storeOfferStateVariant } from "./StoreOsBadge";
import { storeOsCard, storeOsSectionLabel } from "./store-os-tokens";

type Props = {
  offers: VendorDashboardOfferRow[];
  vendorId: string;
  showEditAction?: boolean;
};

function formatMoney(amount: string | number) {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

function formatUpdated(iso: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(t));
}

function translateState(state: string | null | undefined) {
  const s = (state ?? "").toLowerCase();
  if (s === "active") return "Active";
  if (s === "draft") return "Draft";
  if (s === "paused") return "Paused";
  return state ?? "—";
}

export function StoreOsOffersTable({ offers, vendorId, showEditAction = true }: Props) {
  return (
    <section className={`${storeOsCard} overflow-hidden`}>
      <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <p className={storeOsSectionLabel}>Offers</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 sm:px-6">Product</th>
              <th className="px-5 py-3 sm:px-6">Status</th>
              <th className="px-5 py-3 text-right sm:px-6">Price</th>
              <th className="px-5 py-3 sm:px-6">Stock</th>
              <th className="px-5 py-3 sm:px-6">Updated</th>
              {showEditAction ? <th className="px-5 py-3 sm:px-6" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offers.map((o) => {
              const p = o.products;
              return (
                <tr key={o.id} className="bg-white transition-colors hover:bg-slate-50/80">
                  <td className="px-5 py-3.5 sm:px-6">
                    <p className="font-medium text-slate-900">{p?.title ?? fallbackProductLabel(o.product_id)}</p>
                    {p?.brand ? <p className="mt-0.5 text-xs text-slate-500">{p.brand}</p> : null}
                  </td>
                  <td className="px-5 py-3.5 sm:px-6">
                    <StoreOsBadge variant={storeOfferStateVariant(o.state)}>{translateState(o.state)}</StoreOsBadge>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-medium text-slate-900 sm:px-6">
                    {formatMoney(o.price_amount)}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-slate-600 sm:px-6">{o.stock_quantity ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 sm:px-6">{formatUpdated(o.updated_at)}</td>
                  {showEditAction ? (
                    <td className="px-5 py-3.5 sm:px-6">
                      <Link
                        href={merchantStoreOfferEditPath(vendorId, o.id)}
                        className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
                      >
                        Edit
                      </Link>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
