import Link from "next/link";

import { merchantStoreOfferEditPath } from "@/lib/merchant/merchant-store-paths";
import type { StoreProductListRow } from "@/modules/offers/types/store-product";
import { fallbackProductLabel } from "@/lib/vendor-enrichment-label";

type Props = {
  offers: StoreProductListRow[];
  vendorId: string;
  showEditAction: boolean;
};

function formatUpdatedAt(iso: string | undefined) {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function stateLabel(state: string) {
  if (state === "draft" || state === "active") {
    return state;
  }
  return state;
}

export function OffersTable({ offers, vendorId, showEditAction }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead>
            <tr className="bg-zinc-50/80 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {offers.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-zinc-50/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{row.products?.title ?? fallbackProductLabel(row.product_id)}</div>
                  {!row.products ? (
                    <div className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      Catalog metadata unavailable
                    </div>
                  ) : null}
                  {row.condition ? (
                    <div className="text-xs capitalize text-zinc-500">{row.condition}</div>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-800">{String(row.price_amount)}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-800">{row.stock_quantity ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700">
                    {stateLabel(row.state)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{formatUpdatedAt(row.updated_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={merchantStoreOfferEditPath(vendorId, row.id)}
                      className="font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
                    >
                      View
                    </Link>
                    {showEditAction ? (
                      <Link
                        href={merchantStoreOfferEditPath(vendorId, row.id)}
                        className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
                      >
                        Edit
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
