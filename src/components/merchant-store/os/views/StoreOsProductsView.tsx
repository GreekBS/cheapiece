"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  setCatalogRequestOfferStateAction,
} from "@/actions/catalog-product-request-offer-state";
import { removeMerchantCatalogProductAction } from "@/actions/remove-merchant-catalog-product";
import {
  applyCatalogRequestCommerceEditAction,
  type ApplyCatalogRequestCommerceEditResult,
} from "@/actions/catalog-product-request-commerce-edit";
import {
  editCatalogProductRequestAction,
  type EditCatalogProductRequestActionResult,
} from "@/actions/catalog-product-request-edits";
import type { CatalogProductRequestRow } from "@/modules/catalog-requests/types/catalog-product-request";
import { canonicalizeAttributesForComparison } from "@/modules/catalog-requests/services/classify-catalog-request-edit-diff";
import { resolveLinkedOfferForCatalogRequest } from "@/lib/merchant/resolve-linked-offer-for-catalog-request";
import type { VendorDashboardOfferRow } from "@/modules/offers/queries/vendor-dashboard-offers";

import { StoreOsProductList } from "@/components/merchant-store/os/StoreOsProductList";
import { StoreOsProductTabNav } from "@/components/merchant-store/os/StoreOsProductTabNav";
import {
  buildProductsFromCatalogRequests,
  countProductsByTab,
  filterProductsByTab,
  PRODUCT_STATUS_LABELS,
  type StoreOsProduct,
  type StoreOsProductTab,
} from "@/components/merchant-store/os/store-os-product-list-types";
import type { StoreOsWorkspaceData } from "@/components/merchant-store/os/store-os-view-types";
import {
  storeOsPage,
  storeOsPageHeader,
  storeOsPrimaryBtn,
  storeOsSecondaryBtn,
  storeOsSubtitle,
  storeOsTitle,
} from "@/components/merchant-store/os/store-os-tokens";
import { merchantStoreProductsRequestNewPath } from "@/lib/merchant/merchant-store-paths";

type Props = {
  data: StoreOsWorkspaceData;
  vendorId: string;
  initialProductTab?: StoreOsProductTab;
};

