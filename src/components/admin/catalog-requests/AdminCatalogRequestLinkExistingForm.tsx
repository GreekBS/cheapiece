"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  compareLinkVariantMatchAction,
  linkCatalogProductRequestToExistingAction,
  searchCatalogProductsForLinkAction,
  type AdminCatalogProductSearchRow,
  type AdminCatalogRequestActionResult,
} from "@/actions/admin-catalog-product-requests";
import {
  getCatalogApprovalUiFlags,
  MIN_OVERRIDE_REASON_LENGTH,
} from "@/components/admin/catalog-requests/catalog-approval-ui-flags";
import { RecommendedProductPreviewCard } from "@/components/admin/catalog-requests/RecommendedProductPreviewCard";
import type { ProductMatchLabel } from "@/modules/catalog-request-matching/queries/fetch-product-match-labels";
import type { LinkVariantMatchStatus } from "@/modules/catalog-requests/variant-dedup";

function LinkSubmitButton({
  disabled,
  emphasizePrimary,
  label,
}: {
  disabled: boolean;
  emphasizePrimary: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();
  const cls = emphasizePrimary
    ? "w-full bg-violet-700 hover:bg-violet-800 text-white sm:w-auto"
    : "border border-violet-300 bg-white text-violet-900 hover:bg-violet-50";
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 ${cls}`}
    >
      {pending ? "…" : label}
    </button>
  );
}

function Err({ state }: { state: AdminCatalogRequestActionResult | null }) {
  if (!state) return null;
  if (state.ok && state.warning) {
    return (
      <p className="text-sm text-amber-800" role="status">
        {state.warning}
      </p>
    );
  }
  if (state.ok) return null;
  return (
    <p className="text-sm text-rose-700" role="alert">
      {state.message}
    </p>
  );
}

function MatchStatusBadge({ status }: { status: LinkVariantMatchStatus | null }) {
  if (!status) return null;
  if (status === "strict_match") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
        ✓ Ίδια παραλλαγή — ασφαλής σύνδεση
      </span>
    );
  }
  if (status === "mismatch") {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900">
        ⚠ Διαφορετική παραλλαγή — απαιτείται επιβεβαίωση
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      Ανεπαρκή στοιχεία παραλλαγής
    </span>
  );
}

type Props = {
  requestId: string;
  tenantId: string;
  categoryId: string | null;
  suggestedProductId: string | null;
  merchantSelectedProductId: string | null;
  defaultLinkProductId?: string | null;
  candidateProduct?: ProductMatchLabel | null;
  emphasizePrimary?: boolean;
  reviewStepLabel?: string | null;
};

export function AdminCatalogRequestLinkExistingForm({
  requestId,
  tenantId,
  categoryId,
  suggestedProductId,
  merchantSelectedProductId,
  defaultLinkProductId = null,
  candidateProduct = null,
  emphasizePrimary = false,
  reviewStepLabel = null,
}: Props) {
  const uiFlags = getCatalogApprovalUiFlags();
  const [state, formAction] = useFormState(
    linkCatalogProductRequestToExistingAction,
    null as AdminCatalogRequestActionResult | null,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminCatalogProductSearchRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPending, startSearch] = useTransition();
  const [matchStatus, setMatchStatus] = useState<LinkVariantMatchStatus | null>(null);
  const [, startMatchCheck] = useTransition();
  const [linkOverrideConfirmed, setLinkOverrideConfirmed] = useState(false);
  const [linkOverrideReason, setLinkOverrideReason] = useState("");
  const recommendedRowRef = useRef<HTMLLabelElement | null>(null);

  const runSearch = useCallback(
    (q: string) => {
      startSearch(async () => {
        setSearchError(null);
        try {
          const rows = await searchCatalogProductsForLinkAction({
            tenantId,
            q: q.trim() || undefined,
            categoryId,
          });
          setResults(rows);
        } catch {
          setSearchError("Αδυναμία αναζήτησης προϊόντων.");
          setResults([]);
        }
      });
    },
    [tenantId, categoryId],
  );

  const refreshMatchStatus = useCallback(
    (productId: string) => {
      if (!productId) {
        setMatchStatus(null);
        return;
      }
      startMatchCheck(async () => {
        const res = await compareLinkVariantMatchAction(requestId, productId);
        if (res.ok) {
          setMatchStatus(res.status);
        } else {
          setMatchStatus(null);
        }
      });
    },
    [requestId],
  );

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    runSearch("");
  }, [runSearch]);

  useEffect(() => {
    if (defaultLinkProductId) {
      setSelectedProductId(defaultLinkProductId);
    }
  }, [defaultLinkProductId]);

  useEffect(() => {
    refreshMatchStatus(selectedProductId);
  }, [selectedProductId, refreshMatchStatus]);

  useEffect(() => {
    if (defaultLinkProductId && recommendedRowRef.current) {
      recommendedRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [defaultLinkProductId, results.length]);

  const pickProduct = (id: string) => {
    setSelectedProductId(id);
    setLinkOverrideConfirmed(false);
    setLinkOverrideReason("");
  };

  const selectedRow = useMemo(
    () => results.find((r) => r.id === selectedProductId) ?? null,
    [results, selectedProductId],
  );

  const selectedTitle =
    selectedRow?.title ??
    (selectedProductId === candidateProduct?.id ? candidateProduct.title : null);

  const needsLinkOverride = matchStatus === "mismatch";
  const linkReasonOk =
    !uiFlags.requireOverrideReason ||
    !needsLinkOverride ||
    linkOverrideReason.trim().length >= MIN_OVERRIDE_REASON_LENGTH;
  const linkSubmitDisabled =
    !selectedProductId ||
    (needsLinkOverride && (!linkOverrideConfirmed || !linkReasonOk));

  const submitLabel =
    matchStatus === "strict_match" && selectedTitle
      ? `Έγκριση & σύνδεση με «${selectedTitle.length > 40 ? `${selectedTitle.slice(0, 40)}…` : selectedTitle}»`
      : "Έγκριση & σύνδεση";

  const showRecommendedPreview =
    candidateProduct &&
    (defaultLinkProductId === candidateProduct.id || selectedProductId === candidateProduct.id);

  return (
    <div
      id="approval-link-section"
      className={
        emphasizePrimary
          ? "space-y-4 rounded-xl border-2 border-violet-400 bg-violet-50/60 p-5 shadow-md"
          : "space-y-4 rounded-xl border border-violet-200 bg-violet-50/30 p-5 shadow-sm"
      }
    >
      <div>
        {reviewStepLabel ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            {reviewStepLabel}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold text-slate-900">
          {emphasizePrimary
            ? "Προτεινόμενη ενέργεια: Σύνδεση με υπάρχον προϊόν"
            : "Έγκριση & σύνδεση με υπάρχον προϊόν"}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Αποφεύγεται διπλότυπο προϊόν καταλόγου. Η προσφορά του εμπόρου θα συνδεθεί στο υπάρχον
          προϊόν καταλόγου.
        </p>
      </div>

      {emphasizePrimary && matchStatus === "strict_match" && selectedProductId ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
          role="status"
        >
          Μπορείτε να υποβάλετε απευθείας — το προϊόν είναι ήδη επιλεγμένο με αυστηρή ταύτιση
          παραλλαγής.
        </p>
      ) : null}

      <Err state={state} />

      {showRecommendedPreview ? (
        <RecommendedProductPreviewCard
          product={candidateProduct}
          matchStatus={matchStatus === "strict_match" ? "strict_match" : matchStatus}
        />
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        Αναζήτηση προϊόντος
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Τίτλος, slug, μάρκα…"
          className="mt-1 block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </label>

      {(suggestedProductId || merchantSelectedProductId) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {suggestedProductId ? (
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50"
              onClick={() => pickProduct(suggestedProductId)}
            >
              Πρόταση συστήματος
            </button>
          ) : null}
          {merchantSelectedProductId && merchantSelectedProductId !== suggestedProductId ? (
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50"
              onClick={() => pickProduct(merchantSelectedProductId)}
            >
              Επιλογή καταστήματος
            </button>
          ) : null}
        </div>
      )}

      {searchError ? (
        <p className="text-sm text-rose-700" role="alert">
          {searchError}
        </p>
      ) : null}

      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
        {searchPending && results.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-500">Αναζήτηση…</p>
        ) : null}
        {!searchPending && results.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-500">Δεν βρέθηκαν δημοσιευμένα προϊόντα.</p>
        ) : null}
        {results.map((row) => {
          const selected = selectedProductId === row.id;
          const isRecommended = row.id === defaultLinkProductId;
          return (
            <label
              key={row.id}
              ref={isRecommended ? recommendedRowRef : undefined}
              className={`flex cursor-pointer gap-2 rounded-md px-2 py-2 text-sm ${
                selected
                  ? "bg-violet-100 ring-2 ring-violet-400"
                  : isRecommended
                    ? "bg-violet-50 ring-1 ring-violet-300"
                    : "hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="linkProductPick"
                value={row.id}
                checked={selected}
                onChange={() => pickProduct(row.id)}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{row.title}</span>
                  {isRecommended ? (
                    <span className="rounded-full bg-violet-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-900">
                      Προτεινόμενο
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  {[row.brand, row.model].filter(Boolean).join(" · ") || "—"} ·{" "}
                  <span className="font-mono">{row.slug}</span>
                  {row.category_name ? ` · ${row.category_name}` : ""}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {selectedProductId ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600">Κατάσταση ταύτισης παραλλαγής:</span>
          <MatchStatusBadge status={matchStatus} />
        </div>
      ) : null}

      <form action={formAction} className="space-y-3 border-t border-violet-100 pt-4">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="productId" value={selectedProductId} />
        <label className="block text-sm font-medium text-slate-700">
          Σημείωση admin (εσωτερική)
          <textarea
            name="adminNote"
            rows={2}
            className="mt-1 block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        {needsLinkOverride ? (
          <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/80 p-3">
            <label className="flex items-start gap-2 text-sm text-rose-950">
              <input
                type="checkbox"
                name="confirmLinkDespiteVariantMismatch"
                value="true"
                checked={linkOverrideConfirmed}
                onChange={(e) => setLinkOverrideConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Επιβεβαιώνω σύνδεση παρά τη διαφορά παραλλαγής μεταξύ αίτησης και επιλεγμένου
                προϊόντος.
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Λόγος override
              {uiFlags.requireOverrideReason ? " (υποχρεωτικός)" : " (προαιρετικό)"}
              <textarea
                name="linkOverrideReason"
                rows={2}
                value={linkOverrideReason}
                onChange={(e) => setLinkOverrideReason(e.target.value)}
                placeholder="π.χ. ίδιο προϊόν, διαφορετική κωδικοποίηση χαρακτηριστικών"
                className="mt-1 block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            {uiFlags.requireOverrideReason &&
            linkOverrideConfirmed &&
            linkOverrideReason.trim().length > 0 &&
            linkOverrideReason.trim().length < MIN_OVERRIDE_REASON_LENGTH ? (
              <p className="text-xs text-rose-800">
                Ο λόγος πρέπει να έχει τουλάχιστον {MIN_OVERRIDE_REASON_LENGTH} χαρακτήρες.
              </p>
            ) : null}
          </div>
        ) : null}
        <LinkSubmitButton
          disabled={linkSubmitDisabled}
          emphasizePrimary={emphasizePrimary}
          label={submitLabel}
        />
        {!selectedProductId ? (
          <p className="text-xs text-amber-800">Επιλέξτε προϊόν από τη λίστα πριν την υποβολή.</p>
        ) : null}
      </form>
    </div>
  );
}
