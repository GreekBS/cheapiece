"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CategoryNode } from "@/lib/admin/category-tree-model";
import {
  fetchCategoryTree,
  loadTenantContext,
  rowsToCategoryTree,
  type TenantContext,
} from "@/lib/admin/categories-supabase";
import { fetchPrimaryImageUrlsByProductIds } from "@/lib/admin/product-images-admin-service";
import {
  fetchOfferCountsByProductIds,
  fetchProductsAdminPage,
} from "@/lib/admin/products-admin-service";
import { ProductThumbnail } from "@/components/admin/products/ProductThumbnail";
import type { ProductAdminListRow, ProductLifecycleState } from "@/lib/admin/products-admin-types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const PAGE_SIZE = 25;

/** One-shot flash after edit save; isolated for useSearchParams + Suspense. */
function AdminProductSaveSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const hasShownSaveBannerRef = useRef(false);

  useEffect(() => {
    if (hasShownSaveBannerRef.current) return;
    if (searchParams.get("saved") !== "1") return;

    hasShownSaveBannerRef.current = true;
    setVisible(true);
    router.replace("/admin/products", { scroll: false });
    window.setTimeout(() => setVisible(false), 4000);
  }, []);

  if (!visible) return null;

  return (
    <p
      role="status"
      className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-950"
    >
      Product saved successfully
    </p>
  );
}

function flattenCategoryOptions(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const pad = depth > 0 ? `${"— ".repeat(depth)}` : "";
    out.push({ id: n.id, label: `${pad}${n.name}`.trim() });
    if (n.children.length) out.push(...flattenCategoryOptions(n.children, depth + 1));
  }
  return out;
}