export function StoreOsProductsView({ data, vendorId, initialProductTab }: Props) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const pendingNavigationRetryRef = useRef(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreOsProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<StoreOsProduct | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [toggleNotice, setToggleNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const products = useMemo(
    () =>
      buildProductsFromCatalogRequests(data.catalogRequests, {
        offers: data.offers,
        vendorId,
      }),
    [data.catalogRequests, data.offers, vendorId],
  );

  const tabCounts = useMemo(() => countProductsByTab(products), [products]);
  const pendingCount = tabCounts.pending;

  const [activeProductTab, setActiveProductTab] = useState<StoreOsProductTab>("active");

  useEffect(() => {
    if (data.catalogRequestsError) return;

    if (initialProductTab === "pending") {
      if (pendingCount > 0) {
        setActiveProductTab("pending");
      } else {
        setActiveProductTab("active");
      }
      return;
    }

    if (initialProductTab) {
      setActiveProductTab(initialProductTab);
    }
  }, [initialProductTab, pendingCount, data.catalogRequestsError]);

  useEffect(() => {
    if (
      data.catalogRequestsError ||
      initialProductTab !== "pending" ||
      pendingCount > 0 ||
      pendingNavigationRetryRef.current
    ) {
      return;
    }
    pendingNavigationRetryRef.current = true;
    startRefresh(() => {
      router.refresh();
    });
  }, [
    data.catalogRequestsError,
    initialProductTab,
    pendingCount,
    router,
  ]);

  const visibleProducts = useMemo(
    () => filterProductsByTab(products, activeProductTab),
    [products, activeProductTab],
  );

  const createHref = merchantStoreProductsRequestNewPath(vendorId);

  function handleRetry() {
    startRefresh(() => {
      router.refresh();
    });
  }

  async function handleOfferStateToggle(
    product: StoreOsProduct,
    targetState: "active" | "paused",
  ) {
    setToggleNotice(null);
    setTogglingProductId(product.id);
    try {
      const result = await setCatalogRequestOfferStateAction({
        requestId: product.id,
        vendorId,
        targetState,
      });
      if (result.ok) {
        setToggleNotice({ kind: "success", message: result.message });
        startRefresh(() => {
          router.refresh();
        });
        return;
      }
      setToggleNotice({ kind: "error", message: result.message });
    } finally {
      setTogglingProductId(null);
    }
  }

  function handleDeactivateProduct(product: StoreOsProduct) {
    void handleOfferStateToggle(product, "paused");
  }

  function handleActivateProduct(product: StoreOsProduct) {
    void handleOfferStateToggle(product, "active");
  }

  async function handleRemoveProduct(product: StoreOsProduct) {
    const confirmed = window.confirm(
      "Θέλετε να αφαιρέσετε αυτό το προϊόν από το κατάστημά σας; Η ενέργεια δεν διαγράφει το ιστορικό καταλόγου.",
    );
    if (!confirmed) return;

    setToggleNotice(null);
    setRemovingProductId(product.id);
    try {
      const result = await removeMerchantCatalogProductAction({
        requestId: product.id,
        vendorId,
      });
      if (result.ok) {
        setToggleNotice({ kind: "success", message: result.message });
        setSelectedProduct(null);
        setEditingProduct(null);
        startRefresh(() => {
          router.refresh();
        });
        return;
      }
      setToggleNotice({ kind: "error", message: result.message });
    } finally {
      setRemovingProductId(null);
    }
  }

  const showPendingHint =
    initialProductTab === "pending" && pendingCount === 0 && !data.catalogRequestsError;

  useEffect(() => {
    if (!selectedProduct && !editingProduct) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedProduct(null);
        setEditingProduct(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProduct, editingProduct]);

  const editingCatalogRequest = editingProduct ? findCatalogRequest(data, editingProduct.id) : null;
  const editingLinkedOffer =
    editingCatalogRequest != null
      ? resolveLinkedOfferForCatalogRequest(editingCatalogRequest, data.offers, vendorId)
      : null;

  return (
    <div className={`${storeOsPage} max-w-6xl`}>
      <header className={storeOsPageHeader}>
        <h1 className={storeOsTitle}>Προϊόντα</h1>
        <p className={storeOsSubtitle}>
          Νέες αιτήσεις καταλόγου ελέγχονται πριν τη δημοσίευση. Τιμή, απόθεμα και κατάσταση προσφοράς ενημερώνονται
          άμεσα.
        </p>
      </header>

      {data.catalogRequestsError ? (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          <p className="font-medium">
            {data.catalogRequestsErrorMessage ?? "Αδυναμία φόρτωσης προϊόντων. Δοκίμασε ανανέωση."}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRefreshing}
            className={`${storeOsSecondaryBtn} mt-3`}
          >
            {isRefreshing ? "Ανανέωση…" : "Δοκιμή ξανά"}
          </button>
        </div>
      ) : null}

      {showPendingHint ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          Η αίτηση υποβλήθηκε. Αν δεν εμφανίζεται ακόμα, πάτησε ανανέωση ή δες την καρτέλα «Σε αναμονή».
        </p>
      ) : null}

      {toggleNotice ? (
        <p
          className={
            toggleNotice.kind === "success"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              : "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          }
          role="status"
        >
          {toggleNotice.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <StoreOsProductTabNav
          activeTab={activeProductTab}
          counts={tabCounts}
          disabled={data.catalogRequestsError || isRefreshing}
          onTabChange={setActiveProductTab}
        />
        <Link
          href={createHref}
          className={`${storeOsPrimaryBtn} shrink-0 whitespace-normal px-3 text-center text-xs leading-snug sm:text-sm`}
        >
          Αίτηση νέου προϊόντος καταλόγου
        </Link>
      </div>

      <div className="mt-2">
        {data.catalogRequestsError ? null : (
          <StoreOsProductList
            visibleProducts={visibleProducts}
            activeTab={activeProductTab}
            showToggleActions={data.showEditAction}
            togglingProductId={togglingProductId}
            removingProductId={removingProductId}
            onViewProduct={setSelectedProduct}
            onEditProduct={setEditingProduct}
            onDeactivateProduct={handleDeactivateProduct}
            onActivateProduct={handleActivateProduct}
            onRemoveProduct={data.showEditAction ? handleRemoveProduct : undefined}
          />
        )}
      </div>

      {selectedProduct ? (
        <ProductPreviewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={(product) => {
            setSelectedProduct(null);
            setEditingProduct(product);
          }}
        />
      ) : null}

      {editingProduct ? (
        <ProductEditModal
          product={editingProduct}
          vendorId={vendorId}
          catalogRequest={editingCatalogRequest}
          linkedOffer={editingLinkedOffer}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            startRefresh(() => router.refresh());
          }}
        />
      ) : null}
    </div>
  );
}

function formatMoney(value: number | null, currency: string | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: currency || "EUR" }).format(value);
}

