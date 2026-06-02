/**
 * LEGACY / FROZEN FLOW — DO NOT EXPAND WITHOUT PRODUCT DECISION
 * Used only by `/merchant/products/new` (internal/manual). Canonical intake: catalog request form on Store OS.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  attachMerchantWizardOfferAction,
  getMerchantCatalogRequestStatusAction,
  searchMerchantCatalogMatchesAction,
  submitMerchantWizardCatalogRequestAction,
} from "@/actions/merchant-product-wizard";
import { dsCard, dsHeadingPage, dsMuted, dsPrimaryButton } from "@/components/ui/merchant-ds";
import {
  merchantStoreOffersNewPath,
  merchantStoreOffersPath,
} from "@/lib/merchant/merchant-store-paths";
import type { ActiveCatalogSearchRow } from "@/modules/catalog/queries/product-queries";

export type MerchantWizardVendorOption = { id: string; name: string; tenant_id: string };
export type MerchantWizardCategoryOption = { id: string; name: string };

type WizardState =
  | "input"
  | "matching"
  | "select_existing"
  | "submit_request"
  | "success_offer"
  | "success_request";

type Props = {
  vendors: MerchantWizardVendorOption[];
  defaultVendorId: string;
  /** Categories per store; tenant-scoped when the user switches vendor. */
  categoriesByVendorId: Record<string, MerchantWizardCategoryOption[]>;
};

const DEBOUNCE_MS = 380;

