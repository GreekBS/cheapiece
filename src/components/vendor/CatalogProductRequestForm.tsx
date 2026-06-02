"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { CatalogProductRequestMatchPanel } from "@/components/vendor/CatalogProductRequestMatchPanel";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

import {
  loadMerchantFormContractAction,
  submitCatalogProductRequestAction,
  type CatalogProductRequestActionResult,
} from "@/actions/catalog-product-requests";
import { SchemaDrivenAttributeFields } from "@/components/catalog-ui/SchemaDrivenAttributeFields";
import type { MerchantFormLoadResult } from "@/modules/catalog-products-read/ui/client";
import { merchantStoreOffersNewPath, merchantStoreProductsPendingPath } from "@/lib/merchant/merchant-store-paths";

export type CatalogProductRequestFormVendor = { id: string; name: string; tenantId: string };
export type CatalogProductRequestFormCategory = { id: string; name: string };

type Props = {
  vendors: CatalogProductRequestFormVendor[];
  defaultVendorId: string;
  categoriesByVendorId: Record<string, CatalogProductRequestFormCategory[]>;
  initialContract: MerchantFormLoadResult;
  successListHref?: string;
  successListLabel?: string;
  showOfferLinkAfterSuccess?: boolean;
  /** When set, submission is forced to this vendor (merchant store route lock). */
  lockVendorId?: string;
};

const LEGACY_CONTRACT: MerchantFormLoadResult = { mode: "legacy", categoryId: null, contract: null };

const SCALAR_INPUT_CLASS =
  "mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? "Υποβολή…" : children}
    </button>
  );
}

