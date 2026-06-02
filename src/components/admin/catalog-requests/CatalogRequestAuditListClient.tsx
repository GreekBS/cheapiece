"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CatalogRequestStatusBadge } from "@/components/admin/catalog-requests/CatalogRequestStatusBadge";
import {
  filterBySearch,
  filterByTab,
  isSearchActive,
  sortAuditRows,
  type AuditStatusTab,
} from "@/components/admin/catalog-requests/catalog-request-audit-list-utils";
import { useCatalogRequestAuditUrlSync } from "@/components/admin/catalog-requests/use-catalog-request-audit-url-sync";
import type { AdminCatalogProductRequestTabCounts } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import type { CatalogProductRequestListRow } from "@/modules/catalog-requests/types/catalog-product-request";

const TABS: { id: AuditStatusTab; label: string }[] = [
  { id: "all", label: "Όλα" },
  { id: "pending", label: "Εκκρεμεί" },
  { id: "approved", label: "Εγκεκριμένες" },
  { id: "rejected", label: "Απορριφθείσες" },
];

function rowClassName(status: CatalogProductRequestListRow["status"]): string {
  if (status === "pending") {
    return "bg-amber-50/80 border-l-4 border-l-amber-400";
  }
  if (status === "approved") {
    return "bg-emerald-50/50";
  }
  if (status === "withdrawn") {
    return "bg-slate-50/80 border-l-4 border-l-slate-300";
  }
  return "bg-slate-50/80";
}

function actionLabel(status: CatalogProductRequestListRow["status"]): string {
  return status === "pending" ? "Έλεγχος" : "Προβολή";
}

function formatCreatedAt(createdAt: string): { date: string; time: string } {
  const d = new Date(createdAt);
  return {
    date: d.toLocaleDateString("el-GR"),
    time: d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" }),
  };
}

type Props = {
  rows: CatalogProductRequestListRow[];
  counts: AdminCatalogProductRequestTabCounts;
  initialTab: AuditStatusTab;
  initialQ: string;
};

export function CatalogRequestAuditListClient({ rows, counts, initialTab, initialQ }: Props) {
  const { activeTab, setTab, searchInput, setSearchInput, debouncedSearch, clearFilters } =
    useCatalogRequestAuditUrlSync({ initialTab, initialQ });

  const displayRows = useMemo(() => {
    const sorted = sortAuditRows(rows, activeTab);
    return filterBySearch(filterByTab(sorted, activeTab), debouncedSearch);
  }, [rows, activeTab, debouncedSearch]);

  const hasActiveFilters = activeTab !== "all" || isSearchActive(debouncedSearch);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {TABS.map((tab) => {
            const count = counts[tab.id];
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={
                  active
                    ? "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                }
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        <label className="block w-full sm:max-w-xs">
          <span className="sr-only">Αναζήτηση</span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Αναζήτηση καταστήματος, τίτλου ή slug…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
      </div>

      {displayRows.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Δεν βρέθηκαν αιτήσεις με τα τρέχοντα φίλτρα.</p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-blue-800 hover:underline"
            >
              Καθαρισμός φίλτρων
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Ημερομηνία</th>
                <th className="px-4 py-3">Κατάστημα</th>
                <th className="px-4 py-3">Τίτλος</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Κατάσταση</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.map((r) => {
                const { date, time } = formatCreatedAt(r.created_at);
                return (
                  <tr key={r.id} className={rowClassName(r.status)}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-800">{date}</div>
                      <div className="text-xs text-slate-500">{time}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{r.vendor_name ?? r.vendor_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.title}</div>
                      {r.requested_price_amount != null || r.requested_stock_quantity != null ? (
                        <div className="mt-0.5 text-xs text-amber-800">
                          Intent:{" "}
                          {r.requested_price_amount != null
                            ? `${r.requested_price_amount} ${r.requested_price_currency ?? "EUR"}`
                            : null}
                          {r.requested_price_amount != null && r.requested_stock_quantity != null
                            ? " · "
                            : null}
                          {r.requested_stock_quantity != null ? `stock ${r.requested_stock_quantity}` : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.slug_suggestion}</td>
                    <td className="px-4 py-3">
                      <CatalogRequestStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/catalog-requests/${r.id}`}
                        className={
                          r.status === "pending"
                            ? "font-medium text-blue-800 hover:underline"
                            : "font-medium text-slate-700 hover:text-slate-900 hover:underline"
                        }
                      >
                        {actionLabel(r.status)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CatalogRequestAuditListFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Φόρτωση φίλτρων">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-slate-100" />
        <div className="h-10 w-full max-w-xs animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