export function MerchantProductResolutionWizard({ vendors, defaultVendorId, categoriesByVendorId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [wizardState, setWizardState] = useState<WizardState>("input");
  const [vendorId, setVendorId] = useState(defaultVendorId);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [categoryId, setCategoryId] = useState(() => categoriesByVendorId[defaultVendorId]?.[0]?.id ?? "");
  const [gtin, setGtin] = useState("");
  const [mpn, setMpn] = useState("");

  const [matches, setMatches] = useState<ActiveCatalogSearchRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ActiveCatalogSearchRow | null>(null);
  const [priceAmount, setPriceAmount] = useState("0");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [condition, setCondition] = useState<"new" | "used" | "refurbished">("new");
  const [offerState, setOfferState] = useState<"draft" | "active">("draft");

  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestPoll, setRequestPoll] = useState<{
    status: string;
    rejection_reason: string | null;
    resolved_product_id: string | null;
  } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tenantId = useMemo(() => vendors.find((v) => v.id === vendorId)?.tenant_id ?? "", [vendors, vendorId]);
  const categories = useMemo(() => categoriesByVendorId[vendorId] ?? [], [categoriesByVendorId, vendorId]);

  useEffect(() => {
    const first = categories[0]?.id ?? "";
    setCategoryId((prev) => (categories.some((c) => c.id === prev) ? prev : first));
  }, [vendorId, categories]);

  const runSearch = useCallback(async () => {
    if (!tenantId || !categoryId) {
      setMatches([]);
      return;
    }
    const q = [title, brand, model].map((s) => s.trim()).filter(Boolean).join(" ");
    setSearchError(null);
    startTransition(async () => {
      const res = await searchMerchantCatalogMatchesAction({
        tenantId,
        categoryId,
        query: q || undefined,
      });
      if (!res.ok) {
        setSearchError(res.message);
        setMatches([]);
        return;
      }
      setMatches(res.matches);
      setWizardState((s) => {
        if (s === "submit_request" || s === "select_existing" || s === "success_offer" || s === "success_request") {
          return s;
        }
        return "matching";
      });
    });
  }, [tenantId, categoryId, title, brand, model]);

  const searchPaused =
    wizardState === "select_existing" ||
    wizardState === "submit_request" ||
    wizardState === "success_offer" ||
    wizardState === "success_request";

  useEffect(() => {
    if (searchPaused || !categoryId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, brand, model, categoryId, tenantId, runSearch, searchPaused]);

  const onSelectProduct = (p: ActiveCatalogSearchRow) => {
    setSelectedProduct(p);
    setWizardState("select_existing");
  };

  const onAttachOffer = () => {
    if (!selectedProduct) return;
    startTransition(async () => {
      const res = await attachMerchantWizardOfferAction({
        vendorId,
        productId: selectedProduct.id,
        condition,
        listingVariantKey: "",
        priceAmount: Number(priceAmount),
        currency: "EUR",
        stockQuantity: Number(stockQuantity),
        state: offerState,
      });
      if (!res.ok) {
        setSearchError(res.message);
        return;
      }
      setWizardState("success_offer");
      setSearchError(null);
      router.push(merchantStoreOffersPath(vendorId));
    });
  };

  const onSubmitCatalogRequest = () => {
    startTransition(async () => {
      const res = await submitMerchantWizardCatalogRequestAction({
        vendorId,
        categoryId,
        title: title.trim(),
        brand: brand.trim() || null,
        model: model.trim() || null,
        gtin: gtin.trim() || null,
        mpn: mpn.trim() || null,
      });
      if (!res.ok) {
        setSearchError(res.message);
        return;
      }
      setRequestId(res.requestId);
      setDuplicateWarning(res.duplicateWarning?.message ?? null);
      setWizardState("success_request");
      setSearchError(null);
      setRequestPoll({ status: "pending", rejection_reason: null, resolved_product_id: null });
    });
  };

  const refreshRequestStatus = useCallback(async () => {
    if (!requestId) return;
    const s = await getMerchantCatalogRequestStatusAction(requestId);
    if (!s.ok || !s.found) return;
    setRequestPoll({
      status: s.status,
      rejection_reason: s.rejection_reason,
      resolved_product_id: s.resolved_product_id,
    });
  }, [requestId]);

  useEffect(() => {
    if (wizardState !== "success_request" || !requestId) return;
    void refreshRequestStatus();
    const t = setInterval(() => {
      void refreshRequestStatus();
    }, 5000);
    return () => clearInterval(t);
  }, [wizardState, requestId, refreshRequestStatus]);

  if (vendors.length === 0 || Object.keys(categoriesByVendorId).length === 0) {
    return (
      <p className={`${dsMuted} text-sm`}>
        Χρειάζεστε ενεργό κατάστημα και κατηγορίες. Ολοκληρώστε το onboarding ή επικοινωνήστε με τη διαχείριση.
      </p>
    );
  }

  if (wizardState === "success_request") {
    const st = requestPoll?.status ?? "pending";
    const approvedProductId = requestPoll?.resolved_product_id ?? null;
    const offerNewHref =
      approvedProductId != null
        ? `${merchantStoreOffersNewPath(vendorId)}?productId=${encodeURIComponent(approvedProductId)}`
        : null;

    return (
      <div className={`${dsCard} space-y-5 p-6`}>
        <h2 className={`${dsHeadingPage} text-xl`}>Αίτηση καταλόγου</h2>
        {duplicateWarning ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
            {duplicateWarning}
          </p>
        ) : null}
        <p className="text-sm text-gray-700">
          Κατάσταση: <strong>{st}</strong>
        </p>
        {st === "rejected" && requestPoll?.rejection_reason ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{requestPoll.rejection_reason}</p>
        ) : null}
        {st === "approved" && offerNewHref ? (
          <div className="space-y-2">
            <p className="text-sm text-emerald-800">Εγκρίθηκε — δημιουργήστε την προσφορά σας.</p>
            <Link href={offerNewHref} className={dsPrimaryButton}>
              Δημιουργία προσφοράς
            </Link>
          </div>
        ) : null}
        {st === "pending" ? <p className={`${dsMuted} text-sm`}>Αναμονή έγκρισης (admin queue)…</p> : null}
        <button
          type="button"
          className="text-sm text-gray-600 underline"
          onClick={() => {
            setWizardState("input");
            setRequestId(null);
            setRequestPoll(null);
            setDuplicateWarning(null);
            setSelectedProduct(null);
            setMatches([]);
            setSearchError(null);
          }}
        >
          Νέα αναζήτηση
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className={`${dsCard} space-y-5 p-6`}>
        <div>
          <h2 className={`${dsHeadingPage} text-lg`}>1. Περιγραφή προϊόντος</h2>
          <p className={`${dsMuted} mt-1 text-sm`}>Δεν δημιουργείται καταχώριση καταλόγου από εσάς — μόνο ταίριασμα ή αίτηση προς διαχείριση.</p>
        </div>

        {vendors.length > 1 ? (
          <label className="block text-sm font-medium text-gray-800">
            Κατάστημα
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" value={vendorId} readOnly />
        )}

        <label className="block text-sm font-medium text-gray-800">
          Κατηγορία <span className="text-rose-600">*</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={categories.length === 0}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-60"
          >
            {categories.length === 0 ? <option value="">—</option> : null}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Τίτλος <span className="text-rose-600">*</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder='π.χ. Laptop 15" 16GB RAM'
          />
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Μάρκα
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm font-medium text-gray-800">
          Μοντέλο
          <input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-800">
            GTIN / EAN
            <input value={gtin} onChange={(e) => setGtin(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            MPN
            <input value={mpn} onChange={(e) => setMpn(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={isPending || !title.trim() || !categoryId || wizardState === "submit_request"}
          className={dsPrimaryButton}
        >
          Ανανέωση αποτελεσμάτων
        </button>
      </section>

      <section className={`${dsCard} space-y-4 p-6`}>
        <h2 className={`${dsHeadingPage} text-lg`}>2. Αποτελέσματα καταλόγου</h2>
        {searchError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-900" role="alert">
            {searchError}
          </p>
        ) : null}
        {isPending && matches.length === 0 && title.trim() && !searchPaused ? <p className={`${dsMuted} text-sm`}>Αναζήτηση…</p> : null}

        {wizardState === "submit_request" ? (
          <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-sm font-medium text-gray-900">Αίτηση νέου προϊόντος καταλόγου</p>
            <p className={`${dsMuted} text-sm`}>
              Θα υποβληθεί προς έλεγχο (platform_admin). Δεν δημιουργείται κανονικό προϊόν χωρίς έγκριση.
            </p>
            <ul className="text-xs text-gray-700">
              <li>Τίτλος: {title.trim() || "—"}</li>
              <li>Κατηγορία: {categories.find((c) => c.id === categoryId)?.name ?? categoryId}</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void onSubmitCatalogRequest()} disabled={isPending} className={dsPrimaryButton}>
                {isPending ? "Υποβολή…" : "Υποβολή αίτησης"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWizardState("matching");
                  setSearchError(null);
                }}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                Πίσω
              </button>
            </div>
          </div>
        ) : null}

        {wizardState === "select_existing" && selectedProduct ? (
          <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <p className="text-sm font-medium text-gray-900">Επιλεγμένο: {selectedProduct.title}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-gray-800">
                Τιμή (EUR)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-sm text-gray-800">
                Απόθεμα
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <label className="text-sm text-gray-800">
              Κατάσταση προϊόντος
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as typeof condition)}
                className="mt-1 block w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value="new">Καινούριο</option>
                <option value="used">Μεταχειρισμένο</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </label>
            <label className="text-sm text-gray-800">
              Κατάσταση προσφοράς
              <select
                value={offerState}
                onChange={(e) => setOfferState(e.target.value as typeof offerState)}
                className="mt-1 block w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value="draft">Πρόχειρο</option>
                <option value="active">Ενεργό</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void onAttachOffer()} disabled={isPending} className={dsPrimaryButton}>
                {isPending ? "Δημιουργία…" : "Δημιουργία προσφοράς"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setWizardState("matching");
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                Ακύρωση
              </button>
            </div>
          </div>
        ) : null}

        {wizardState !== "submit_request" && wizardState !== "select_existing" ? (
          <>
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {matches.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-600">
                      {[m.brand, m.model].filter(Boolean).join(" · ") || "—"} · {m.category_name ?? "Κατηγορία"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectProduct(m)}
                    className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                  >
                    Αυτό είναι το προϊόν μου
                  </button>
                </li>
              ))}
            </ul>

            {matches.length === 0 && !isPending && title.trim() ? (
              <p className={`${dsMuted} text-sm`}>Δεν βρέθηκαν ενεργά προϊόντα που να ταιριάζουν.</p>
            ) : null}

            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setWizardState("submit_request");
                  setSearchError(null);
                }}
                disabled={isPending || !title.trim() || !categoryId}
                className="w-full rounded-lg border border-dashed border-gray-400 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Δεν υπάρχει ταίριασμα — νέα αίτηση προϊόντος καταλόγου
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
