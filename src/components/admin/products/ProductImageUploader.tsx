"use client";

import { useRef, useState } from "react";

import {
  MAX_PRODUCT_IMAGES,
  type ProductImageRow,
  validateProductImageFile,
} from "@/lib/admin/product-images-admin-service";

type Props = {
  images: ProductImageRow[];
  busy: boolean;
  allowSetPrimary?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: (imageId: string) => Promise<void>;
  onSetPrimary: (imageId: string) => Promise<void>;
};

export function ProductImageUploader({
  images,
  busy,
  allowSetPrimary = true,
  onUpload,
  onRemove,
  onSetPrimary,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const canAdd = images.length < MAX_PRODUCT_IMAGES;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || busy) return;
    setLocalError(null);
    const remaining = MAX_PRODUCT_IMAGES - images.length;
    const files = Array.from(fileList).slice(0, remaining);

    for (const file of files) {
      const err = validateProductImageFile(file);
      if (err) {
        setLocalError(err);
        continue;
      }
      try {
        await onUpload(file);
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : String(e));
        break;
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3 rounded-lg border-2 border-blue-100 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-blue-900/90">
          Εικόνες προϊόντος ({images.length}/{MAX_PRODUCT_IMAGES})
        </p>
        {canAdd ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={busy}
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
            >
              Προσθήκη εικόνας
            </button>
          </>
        ) : null}
      </div>

      {localError ? <p className="text-sm text-red-800">{localError}</p> : null}

      {images.length === 0 ? (
        <p className="text-sm text-slate-600">Δεν υπάρχουν εικόνες. Η πρώτη εικόνα γίνεται κύρια για τη λίστα.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <li
              key={img.id}
              className={`relative overflow-hidden rounded-lg border-2 bg-white ${
                img.is_primary ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-200"
              }`}
            >
              <img src={img.public_url} alt="" className="aspect-square w-full object-cover" />
              <div className="flex flex-wrap gap-1 border-t border-slate-100 p-2">
                {allowSetPrimary ? (
                  !img.is_primary ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onSetPrimary(img.id)}
                      className="text-xs font-medium text-blue-800 hover:underline disabled:opacity-50"
                    >
                      Κύρια
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-blue-800">Κύρια</span>
                  )
                ) : img.is_primary ? (
                  <span className="text-xs font-semibold text-blue-800">Κύρια (μετά αποθήκευση)</span>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRemove(img.id)}
                  className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                >
                  Αφαίρεση
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