type ProductPreviewModalProps = {
  product: StoreOsProduct;
  onClose: () => void;
  onEdit: (product: StoreOsProduct) => void;
};

function ProductPreviewModal({ product, onClose, onEdit }: ProductPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-preview-title"
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="product-preview-title" className="text-base font-semibold text-slate-900">
              Προβολή προϊόντος
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Αναλυτικά στοιχεία αίτησης καταλόγου</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Κλείσιμο
          </button>
        </header>

        <div className="space-y-5 px-5 py-4 sm:px-6">
          <section className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-sm font-semibold text-slate-900">{product.title}</h3>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Κατάσταση</dt>
                <dd className="mt-0.5">{PRODUCT_STATUS_LABELS[product.status]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Κατηγορία</dt>
                <dd className="mt-0.5">{product.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Μάρκα</dt>
                <dd className="mt-0.5">{product.brand || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Μοντέλο</dt>
                <dd className="mt-0.5">{product.model || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Slug</dt>
                <dd className="mt-0.5 break-all">{product.slugSuggestion || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Προτεινόμενη τιμή</dt>
                <dd className="mt-0.5 tabular-nums">{formatMoney(product.price, product.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Προτεινόμενο απόθεμα</dt>
                <dd className="mt-0.5 tabular-nums">{product.stock ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">GTIN</dt>
                <dd className="mt-0.5">{product.gtin || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">MPN</dt>
                <dd className="mt-0.5">{product.mpn || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Υποβολή</dt>
                <dd className="mt-0.5">{product.requestedAt ? new Date(product.requestedAt).toLocaleString("el-GR") : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Τελευταία ενημέρωση</dt>
                <dd className="mt-0.5">{product.updatedAt ? new Date(product.updatedAt).toLocaleString("el-GR") : "—"}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Στοιχεία χαρακτηριστικών</h4>
            {product.attributes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Δεν υπάρχουν δηλωμένα χαρακτηριστικά.</p>
            ) : (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Πεδίο</th>
                      <th className="px-3 py-2">Τιμή</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {product.attributes.map((attr) => (
                      <tr key={attr.id}>
                        <td className="px-3 py-2">{attr.key}</td>
                        <td className="px-3 py-2 break-all">{attr.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-slate-500">
            Η «Διαγραφή» αφαιρεί το προϊόν από όλες τις καρτέλες του καταστήματος χωρίς διαγραφή ιστορικού καταλόγου.
          </p>
          {product.adminNote || product.rejectionReason ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-600">
              {product.adminNote ? <p>Σημείωση διαχείρισης: {product.adminNote}</p> : null}
              {product.rejectionReason ? <p>Αιτιολογία απόρριψης: {product.rejectionReason}</p> : null}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Επεξεργασία
          </button>
          <button
            type="button"
            disabled
            title="Θα ενεργοποιηθεί σε επόμενο βήμα."
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400"
          >
            Απενεργοποίηση
          </button>
          <button
            type="button"
            disabled
            title="Θα ενεργοποιηθεί σε επόμενο βήμα."
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400"
          >
            Διαγραφή
          </button>
        </footer>
      </div>
    </div>
  );
}

function findCatalogRequest(data: StoreOsWorkspaceData, requestId: string): CatalogProductRequestRow | null {
  return data.catalogRequests.find((row) => row.id === requestId) ?? null;
}

function catalogRequestCommerceBaseline(catalogRequest: CatalogProductRequestRow | null): {
  price: number | null;
  stock: number | null;
} {
  return {
    price: catalogRequest?.requested_price_amount ?? null,
    stock: catalogRequest?.requested_stock_quantity ?? null,
  };
}

const MIXED_COMMERCE_APPLIED_MESSAGE =
  "Η τιμή/το απόθεμα ενημερώθηκαν άμεσα. Οι αλλαγές προϊόντος στάλθηκαν για έγκριση.";

const MIXED_COMMERCE_PENDING_CATALOG_CONFIRM_MESSAGE =
  "Η τιμή/το απόθεμα ενημερώθηκαν άμεσα. Επιβεβαιώστε τις αλλαγές καταλόγου παρακάτω.";

function normalizeMoneyInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function normalizeStockInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null;
  return parsed;
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseAttributesJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = raw.trim().length ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function attributesJsonEqual(a: string, b: string): boolean {
  const left = parseAttributesJson(a);
  const right = parseAttributesJson(b);
  if (!left || !right) return a.trim() === b.trim();
  return (
    JSON.stringify(canonicalizeAttributesForComparison(left)) ===
    JSON.stringify(canonicalizeAttributesForComparison(right))
  );
}

type ProductEditDraft = {
  requestId: string;
  baselineUpdatedAt: string;
  title: string;
  brand: string;
  model: string;
  categoryId: string;
  slugSuggestion: string;
  gtin: string;
  mpn: string;
  description: string;
  price: string;
  stock: string;
  offerState: string;
  attributesJson: string;
};

function toEditDraft(
  product: StoreOsProduct,
  catalogRequest: CatalogProductRequestRow | null,
  linkedOffer: VendorDashboardOfferRow | null,
): ProductEditDraft {
  const attributeValues = catalogRequest?.attribute_payload?.values ?? {};
  const price =
    linkedOffer != null
      ? String(linkedOffer.price_amount)
      : product.price == null
        ? ""
        : String(product.price);
  const stock =
    linkedOffer != null
      ? linkedOffer.stock_quantity == null
        ? ""
        : String(linkedOffer.stock_quantity)
      : product.stock == null
        ? ""
        : String(product.stock);

  return {
    requestId: product.id,
    baselineUpdatedAt: product.updatedAt,
    title: product.title ?? "",
    brand: product.brand ?? "",
    model: product.model ?? "",
    categoryId: product.categoryId ?? "",
    slugSuggestion: product.slugSuggestion ?? "",
    gtin: product.gtin ?? "",
    mpn: product.mpn ?? "",
    description: product.description ?? "",
    price,
    stock,
    offerState: linkedOffer?.state ?? "active",
    attributesJson: JSON.stringify(attributeValues, null, 2),
  };
}

function hasCatalogFieldChanges(baseline: ProductEditDraft, draft: ProductEditDraft): boolean {
  if (normalizeOptionalText(baseline.title) !== normalizeOptionalText(draft.title)) return true;
  if (normalizeOptionalText(baseline.brand) !== normalizeOptionalText(draft.brand)) return true;
  if (normalizeOptionalText(baseline.model) !== normalizeOptionalText(draft.model)) return true;
  if (normalizeOptionalText(baseline.categoryId) !== normalizeOptionalText(draft.categoryId)) return true;
  if (normalizeOptionalText(baseline.slugSuggestion) !== normalizeOptionalText(draft.slugSuggestion)) return true;
  if (normalizeOptionalText(baseline.gtin) !== normalizeOptionalText(draft.gtin)) return true;
  if (normalizeOptionalText(baseline.mpn) !== normalizeOptionalText(draft.mpn)) return true;
  if (normalizeOptionalText(baseline.description) !== normalizeOptionalText(draft.description)) return true;
  return !attributesJsonEqual(baseline.attributesJson, draft.attributesJson);
}

function hasCommerceFieldChanges(baseline: ProductEditDraft, draft: ProductEditDraft): boolean {
  if (normalizeMoneyInput(baseline.price) !== normalizeMoneyInput(draft.price)) return true;
  if (normalizeStockInput(baseline.stock) !== normalizeStockInput(draft.stock)) return true;
  if (baseline.offerState !== draft.offerState) return true;
  return false;
}

type ProductEditModalProps = {
  product: StoreOsProduct;
  vendorId: string;
  catalogRequest: CatalogProductRequestRow | null;
  linkedOffer: VendorDashboardOfferRow | null;
  onClose: () => void;
  onSaved: () => void;
};

function ProductEditModal({
  product,
  vendorId,
  catalogRequest,
  linkedOffer,
  onClose,
  onSaved,
}: ProductEditModalProps) {
  const baselineDraftRef = useRef<ProductEditDraft>(toEditDraft(product, catalogRequest, linkedOffer));
  const [draft, setDraft] = useState<ProductEditDraft>(() => toEditDraft(product, catalogRequest, linkedOffer));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [majorConfirmation, setMajorConfirmation] = useState<{ visible: boolean; fields: string[] }>({
    visible: false,
    fields: [],
  });

  const hasLiveOffer = linkedOffer != null;
  const isApprovedProduct = product.status === "active";

  useEffect(() => {
    const nextBaseline = toEditDraft(product, catalogRequest, linkedOffer);
    baselineDraftRef.current = nextBaseline;
    setDraft(nextBaseline);
    setErrorMessage(null);
    setSuccessMessage(null);
    setMajorConfirmation({ visible: false, fields: [] });
  }, [product, catalogRequest, linkedOffer]);

  function onChange<K extends keyof ProductEditDraft>(key: K, value: ProductEditDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrorMessage(null);
  }

  function editModalSubtitle(): string {
    if (isApprovedProduct && hasLiveOffer) {
      return "Τιμή, απόθεμα και κατάσταση προσφοράς ενημερώνονται άμεσα. Αλλαγές στα στοιχεία καταλόγου απαιτούν έγκριση.";
    }
    if (product.status === "pending") {
      return "Οι αλλαγές στα στοιχεία καταλόγου υποβάλλονται για έγκριση.";
    }
    return "Αλλαγές στα στοιχεία καταλόγου απαιτούν έγκριση.";
  }

  async function applyCommerceEdit(): Promise<ApplyCatalogRequestCommerceEditResult | null> {
    const priceValue = normalizeMoneyInput(draft.price);
    const stockValue = normalizeStockInput(draft.stock);

    if (priceValue == null) {
      setErrorMessage("Η τιμή δεν είναι έγκυρος αριθμός.");
      return null;
    }
    if (stockValue == null) {
      setErrorMessage("Το απόθεμα πρέπει να είναι ακέραιος αριθμός.");
      return null;
    }
    if (!hasLiveOffer) {
      setErrorMessage("Δεν βρέθηκε ενεργή προσφορά για άμεση ενημέρωση τιμής/αποθέματος.");
      return null;
    }

    return applyCatalogRequestCommerceEditAction({
      requestId: draft.requestId,
      vendorId,
      priceAmount: priceValue,
      stockQuantity: stockValue,
      state: draft.offerState as "draft" | "active" | "paused" | "archived",
    });
  }

  async function submit(confirmMajor: boolean) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const baseline = baselineDraftRef.current;
      const catalogChanged = hasCatalogFieldChanges(baseline, draft);
      const commerceChanged = hasCommerceFieldChanges(baseline, draft);

      if (!catalogChanged && !commerceChanged) {
        setSuccessMessage("Δεν υπάρχουν αλλαγές για αποθήκευση.");
        return;
      }

      if (!catalogChanged && commerceChanged) {
        const result = await applyCommerceEdit();
        if (!result) return;
        handleCommerceActionResult(result);
        return;
      }

      const attributes = parseAttributesJson(draft.attributesJson);
      if (!attributes) {
        setErrorMessage("Τα χαρακτηριστικά πρέπει να είναι έγκυρο JSON αντικείμενο.");
        return;
      }

      let commerceApplied = false;
      if (commerceChanged) {
        const commerceResult = await applyCommerceEdit();
        if (!commerceResult) return;
        if (!commerceResult.ok) {
          handleCommerceActionResult(commerceResult);
          return;
        }
        commerceApplied = true;
      }

      const catalogCommerceBaseline = catalogRequestCommerceBaseline(catalogRequest);
      const catalogResult = await editCatalogProductRequestAction({
        requestId: draft.requestId,
        vendorId,
        baselineUpdatedAt: draft.baselineUpdatedAt,
        title: draft.title,
        brand: draft.brand || null,
        model: draft.model || null,
        categoryId: draft.categoryId || null,
        slugSuggestion: draft.slugSuggestion,
        gtin: draft.gtin || null,
        mpn: draft.mpn || null,
        description: draft.description || null,
        attributes,
        price: catalogCommerceBaseline.price,
        stock: catalogCommerceBaseline.stock,
        confirmMajor,
      });

      handleCatalogActionResult(catalogResult, commerceApplied);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCommerceActionResult(result: ApplyCatalogRequestCommerceEditResult) {
    if (result.ok) {
      setMajorConfirmation({ visible: false, fields: [] });
      setSuccessMessage(result.message);
      onSaved();
      return;
    }

    setMajorConfirmation({ visible: false, fields: [] });
    setErrorMessage(result.message);
  }

  function handleCatalogActionResult(
    result: EditCatalogProductRequestActionResult,
    commerceApplied = false,
  ) {
    if (result.ok) {
      setMajorConfirmation({ visible: false, fields: [] });
      if (commerceApplied && result.kind === "major_revision_submitted") {
        setSuccessMessage(MIXED_COMMERCE_APPLIED_MESSAGE);
      } else {
        setSuccessMessage(result.message);
      }
      if (result.kind === "minor_applied" || result.kind === "major_revision_submitted") {
        onSaved();
      }
      return;
    }

    if (result.kind === "requires_major_confirmation") {
      if (commerceApplied) {
        setSuccessMessage(MIXED_COMMERCE_PENDING_CATALOG_CONFIRM_MESSAGE);
      }
      setMajorConfirmation({ visible: true, fields: result.majorFields });
      return;
    }

    setMajorConfirmation({ visible: false, fields: [] });
    setErrorMessage(result.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-edit-title"
        className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="product-edit-title" className="text-base font-semibold text-slate-900">
              Επεξεργασία προϊόντος
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{editModalSubtitle()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Κλείσιμο
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-auto px-5 py-4 sm:px-6">
          {errorMessage ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMessage}</p> : null}
          {successMessage ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMessage}</p> : null}

          {hasLiveOffer ? (
            <section className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Εμπορική προσφορά (άμεση ενημέρωση)
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-600">
                  Τιμή
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={draft.price}
                    onChange={(e) => onChange("price", e.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Απόθεμα
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={draft.stock}
                    onChange={(e) => onChange("stock", e.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Κατάσταση προσφοράς
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={draft.offerState}
                    onChange={(e) => onChange("offerState", e.target.value)}
                  >
                    <option value="draft">Πρόχειρο</option>
                    <option value="active">Ενεργό</option>
                    <option value="paused">Σε παύση</option>
                    <option value="archived">Αρχειοθετημένο</option>
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            {isApprovedProduct && hasLiveOffer ? (
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Στοιχεία καταλόγου (απαιτεί έγκριση)
              </h3>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-600">
                Τίτλος
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.title} onChange={(e) => onChange("title", e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                Μάρκα
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.brand} onChange={(e) => onChange("brand", e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                Μοντέλο
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.model} onChange={(e) => onChange("model", e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                Category ID
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.categoryId} onChange={(e) => onChange("categoryId", e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                Slug
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.slugSuggestion} onChange={(e) => onChange("slugSuggestion", e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                GTIN
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.gtin} onChange={(e) => onChange("gtin", e.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                MPN
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.mpn} onChange={(e) => onChange("mpn", e.target.value)} />
              </label>
              {!hasLiveOffer ? (
                <>
                  <label className="text-xs text-slate-600">
                    Τιμή
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.price} onChange={(e) => onChange("price", e.target.value)} />
                  </label>
                  <label className="text-xs text-slate-600">
                    Απόθεμα
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={draft.stock} onChange={(e) => onChange("stock", e.target.value)} />
                  </label>
                </>
              ) : null}
            </div>

            <label className="block text-xs text-slate-600">
              Περιγραφή / Προδιαγραφές
              <textarea className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={4} value={draft.description} onChange={(e) => onChange("description", e.target.value)} />
            </label>
            <label className="block text-xs text-slate-600">
              Χαρακτηριστικά (JSON object)
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                rows={8}
                value={draft.attributesJson}
                onChange={(e) => onChange("attributesJson", e.target.value)}
              />
            </label>
          </section>
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση"}
          </button>
        </footer>
      </div>

      {majorConfirmation.visible ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" role="dialog" aria-modal="true">
            <h3 className="text-sm font-semibold text-slate-900">Επιβεβαίωση σημαντικής αλλαγής</h3>
            <p className="mt-2 text-sm text-slate-600">
              Η αλλαγή αυτών των στοιχείων θα στείλει ξανά το προϊόν για έγκριση.
            </p>
            {majorConfirmation.fields.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">Πεδία: {majorConfirmation.fields.join(", ")}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMajorConfirmation({ visible: false, fields: [] })}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Συνέχεια
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
