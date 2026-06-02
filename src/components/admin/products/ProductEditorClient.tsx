"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CategoryNode } from "@/lib/admin/category-tree-model";
import {
  fetchCategoryTree,
  loadTenantContext,
  rowsToCategoryTree,
  type TenantContext,
} from "@/lib/admin/categories-supabase";
import { ProductImageUploader } from "@/components/admin/products/ProductImageUploader";
import {
  deleteProductImageById,
  listProductImages,
  setPrimaryImageSafe,
  uploadProductImageWithRollback,
  type ProductImageRow,
} from "@/lib/admin/product-images-admin-service";
import {
  fetchProductAdminById,
  insertProductAdmin,
  updateProductAdmin,
} from "@/lib/admin/products-admin-service";
import type { ProductAdminDetail, ProductLifecycleState } from "@/lib/admin/products-admin-types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function flattenCategoryOptions(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const pad = depth > 0 ? `${"— ".repeat(depth)}` : "";
    out.push({ id: n.id, label: `${pad}${n.name}`.trim() });
    if (n.children.length) out.push(...flattenCategoryOptions(n.children, depth + 1));
  }
  return out;
}

type Props = { mode: "new" } | { mode: "edit"; productId: string };

export function ProductEditorClient(props: Props) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const [ctx, setCtx] = useState<TenantContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(props.mode === "edit");
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; label: string }[]>([]);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [slug, setSlug] = useState("");
  const [state, setState] = useState<ProductLifecycleState>("draft");
  const [categoryId, setCategoryId] = useState<string>("");
  const [images, setImages] = useState<ProductImageRow[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const editProductId = props.mode === "edit" ? props.productId : null;

  const hydrate = useCallback(async () => {
    if (!editProductId) return;
    const sb = supabaseRef.current;
    const tenantId = ctx?.tenantId;
    if (!sb || !tenantId || !ctx?.isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchProductAdminById(sb, tenantId, editProductId);
      if (!row) {
        setError("Το προϊόν δεν βρέθηκε.");
        return;
      }
      applyRow(row);
      const imgs = await listProductImages(sb, tenantId, editProductId);
      setImages(imgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [ctx?.isPlatformAdmin, ctx?.tenantId, editProductId]);

  function applyRow(row: ProductAdminDetail) {
    setTitle(row.title);
    setBrand(row.brand ?? "");
    setModel(row.model ?? "");
    setSlug(row.slug);
    setState(row.state);
    setCategoryId(row.category_id ?? "");
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        supabaseRef.current = sb;
        const c = await loadTenantContext(sb);
        if (cancelled) return;
        if (!c) {
          setError("Δεν βρέθηκε tenant στο profile.");
          return;
        }
        setCtx(c);
        const catRows = await fetchCategoryTree(sb, c.tenantId);
        if (cancelled) return;
        setCategoryOptions(flattenCategoryOptions(rowsToCategoryTree(catRows)));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const sb = supabaseRef.current;
      if (!sb || !ctx?.isPlatformAdmin) return;
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setError("Ο τίτλος είναι υποχρεωτικός.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        if (props.mode === "new") {
          const { id } = await insertProductAdmin(sb, ctx, {
            title: trimmedTitle,
            brand: brand.trim() || null,
            model: model.trim() || null,
            slug: slug.trim() || null,
            categoryId: categoryId || null,
            state,
          });
          for (let i = 0; i < pendingFiles.length; i++) {
            await uploadProductImageWithRollback(sb, ctx, {
              productId: id,
              file: pendingFiles[i]!,
              sortOrder: i,
              setAsPrimary: i === 0,
            });
          }
          setPendingFiles([]);
          router.push(`/admin/products/${id}`);
          return;
        }
        if (props.mode === "edit" && editProductId) {
          await updateProductAdmin(sb, ctx, editProductId, {
            title: trimmedTitle,
            brand: brand.trim() || null,
            model: model.trim() || null,
            slug: slug.trim() || slugifyFallback(trimmedTitle),
            categoryId: categoryId || null,
            state,
          });
          router.push("/admin/products?saved=1");
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [brand, categoryId, ctx, editProductId, model, pendingFiles, props.mode, router, slug, state, title],
  );

  const refreshImages = useCallback(async () => {
    const sb = supabaseRef.current;
    const tenantId = ctx?.tenantId;
    if (!sb || !tenantId || !editProductId) return;
    const imgs = await listProductImages(sb, tenantId, editProductId);
    setImages(imgs);
  }, [ctx?.tenantId, editProductId]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (props.mode === "new") {
        setPendingFiles((prev) => [...prev, file]);
        return;
      }
      const sb = supabaseRef.current;
      if (!sb || !ctx || !editProductId) return;
      setImageBusy(true);
      try {
        await uploadProductImageWithRollback(sb, ctx, {
          productId: editProductId,
          file,
          sortOrder: images.length,
          setAsPrimary: images.length === 0,
        });
        await refreshImages();
      } finally {
        setImageBusy(false);
      }
    },
    [ctx, editProductId, images.length, props.mode, refreshImages],
  );

  const handleImageRemove = useCallback(
    async (imageId: string) => {
      if (props.mode === "new") {
        const idx = Number(imageId.replace("pending-", ""));
        if (!Number.isNaN(idx)) {
          setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
        }
        return;
      }
      const sb = supabaseRef.current;
      const tenantId = ctx?.tenantId;
      if (!sb || !tenantId || !editProductId) return;
      setImageBusy(true);
      try {
        await deleteProductImageById(sb, tenantId, editProductId, imageId);
        await refreshImages();
      } finally {
        setImageBusy(false);
      }
    },
    [ctx?.tenantId, editProductId, props.mode, refreshImages],
  );

  const handleSetPrimary = useCallback(
    async (imageId: string) => {
      const sb = supabaseRef.current;
      const tenantId = ctx?.tenantId;
      if (!sb || !tenantId || !editProductId) return;
      setImageBusy(true);
      try {
        await setPrimaryImageSafe(sb, tenantId, editProductId, imageId);
        await refreshImages();
      } finally {
        setImageBusy(false);
      }
    },
    [ctx?.tenantId, editProductId, refreshImages],
  );

  const uploaderImages: ProductImageRow[] =
    props.mode === "new"
      ? pendingFiles.map((f, i) => ({
          id: `pending-${i}`,
          tenant_id: ctx?.tenantId ?? "",
          product_id: "",
          storage_path: "",
          public_url: URL.createObjectURL(f),
          sort_order: i,
          is_primary: i === 0,
          created_at: "",
        }))
      : images;

  if (ctx && !ctx.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Μόνο <strong>platform_admin</strong> μπορεί να επεξεργάζεται καταλόγους προϊόντων.
        </p>
        <Link href="/admin/products" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Επιστροφή στη λίστα
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-slate-600">
        Φόρτωση…
        <div className="mt-4">
          <Link href="/admin/products" className="text-sm font-semibold text-blue-700 hover:underline">
            ← Επιστροφή
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-900">{props.mode === "new" ? "Νέο product template" : "Επεξεργασία"}</h1>
        <Link href="/admin/products" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Λίστα
        </Link>
      </div>

      {error ? <p className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p> : null}

      <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4 rounded-xl border-2 border-blue-300/70 bg-white p-5 shadow-md ring-1 ring-blue-200/60">
        <label className="block text-xs font-semibold uppercase text-blue-900/90">
          Τίτλος *
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border-2 border-blue-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold uppercase text-blue-900/90">
          Brand
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-blue-200 px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold uppercase text-blue-900/90">
          Model
          <input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-blue-200 px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold uppercase text-blue-900/90">
          Slug {props.mode === "new" ? "(κενό = αυτόματο)" : ""}
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-blue-200 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block text-xs font-semibold uppercase text-blue-900/90">
          Κατάσταση
          <select
            value={state}
            onChange={(e) => setState(e.target.value as ProductLifecycleState)}
            className="mt-1 w-full rounded-lg border-2 border-blue-200 px-2 py-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase text-blue-900/90">
          Κατηγορία
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-blue-200 px-2 py-2 text-sm"
          >
            <option value="">—</option>
            {categoryOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <ProductImageUploader
          images={uploaderImages}
          busy={saving || imageBusy}
          allowSetPrimary={props.mode === "edit"}
          onUpload={handleImageUpload}
          onRemove={handleImageRemove}
          onSetPrimary={handleSetPrimary}
        />

        <div className="flex flex-wrap gap-2 border-t border-blue-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Αποθήκευση…" : props.mode === "new" ? "Δημιουργία" : "Αποθήκευση"}
          </button>
        </div>
      </form>
    </div>
  );
}

function slugifyFallback(title: string): string {
  const t = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return t || "product";
}