function Message({
  state,
  vendorId,
}: {
  state: CatalogProductRequestActionResult | null;
  vendorId?: string | null;
}) {
  if (!state) return null;
  if (state.ok) {
    const pendingHref = vendorId ? merchantStoreProductsPendingPath(vendorId) : null;
    return (
      <div className="space-y-2">
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          Η αίτηση υποβλήθηκε. Θα ειδοποιηθείτε όταν εγκριθεί από τη διαχείριση.
        </div>
        {state.duplicateWarning ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            role="status"
          >
            {state.duplicateWarning.message}
            {pendingHref ? (
              <>
                {" "}
                <Link href={pendingHref} className="font-medium underline">
                  Προβολή αιτήσεων
                </Link>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
      {state.message}
    </div>
  );
}

type ScalarFieldsProps = {
  multi: boolean;
  lockVendorId?: string;
  vendors: CatalogProductRequestFormVendor[];
  vendorId: string;
  defaultVendorId: string;
  categories: CatalogProductRequestFormCategory[];
  categoryId: string;
  onVendorChange: (nextVendorId: string) => void;
  onCategoryChange: (nextCategoryId: string) => void;
};

function ScalarFieldsSection({
  multi,
  lockVendorId,
  vendors,
  vendorId,
  defaultVendorId,
  categories,
  categoryId,
  onVendorChange,
  onCategoryChange,
}: ScalarFieldsProps) {
  return (
    <>
      {lockVendorId ? (
        <>
          <input type="hidden" name="vendorId" value={lockVendorId} />
          <input type="hidden" name="lockedVendorId" value={lockVendorId} />
        </>
      ) : multi ? (
        <label className="block text-sm font-medium text-slate-700">
          Κατάστημα
          <select
            name="vendorId"
            required
            value={vendorId}
            onChange={(e) => onVendorChange(e.target.value)}
            className={SCALAR_INPUT_CLASS}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="vendorId" value={vendors[0]?.id ?? defaultVendorId} />
      )}

      <label className="block text-sm font-medium text-slate-700">
        Κατηγορία <span className="text-rose-600">*</span>
        <select
          name="categoryId"
          required
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={SCALAR_INPUT_CLASS}
        >
          <option value="">— Επιλέξτε —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Τίτλος <span className="text-rose-600">*</span>
        <input name="title" required maxLength={500} className={SCALAR_INPUT_CLASS} />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Μάρκα
        <input name="brand" maxLength={200} className={SCALAR_INPUT_CLASS} />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Μοντέλο
        <input name="model" maxLength={200} className={SCALAR_INPUT_CLASS} />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Slug (URL) <span className="text-rose-600">*</span>
        <input
          name="slugSuggestion"
          required
          maxLength={200}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Πεζά γράμματα, αριθμοί και παύλες"
          placeholder="paradeigma-proiontos"
          className={SCALAR_INPUT_CLASS}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        GTIN / EAN (προαιρετικό)
        <input name="gtin" maxLength={32} className={SCALAR_INPUT_CLASS} />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        MPN (προαιρετικό)
        <input name="mpn" maxLength={120} className={SCALAR_INPUT_CLASS} />
      </label>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-800">Προτεινόμενη εμπορική πρόθεση</legend>
        <p className="text-xs text-slate-600">
          Αυτές οι τιμές είναι πρόθεση εμπόρου και δεν δημιουργούν προσφορά.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Προτεινόμενη τιμή (προαιρετικό)
          <input
            name="requestedPriceAmount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className={SCALAR_INPUT_CLASS}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Προτεινόμενο απόθεμα (προαιρετικό)
          <input
            name="requestedStockQuantity"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={SCALAR_INPUT_CLASS}
          />
        </label>
      </fieldset>
    </>
  );
}

export function CatalogProductRequestForm({
  vendors,
  defaultVendorId,
  categoriesByVendorId,
  initialContract,
  successListHref,
  successListLabel = "Προβολή αιτήσεων",
  showOfferLinkAfterSuccess = true,
  lockVendorId,
}: Props) {
  const [state, formAction] = useFormState(submitCatalogProductRequestAction, null as CatalogProductRequestActionResult | null);
  const [vendorId, setVendorId] = useState(lockVendorId ?? defaultVendorId);
  const linkVendorId = lockVendorId ?? vendorId;
  const resolvedSuccessListHref =
    successListHref ??
    (linkVendorId ? merchantStoreProductsPendingPath(linkVendorId) : "/merchant");
  const [categoryId, setCategoryId] = useState("");
  const [contractLoad, setContractLoad] = useState<MerchantFormLoadResult>(initialContract);
  const [formKey, setFormKey] = useState("initial");
  const [contractPending, startContractTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const multi = !lockVendorId && vendors.length > 1;

  useEffect(() => {
    if (lockVendorId) {
      setVendorId(lockVendorId);
    }
  }, [lockVendorId]);
  const tenantId = useMemo(() => {
    const vendor = vendors.find((v) => v.id === vendorId) ?? vendors[0];
    return vendor?.tenantId ?? "";
  }, [vendors, vendorId]);

  const categories = useMemo(
    () => categoriesByVendorId[vendorId] ?? [],
    [categoriesByVendorId, vendorId],
  );

  const reloadContract = useCallback(
    (nextCategoryId: string, nextTenantId: string) => {
      startContractTransition(async () => {
        if (!nextTenantId || !nextCategoryId) {
          setContractLoad(LEGACY_CONTRACT);
          setFormKey(`empty-${Date.now()}`);
          return;
        }
        const loaded = await loadMerchantFormContractAction(nextTenantId, nextCategoryId);
        setContractLoad(loaded);
        setFormKey(`${nextCategoryId}-${loaded.mode}-${Date.now()}`);
      });
    },
    [],
  );

  useEffect(() => {
    if (!categoryId) {
      setContractLoad(LEGACY_CONTRACT);
      return;
    }
    if (!tenantId) return;
    reloadContract(categoryId, tenantId);
  }, [categoryId, tenantId, reloadContract]);

  const onVendorChange = useCallback((nextVendorId: string) => {
    setVendorId(nextVendorId);
    setCategoryId("");
    setContractLoad(LEGACY_CONTRACT);
    setFormKey(`vendor-${nextVendorId}-${Date.now()}`);
  }, []);

  const effectiveVendorId = lockVendorId ?? vendorId;

  const onCategoryChange = useCallback((nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
  }, []);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-amber-800">
        Δεν υπάρχουν ενεργές κατηγορίες για αυτόν τον tenant. Επικοινωνήστε με τη διαχείριση.
      </p>
    );
  }

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Message state={state} vendorId={linkVendorId} />
        <Link href={resolvedSuccessListHref} className="text-sm font-medium text-slate-900 underline">
          {successListLabel}
        </Link>
        {showOfferLinkAfterSuccess && linkVendorId ? (
          <Link
            href={merchantStoreOffersNewPath(linkVendorId)}
            className="ml-4 text-sm font-medium text-slate-600 underline"
          >
            Νέα προσφορά
          </Link>
        ) : null}
      </div>
    );
  }

  const showSchemaFields = contractLoad.mode === "partial" || contractLoad.mode === "strict";
  const strictSchemaVersionId =
    contractLoad.mode === "strict" ? contractLoad.schemaVersionId : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <form ref={formRef} action={formAction} className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="space-y-5">
          <Message state={state} vendorId={linkVendorId} />

          <ScalarFieldsSection
            multi={multi}
            lockVendorId={lockVendorId}
            vendors={vendors}
            vendorId={vendorId}
            defaultVendorId={defaultVendorId}
            categories={categories}
            categoryId={categoryId}
            onVendorChange={onVendorChange}
            onCategoryChange={onCategoryChange}
          />

          {contractPending ? (
            <p className="text-xs text-slate-500" role="status">
              Φόρτωση πεδίων καταλόγου…
            </p>
          ) : null}

          {contractLoad.mode === "strict" ? (
            <input type="hidden" name="schemaVersionId" value={strictSchemaVersionId} />
          ) : null}

          {showSchemaFields && contractLoad.contract ? (
            <SchemaDrivenAttributeFields contract={contractLoad.contract} formKey={formKey} />
          ) : null}

          <SubmitButton>Υποβολή αίτησης</SubmitButton>
        </div>

        <CatalogProductRequestMatchPanel
          vendorId={effectiveVendorId}
          categoryId={categoryId}
          formRef={formRef}
        />
      </form>
    </div>
  );
}
