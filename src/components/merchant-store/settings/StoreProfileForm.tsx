"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  updateVendorStoreProfileAction,
  type VendorStoreProfileActionResult,
} from "@/actions/vendor-store-profile";
import type { VendorStoreProfileRow } from "@/modules/vendors/queries/vendor-store-profile-queries";
import {
  storeOsCard,
  storeOsCardPad,
  storeOsGhostBtn,
  storeOsPrimaryBtn,
} from "@/components/merchant-store/os/store-os-tokens";

type Props = {
  vendorId: string;
  profile: VendorStoreProfileRow;
  canEdit: boolean;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={storeOsPrimaryBtn}>
      {pending ? "Αποθήκευση…" : "Αποθήκευση προφίλ"}
    </button>
  );
}

function ActionMessage({ state }: { state: VendorStoreProfileActionResult | null }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p className="text-sm text-emerald-800" role="status">
        Το προφίλ αποθηκεύτηκε.
      </p>
    );
  }
  return (
    <p className="text-sm text-rose-700" role="alert">
      {state.message}
    </p>
  );
}

export function StoreProfileForm({ vendorId, profile, canEdit }: Props) {
  const [state, formAction] = useFormState(updateVendorStoreProfileAction, null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  const hiddenLogoUrl = removeLogo ? "" : (profile.logo_url ?? "");

  const previewSrc = useMemo(() => {
    if (removeLogo) return null;
    if (localPreview) return localPreview;
    return profile.logo_url ?? null;
  }, [removeLogo, localPreview, profile.logo_url]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  function onLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    if (!file) {
      setLocalPreview(null);
      return;
    }
    setRemoveLogo(false);
    const url = URL.createObjectURL(file);
    blobRef.current = url;
    setLocalPreview(url);
  }

  function onRemoveLogo() {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    setLocalPreview(null);
    setRemoveLogo(true);
  }

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className={`${storeOsCard} ${storeOsCardPad} space-y-5`}
    >
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="logoUrl" value={hiddenLogoUrl} />
      <input type="hidden" name="removeLogo" value={removeLogo ? "1" : "0"} />
      <ActionMessage state={state} />

      {!canEdit ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Προβολή μόνο — μόνο ο ιδιοκτήτης ή ο διαχειριστής μπορεί να επεξεργαστεί το προφίλ καταστήματος.
        </p>
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        Όνομα καταστήματος
        <input
          name="name"
          type="text"
          required
          readOnly={!canEdit}
          defaultValue={profile.name}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm read-only:bg-slate-50 read-only:text-slate-600"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Περιγραφή
        <textarea
          name="description"
          rows={4}
          readOnly={!canEdit}
          defaultValue={profile.description ?? ""}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm read-only:bg-slate-50"
        />
      </label>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-slate-700">Λογότυπο καταστήματος</span>

        {previewSrc ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt=""
              className="h-16 w-16 rounded-lg border border-slate-200 object-contain bg-white"
            />
            <span className="text-xs text-slate-500">
              {localPreview && !removeLogo ? "Προεπισκόπηση (αποθηκεύεται με το κουμπί αποθήκευσης)" : "Τρέχον λογότυπο"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Δεν έχει οριστεί λογότυπο.</p>
        )}

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Επιλογή εικόνας
              <input
                name="logoFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={onLogoFileChange}
              />
            </label>
            {(previewSrc || profile.logo_url) && !removeLogo ? (
              <button type="button" className={storeOsGhostBtn} onClick={onRemoveLogo}>
                Αφαίρεση λογότυπου
              </button>
            ) : null}
            {removeLogo ? (
              <span className="text-xs text-amber-800">Το λογότυπο θα αφαιρεθεί με την αποθήκευση.</span>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-slate-500">PNG, JPEG ή WebP · έως 2 MB</p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Eshop URL <span className="font-normal text-slate-400">(προαιρετικό, HTTPS)</span>
        <input
          name="eshopUrl"
          type="url"
          readOnly={!canEdit}
          placeholder="https://…"
          defaultValue={profile.eshop_url ?? ""}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm read-only:bg-slate-50"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Email επικοινωνίας
        <input
          name="contactEmail"
          type="email"
          readOnly={!canEdit}
          defaultValue={profile.contact_email ?? ""}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm read-only:bg-slate-50"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Τηλέφωνο επικοινωνίας
        <input
          name="contactPhone"
          type="tel"
          readOnly={!canEdit}
          defaultValue={profile.contact_phone ?? ""}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm read-only:bg-slate-50"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Διεύθυνση <span className="font-normal text-slate-400">(προαιρετικό)</span>
        <input
          name="address"
          type="text"
          readOnly={!canEdit}
          defaultValue={profile.address ?? ""}
          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm read-only:bg-slate-50"
        />
      </label>

      {canEdit ? (
        <div className="flex flex-wrap gap-3 pt-2">
          <SubmitButton disabled={false} />
        </div>
      ) : null}
    </form>
  );
}