export function AdminProductsPageClient() {
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const [ctx, setCtx] = useState<TenantContext | null>(null);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ProductAdminListRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [offerCounts, setOfferCounts] = useState<Map<string, number>>(new Map());
  const [primaryImageUrls, setPrimaryImageUrls] = useState<Map<string, string>>(new Map());
  const [pageIndex, setPageIndex] = useState(0);
  const [stateFilter, setStateFilter] = useState<ProductLifecycleState | "all">("all");
  const [categoryId, setCategoryId] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; label: string }[]>([]);

  const offset = pageIndex * PAGE_SIZE;

  const loadPage = useCallback(async () => {
    const sb = supabaseRef.current;
    const tenantId = ctx?.tenantId;
    if (!sb || !tenantId || !ctx?.isPlatformAdmin) return;
    setBusy(true);
    setHydrationError(null);
    try {
      const { rows: nextRows, total: nextTotal } = await fetchProductsAdminPage(sb, tenantId, {
        limit: PAGE_SIZE,
        offset,
        state: stateFilter,
        categoryId: categoryId || undefined,
        search: searchApplied || undefined,
      });
      setRows(nextRows);
      setTotal(nextTotal);
      const ids = nextRows.map((r) => r.id);
      const [counts, primaryUrls] = await Promise.all([
        fetchOfferCountsByProductIds(sb, tenantId, ids),
        fetchPrimaryImageUrlsByProductIds(sb, tenantId, ids),
      ]);
      setOfferCounts(counts);
      setPrimaryImageUrls(primaryUrls);
    } catch (e) {
      setHydrationError(e instanceof Error ? e.message : String(e));
      setRows([]);
      setTotal(null);
      setOfferCounts(new Map());
      setPrimaryImageUrls(new Map());
    } finally {
      setBusy(false);
    }
  }, [ctx?.isPlatformAdmin, ctx?.tenantId, offset, stateFilter, categoryId, searchApplied]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        supabaseRef.current = sb;
        const c = await loadTenantContext(sb);
        if (cancelled) return;
        if (!c) {
          setHydrationError("Δεν βρέθηκε tenant στο profile.");
          return;
        }
        setCtx(c);
        const catRows = await fetchCategoryTree(sb, c.tenantId);
        if (cancelled) return;
        setCategoryOptions(flattenCategoryOptions(rowsToCategoryTree(catRows)));
      } catch (e) {
        if (!cancelled) setHydrationError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const totalPages = useMemo(() => {
    if (total == null) return null;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  const applySearch = useCallback(() => {
    setPageIndex(0);
    setSearchApplied(searchInput.trim());
  }, [searchInput]);

  if (ctx && !ctx.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Η διαχείριση καταλόγου προϊόντων (platform) είναι διαθέσιμη μόνο για λογαριασμούς{" "}
          <strong>platform_admin</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-blue-900/90">
          Κατάλογος προϊόντων (πίνακας <code className="rounded bg-blue-100 px-1">products</code>) · σελίδες {PAGE_SIZE}{" "}
          / φορά
        </p>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-900/25 ring-1 ring-blue-400/50 hover:bg-blue-700"
        >
          Νέο template
        </Link>
      </div>

      <Suspense fallback={null}>
        <AdminProductSaveSuccessBanner />
      </Suspense>

      {hydrationError ? (
        <p className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-900">{hydrationError}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border-2 border-blue-400/70 bg-white shadow-md shadow-blue-900/[0.08] ring-1 ring-blue-200/60">
        <div className="flex flex-col gap-3 border-b border-blue-200 bg-blue-50/90 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[140px] flex-1 text-xs font-semibold text-blue-900/90">
            Κατάσταση
            <select
              value={stateFilter}
              onChange={(e) => {
                setPageIndex(0);
                setStateFilter(e.target.value as typeof stateFilter);
              }}
              className="mt-1 w-full rounded-lg border-2 border-blue-200 bg-white px-2 py-2 text-sm"
            >
              <option value="all">Όλες</option>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label className="block min-w-[180px] flex-1 text-xs font-semibold text-blue-900/90">
            Κατηγορία
            <select
              value={categoryId}
              onChange={(e) => {
                setPageIndex(0);
                setCategoryId(e.target.value);
              }}
              className="mt-1 w-full rounded-lg border-2 border-blue-200 bg-white px-2 py-2 text-sm"
            >
              <option value="">Όλες</option>
              {categoryOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex min-w-[200px] flex-[2] flex-col gap-1">
            <label htmlFor="admin-prod-search" className="text-xs font-semibold text-blue-900/90">
              Αναζήτηση (title / slug / brand / model)
            </label>
            <div className="flex gap-2">
              <input
                id="admin-prod-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="π.χ. keyboard…"
                className="min-w-0 flex-1 rounded-lg border-2 border-blue-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => applySearch()}
                className="shrink-0 rounded-lg border-2 border-blue-600 bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Φίλτρο
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-blue-200 bg-blue-600/10 text-xs font-semibold uppercase tracking-wide text-blue-900/90">
              <tr>
                <th className="w-14 px-4 py-3" aria-label="Εικόνα" />
                <th className="px-4 py-3">Τίτλος</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Κατηγορία</th>
                <th className="px-4 py-3">Κατάσταση</th>
                <th className="px-4 py-3 tabular-nums">Offers</th>
                <th className="px-4 py-3">Ενημέρωση</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100 text-slate-700">
              {busy && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Φόρτωση…
                  </td>
                </tr>
              ) : null}
              {!busy && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Δεν βρέθηκαν εγγραφές.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/60">
                  <td className="px-4 py-3">
                    <ProductThumbnail url={primaryImageUrls.get(r.id)} alt={r.title} size={48} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.title}</div>
                    <div className="text-xs text-slate-500">
                      {[r.brand, r.model].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{r.category_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-800">
                      {r.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-800">{offerCounts.get(r.id) ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.updated_at).toLocaleString("el-GR")}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${r.id}`}
                      className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      Επεξεργασία
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-blue-100 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-600">
            {total != null ? (
              <>
                Σύνολο <span className="font-semibold tabular-nums">{total}</span> · σελίδα{" "}
                <span className="font-semibold tabular-nums">{pageIndex + 1}</span>
                {totalPages != null ? (
                  <>
                    {" "}
                    / <span className="tabular-nums">{totalPages}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>Σελίδα {pageIndex + 1}</>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pageIndex <= 0 || busy}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 disabled:opacity-40"
            >
              Προηγούμενη
            </button>
            <button
              type="button"
              disabled={
                busy ||
                rows.length < PAGE_SIZE ||
                (total != null && offset + PAGE_SIZE >= total)
              }
              onClick={() => setPageIndex((p) => p + 1)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 disabled:opacity-40"
            >
              Επόμενη
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
