"use client";

import { useFormState, useFormStatus } from "react-dom";

import { createOfferAction, updateOfferAction } from "@/actions/offers";
import { fallbackProductLabel } from "@/lib/vendor-enrichment-label";
import type { ProductOptionRow } from "@/modules/catalog/queries/product-queries";
import type { OfferActionResult } from "@/modules/offers/types/action-result";
import type { StoreProductListRow } from "@/modules/offers/types/store-product";

export type OfferFormVendorOption = { id: string; name: string };

type CreateProps = {
  mode: "create";
  vendors: OfferFormVendorOption[];
  defaultVendorId: string;
  products: ProductOptionRow[];
  /** When set and present in `products`, preselects catalog product (e.g. after approved catalog request). */
  defaultProductId?: string;
  /**
   * Allowlisted on the server (`resolveOffersPostActionRedirect`). When omitted, legacy `/dashboard/offers` is used.
   */
  offersSuccessRedirect?: string;
};

type EditProps = {
  mode: "edit";
  offer: StoreProductListRow;
  vendorId: string;
  readOnly?: boolean;
  offersSuccessRedirect?: string;
};

export type OfferFormProps = CreateProps | EditProps;

function SubmitButton({
  children,
  disabled,
  pendingLabel = "Αποθήκευση…",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-slate-900/15 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function ActionMessage({ state }: { state: OfferActionResult | null }) {
  if (!state || state.ok) {
    return null;
  }
  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
    >
      <span className="font-semibold">{state.code}</span>
      <span className="mx-1">·</span>
      {state.message}
    </div>
  );
}

export function OfferForm(props: OfferFormProps) {
  if (props.mode === "create") {
    return <OfferFormCreate {...props} />;
  }
  return <OfferFormEdit {...props} />;
}

function OfferFormCreate({ vendors, defaultVendorId, products, defaultProductId, offersSuccessRedirect }: CreateProps) {
  const [state, formAction] = useFormState(createOfferAction, null as OfferActionResult | null);
  const multi = vendors.length > 1;
  const resolvedProductDefault =
    defaultProductId && products.some((p) => p.id === defaultProductId) ? defaultProductId : "";

  return (
    <form action={formAction} className="mx-auto max-w-lg space-y-5">
      <ActionMessage state={state} />

      {offersSuccessRedirect ? <input type="hidden" name="offersSuccessRedirect" value={offersSuccessRedirect} /> : null}

      {multi ? (
        <label className="block text-sm font-medium text-slate-700">
          Κατάστημα
          <select
            name="vendorId"
            required
            defaultValue={defaultVendorId}
            className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm shadow-slate-900/5 outline-none ring-blue-900/10 focus:border-blue-900/40 focus:ring-4"
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

      {!multi && vendors[0] ? (
        <p className="text-sm text-slate-600">
          Κατάστημα: <span className="font-medium text-slate-900">{vendors[0].name}</span>
        </p>
      ) : null}

      <input type="hidden" name="listingVariantKey" value="" />
      <input type="hidden" name="currency" value="EUR" />

      <label className="block text-sm font-medium text-slate-700">
        Προϊόν
        <select
          name="productId"
          required
          defaultValue={resolvedProductDefault}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
        >
          <option value="">Επίλεξε προϊόν…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Τιμή
          <input
            name="priceAmount"
            type="number"
            min={0}
            step="0.01"
            required
            className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Ποσότητα αποθέματος
          <input
            name="stockQuantity"
            type="number"
            min={0}
            step={1}
            defaultValue={0}
            className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Κατάσταση προϊόντος
        <select
          name="condition"
          defaultValue="new"
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
        >
          <option value="new">Καινούριο</option>
          <option value="used">Μεταχειρισμένο</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Κατάσταση
        <select
          name="state"
          defaultValue="draft"
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
        >
          <option value="draft">Πρόχειρο</option>
          <option value="active">Ενεργό</option>
        </select>
      </label>

      <SubmitButton pendingLabel="Δημιουργία…">Δημιουργία Προσφοράς</SubmitButton>
    </form>
  );
}

function OfferFormEdit({ offer, vendorId, readOnly, offersSuccessRedirect }: EditProps) {
  const [state, formAction] = useFormState(updateOfferAction, null as OfferActionResult | null);
  const ro = !!readOnly;

  if (ro) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <p className="text-sm text-slate-600">
          Αυτή η προσφορά εμφανίζεται μόνο για ανάγνωση. Οι αλλαγές εφαρμόζονται μόνο όταν επιτρέπονται από τον ρόλο
          λογαριασμού και τις πολιτικές της βάσης.
        </p>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Προϊόν</dt>
            <dd className="font-medium text-slate-900">{offer.products?.title ?? fallbackProductLabel(offer.product_id)}</dd>
            {!offer.products ? <p className="mt-1 text-xs text-slate-500">Catalog metadata unavailable</p> : null}
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Τιμή</dt>
            <dd className="tabular-nums text-slate-800">{String(offer.price_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Απόθεμα</dt>
            <dd className="tabular-nums text-slate-800">{offer.stock_quantity ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Κατάσταση</dt>
            <dd className="capitalize text-slate-800">{offer.state}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-lg space-y-5">
      <input type="hidden" name="offerId" value={offer.id} />
      <input type="hidden" name="vendorId" value={vendorId} />
      {offersSuccessRedirect ? <input type="hidden" name="offersSuccessRedirect" value={offersSuccessRedirect} /> : null}

      <ActionMessage state={state} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
        <div>
          <span className="font-medium text-slate-900">Προϊόν:</span> {offer.products?.title ?? fallbackProductLabel(offer.product_id)}
          {!offer.products ? <p className="mt-1 text-xs text-slate-500">Archived or unavailable catalog template</p> : null}
        </div>
        <div className="mt-1">
          <span className="font-medium text-slate-900">Κατάσταση προϊόντος:</span>{" "}
          <span className="capitalize">{offer.condition}</span>
        </div>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Τιμή
        <input
          name="priceAmount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={String(offer.price_amount)}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Ποσότητα αποθέματος
        <input
          name="stockQuantity"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={offer.stock_quantity ?? 0}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Κατάσταση
        <select
          name="state"
          defaultValue={offer.state}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm shadow-slate-900/5 outline-none focus:border-blue-900/40 focus:ring-4 focus:ring-blue-900/10"
        >
          <option value="draft">Πρόχειρο</option>
          <option value="active">Ενεργό</option>
          <option value="paused">Σε παύση</option>
          <option value="archived">Αρχειοθετημένο</option>
        </select>
      </label>

      <SubmitButton>Αποθήκευση Αλλαγών</SubmitButton>
    </form>
  );
}
