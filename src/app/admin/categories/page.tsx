"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CategoryNode } from "@/lib/admin/category-tree-model";
import {
  createCategoryRemote,
  DEFAULT_MARKETPLACE_ROOT_CATEGORY_NAMES_EL,
  deleteCategoryRemote,
  ensureDefaultMarketplaceRootCategories,
  fetchCategoryTree,
  loadTenantContext,
  rowsToCategoryTree,
  updateCategoryRemote,
  type TenantContext,
} from "@/lib/admin/categories-supabase";

type NodeLocation = {
  path: number[];
  node: CategoryNode;
};

type DeleteConfirmState = { kind: "node"; id: string };

type CreateModalState = { kind: "main" } | { kind: "sub"; parentId: string };

function norm(s: string) {
  return s.toLocaleLowerCase("el-GR");
}

function sortNodes(nodes: CategoryNode[]) {
  return [...nodes].sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)));
}

function collectAllIds(nodes: CategoryNode[]): string[] {
  const out: string[] = [];
  const walk = (n: CategoryNode) => {
    out.push(n.id);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

function findLocation(roots: CategoryNode[], id: string, pathPrefix: number[] = []): NodeLocation | null {
  for (let i = 0; i < roots.length; i++) {
    const n = roots[i];
    if (n.id === id) return { path: [...pathPrefix, i], node: n };
    const inner = findLocation(n.children, id, [...pathPrefix, i]);
    if (inner) return inner;
  }
  return null;
}

function getAtPath(roots: CategoryNode[], path: number[]): CategoryNode | null {
  if (path.length === 0) return null;
  let cur: CategoryNode = roots[path[0]];
  if (!cur) return null;
  for (let k = 1; k < path.length; k++) {
    cur = cur.children[path[k]];
    if (!cur) return null;
  }
  return cur;
}

function nextOrderAmong(siblings: CategoryNode[]) {
  if (siblings.length === 0) return 1;
  return Math.max(...siblings.map((s) => s.order)) + 1;
}

function collectSubtreeIds(node: CategoryNode): string[] {
  const ids: string[] = [node.id];
  for (const c of node.children) {
    ids.push(...collectSubtreeIds(c));
  }
  return ids;
}

function nodeMatchesQuery(n: CategoryNode, q: string): boolean {
  const label = n.emoji ? `${n.emoji} ${n.name}` : n.name;
  return norm(label).includes(q) || norm(n.name).includes(q);
}

function filterTree(nodes: CategoryNode[], q: string): CategoryNode[] {
  if (!q) return nodes;
  const out: CategoryNode[] = [];
  for (const n of nodes) {
    const childFiltered = filterTree(n.children, q);
    const selfMatch = nodeMatchesQuery(n, q);
    if (selfMatch) {
      out.push({ ...n, children: childFiltered.length ? childFiltered : n.children });
    } else if (childFiltered.length) {
      out.push({ ...n, children: childFiltered });
    }
  }
  return out;
}

function displayName(n: CategoryNode) {
  const t = n.name.trim();
  if (!t) return <span className="italic text-slate-500">Χωρίς τίτλο</span>;
  return t;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const [tenantCtx, setTenantCtx] = useState<TenantContext | null>(null);
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  const reloadCategories = useCallback(async () => {
    const sb = supabaseRef.current;
    if (!sb || !tenantCtx) return;
    const rows = await fetchCategoryTree(sb, tenantCtx.tenantId);
    const tree = rowsToCategoryTree(rows);
    setCategories(tree);
    setOpen((o) => {
      const next = { ...o };
      collectAllIds(tree).forEach((cid) => {
        if (next[cid] === undefined) next[cid] = true;
      });
      return next;
    });
  }, [tenantCtx]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        supabaseRef.current = sb;
        const ctx = await loadTenantContext(sb);
        if (cancelled) return;
        if (!ctx) {
          setHydrationError(
            "Δεν βρέθηκε tenant στο profile. Τρέξε το seed admin μετά το migration ώστε το profile να έχει tenant_id."
          );
          return;
        }
        setTenantCtx(ctx);
        const rows = await fetchCategoryTree(sb, ctx.tenantId);
        if (cancelled) return;
        const tree = rowsToCategoryTree(rows);
        setCategories(tree);
        setOpen((o) => {
          const next = { ...o };
          collectAllIds(tree).forEach((cid) => {
            if (next[cid] === undefined) next[cid] = true;
          });
          return next;
        });
      } catch (e) {
        if (!cancelled) {
          setHydrationError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [createModal, setCreateModal] = useState<CreateModalState | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDraftFile, setCreateDraftFile] = useState<File | null>(null);
  const [createDraftObjectUrl, setCreateDraftObjectUrl] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState("1");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftObjectUrl, setDraftObjectUrl] = useState<string | null>(null);

  const draftObjectUrlRef = useRef<string | null>(null);
  const createImageDraftRef = useRef<string | null>(null);
  const createNameInputRef = useRef<HTMLInputElement | null>(null);

  const revokeDraftUrl = useCallback(() => {
    const u = draftObjectUrlRef.current;
    if (u) URL.revokeObjectURL(u);
    draftObjectUrlRef.current = null;
    setDraftObjectUrl(null);
  }, []);

  const revokeCreateDraftUrl = useCallback(() => {
    const u = createImageDraftRef.current;
    if (u) URL.revokeObjectURL(u);
    createImageDraftRef.current = null;
    setCreateDraftObjectUrl(null);
  }, []);

  const closeCreateModal = useCallback(() => {
    revokeCreateDraftUrl();
    setCreateDraftFile(null);
    setCreateName("");
    setCreateModal(null);
  }, [revokeCreateDraftUrl]);

  const sortedRoots = useMemo(() => sortNodes(categories), [categories]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return filterTree(sortedRoots, q);
  }, [query, sortedRoots]);

  const editLoc = useMemo(() => (editNodeId ? findLocation(categories, editNodeId) : null), [editNodeId, categories]);

  const editingNode = editLoc?.node;
  const editingAncestors = useMemo(() => {
    if (!editLoc) return [] as CategoryNode[];
    const path = editLoc.path;
    const acc: CategoryNode[] = [];
    for (let d = 0; d < path.length - 1; d++) {
      const p = path.slice(0, d + 1);
      const n = getAtPath(categories, p);
      if (n) acc.push(n);
    }
    return acc;
  }, [editLoc, categories]);

  const closeModal = useCallback(() => {
    revokeDraftUrl();
    setDraftFile(null);
    setEditNodeId(null);
  }, [revokeDraftUrl]);

  const openCreateMain = useCallback(() => {
    closeModal();
    setDeleteConfirm(null);
    revokeCreateDraftUrl();
    setCreateDraftFile(null);
    setCreateName("");
    setCreateModal({ kind: "main" });
  }, [closeModal, revokeCreateDraftUrl]);

  const openCreateSub = useCallback(
    (parentId: string) => {
      closeModal();
      setDeleteConfirm(null);
      revokeCreateDraftUrl();
      setCreateDraftFile(null);
      setCreateName("");
      setCreateModal({ kind: "sub", parentId });
    },
    [closeModal, revokeCreateDraftUrl]
  );

  const openEdit = useCallback(
    (id: string) => {
      closeCreateModal();
      const loc = findLocation(categories, id);
      if (!loc) return;
      revokeDraftUrl();
      setDraftFile(null);
      setEditNodeId(id);
      setFormName(loc.node.name);
      setFormOrder(String(loc.node.order));
    },
    [categories, revokeDraftUrl, closeCreateModal]
  );

  const handleCreateSubmit = useCallback(async () => {
    if (!createModal) return;
    const name = createName.trim();
    if (!name) return;

    const sb = supabaseRef.current;
    const ctx = tenantCtx;
    if (!sb || !ctx) {
      setHydrationError("Supabase ή tenant context δεν είναι διαθέσιμα.");
      return;
    }

    try {
      let sortOrder = 1;
      let level = 0;
      let parentId: string | null = null;
      let emoji: string | null = "📂";

      if (createModal.kind === "main") {
        sortOrder = categories.length ? Math.max(...categories.map((c) => c.order)) + 1 : 1;
        level = 0;
        parentId = null;
        emoji = "📂";
      } else {
        parentId = createModal.parentId;
        const loc = findLocation(categories, parentId);
        if (!loc) return;
        sortOrder = nextOrderAmong(loc.node.children);
        level = loc.node.level + 1;
        emoji = null;
      }

      const newId = await createCategoryRemote(sb, ctx, {
        parentId,
        name,
        sortOrder,
        level,
        emoji,
        imageFile: createDraftFile,
      });

      setOpen((o) => ({ ...o, [newId]: true }));
      closeCreateModal();
      await reloadCategories();
    } catch (e) {
      setHydrationError(e instanceof Error ? e.message : String(e));
    }
  }, [createModal, createName, createDraftFile, closeCreateModal, categories, tenantCtx, reloadCategories]);

  const onPickCreateImage = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      revokeCreateDraftUrl();
      const url = URL.createObjectURL(file);
      createImageDraftRef.current = url;
      setCreateDraftObjectUrl(url);
      setCreateDraftFile(file);
    },
    [revokeCreateDraftUrl]
  );

  const closeDeleteConfirm = useCallback(() => setDeleteConfirm(null), []);

  const requestDeleteCategory = useCallback(
    (id: string) => {
      const loc = findLocation(categories, id);
      if (!loc) return;
      closeCreateModal();
      setDeleteConfirm({ kind: "node", id });
    },
    [categories, closeCreateModal]
  );

  const executeDeleteNode = useCallback(
    async (id: string) => {
      const sb = supabaseRef.current;
      const ctx = tenantCtx;
      if (!sb || !ctx) return;
      const loc = findLocation(categories, id);
      const removedIds = loc ? collectSubtreeIds(loc.node) : [];
      try {
        await deleteCategoryRemote(sb, ctx, id);
        if (removedIds.length > 0) {
          setOpen((o) => {
            const next = { ...o };
            for (const rid of removedIds) {
              delete next[rid];
            }
            return next;
          });
        }
        if (editNodeId && removedIds.includes(editNodeId)) {
          closeModal();
        }
        await reloadCategories();
      } catch (e) {
        setHydrationError(e instanceof Error ? e.message : String(e));
      }
    },
    [categories, closeModal, editNodeId, reloadCategories, tenantCtx]
  );

  const [defaultRootsBusy, setDefaultRootsBusy] = useState(false);
  const [defaultRootsMsg, setDefaultRootsMsg] = useState<string | null>(null);

  const runDefaultRootCategories = useCallback(async () => {
    const sb = supabaseRef.current;
    const ctx = tenantCtx;
    if (!sb || !ctx) {
      setHydrationError("Supabase ή tenant context δεν είναι διαθέσιμα.");
      return;
    }
    setDefaultRootsBusy(true);
    setHydrationError(null);
    setDefaultRootsMsg(null);
    try {
      const r = await ensureDefaultMarketplaceRootCategories(sb, ctx);
      await reloadCategories();
      setDefaultRootsMsg(
        r.created === 0 && r.skipped === DEFAULT_MARKETPLACE_ROOT_CATEGORY_NAMES_EL.length
          ? "Όλες οι βασικές κύριες κατηγορίες υπήρχαν ήδη (χωρίς νέες εγγραφές)."
          : `Βασικές κατηγορίες: δημιουργήθηκαν ${r.created}, ήδη υπήρχαν (ίδιο όνομα στο root) ${r.skipped}.`,
      );
    } catch (e) {
      setHydrationError(e instanceof Error ? e.message : String(e));
    } finally {
      setDefaultRootsBusy(false);
    }
  }, [reloadCategories, tenantCtx]);

  const confirmDeleteModal = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await executeDeleteNode(deleteConfirm.id);
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, executeDeleteNode]);

  useEffect(() => {
    if (!editNodeId) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editNodeId, closeModal]);

  useEffect(() => {
    if (!deleteConfirm) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeDeleteConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteConfirm, closeDeleteConfirm]);

  useEffect(() => {
    if (!createModal) return;
    const id = requestAnimationFrame(() => {
      createNameInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [createModal]);

  useEffect(() => {
    if (!createModal) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeCreateModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createModal, closeCreateModal]);

  const onPickImage = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      revokeDraftUrl();
      const url = URL.createObjectURL(file);
      draftObjectUrlRef.current = url;
      setDraftObjectUrl(url);
      setDraftFile(file);
    },
    [revokeDraftUrl]
  );

  const handleSave = useCallback(async () => {
    if (!editNodeId) return;
    const id = editNodeId;
    const trimmed = formName.trim();

    const parsed = Number.parseInt(formOrder, 10);
    const targetOrder = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

    const loc0 = findLocation(categories, id);
    if (!loc0) return;

    const sb = supabaseRef.current;
    const ctx = tenantCtx;
    if (!sb || !ctx) {
      setHydrationError("Supabase ή tenant context δεν είναι διαθέσιμα.");
      return;
    }

    const currentUrl = loc0.node.imageDataUrl;
    const currentImageUrl = currentUrl && currentUrl.startsWith("http") ? currentUrl : null;

    try {
      await updateCategoryRemote(sb, ctx, id, {
        name: trimmed,
        sortOrder: targetOrder,
        imageFile: draftFile,
        currentImageUrl,
      });
      closeModal();
      await reloadCategories();
    } catch (e) {
      setHydrationError(e instanceof Error ? e.message : String(e));
    }
  }, [editNodeId, categories, formName, formOrder, draftFile, closeModal, tenantCtx, reloadCategories]);

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const modalPreviewSrc = draftObjectUrl ?? editingNode?.imageDataUrl ?? null;

  const siblingCountForEdit = useMemo(() => {
    if (!editLoc) return 1;
    const p = editLoc.path;
    if (p.length === 1) return categories.length;
    const parentPath = p.slice(0, -1);
    const parent = getAtPath(categories, parentPath);
    return parent?.children.length ?? 1;
  }, [editLoc, categories]);

  const isRootEdit = Boolean(editLoc && editLoc.path.length === 1);

  const parentBreadcrumb =
    editingAncestors.length > 0 ? editingAncestors.map((a) => (a.emoji ? `${a.emoji} ${a.name}`.trim() : a.name.trim() || "Χωρίς τίτλο")).join(" › ") : null;

  const createTargetParentBreadcrumb = useMemo(() => {
    if (!createModal || createModal.kind !== "sub") return null;
    const loc = findLocation(categories, createModal.parentId);
    if (!loc) return null;
    const path = loc.path;
    const chain: CategoryNode[] = [];
    for (let d = 0; d < path.length; d++) {
      const n = getAtPath(categories, path.slice(0, d + 1));
      if (n) chain.push(n);
    }
    if (!chain.length) return null;
    return chain.map((a) => (a.emoji ? `${a.emoji} ${a.name}`.trim() : a.name.trim() || "Χωρίς τίτλο")).join(" › ");
  }, [createModal, categories]);

  const renderNestedSubtree = (node: CategoryNode): ReactNode => {
    const expanded = open[node.id] !== false;
    const sorted = sortNodes(node.children);
    const hasKids = sorted.length > 0;
    return (
      <li key={node.id} className="border-b border-red-50/80 py-2.5 pr-2 last:border-b-0 sm:pr-3">
        <div className="flex flex-wrap items-center gap-2">
          {hasKids ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-800 transition hover:bg-red-50"
              aria-expanded={expanded}
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">{expanded ? "Σύμπτυξη" : "Ανάπτυξη"}</span>
            </button>
          ) : (
            <span className="inline-block w-8 shrink-0" aria-hidden />
          )}
          {node.imageDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob or remote URL */}
              <img src={node.imageDataUrl} alt="" className="h-8 w-8 shrink-0 rounded-md border border-red-200 object-cover" />
            </>
          ) : null}
          <span className="min-w-0 flex-1 pl-1 text-sm font-medium text-slate-800">{displayName(node)}</span>
          <span className="shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-red-900 ring-1 ring-red-200/70">
            Σειρά {node.order}
          </span>
          <div className="flex w-full shrink-0 justify-end gap-1 sm:w-auto">
            <button
              type="button"
              onClick={() => openCreateSub(node.id)}
              className="rounded border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 shadow-sm hover:bg-red-50"
            >
              + Υποκατηγορία
            </button>
            <button
              type="button"
              onClick={() => openEdit(node.id)}
              className="rounded border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-800 shadow-sm hover:bg-red-50"
            >
              Επεξεργασία
            </button>
            <button
              type="button"
              onClick={() => requestDeleteCategory(node.id)}
              className="rounded border border-red-200 bg-red-50/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-900 hover:bg-red-100"
            >
              Del
            </button>
          </div>
        </div>
        {expanded && hasKids ? (
          <ul className="ml-2 mt-1 border-l-2 border-red-100 pb-1 pl-3 sm:ml-6 sm:pl-4">{sorted.map((ch) => renderNestedSubtree(ch))}</ul>
        ) : null}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <p className="text-sm font-medium text-red-900/85">
        Κατηγορίες (nested tree · Supabase){" "}
        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">RLS</span>
      </p>
      {hydrationError ? (
        <p className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-900">{hydrationError}</p>
      ) : null}

      {defaultRootsMsg ? (
        <p className="rounded-lg border border-emerald-400/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">{defaultRootsMsg}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border-2 border-red-300/75 bg-white shadow-md shadow-red-900/[0.06] ring-1 ring-red-200/55">
        <div className="flex flex-col gap-4 border-b border-red-200 bg-red-50/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-cat-search" className="sr-only">
              Αναζήτηση κατηγοριών
            </label>
            <input
              id="admin-cat-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση κύριας ή υποκατηγορίας…"
              className="w-full rounded-lg border-2 border-red-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200/80"
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateMain}
              className="inline-flex items-center justify-center rounded-lg border-2 border-red-600 bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm sm:text-sm"
            >
              Προσθήκη κύριας
            </button>
            <button
              type="button"
              onClick={() => void runDefaultRootCategories()}
              disabled={defaultRootsBusy || !tenantCtx}
              className="inline-flex items-center justify-center rounded-lg border-2 border-amber-600 bg-amber-500 px-3 py-2 text-xs font-bold text-amber-950 shadow-sm hover:bg-amber-400 disabled:opacity-50 sm:text-sm"
              title="Δημιουργεί τις προκαθορισμένες κύριες κατηγορίες για το tenant σου μέσω Supabase (idempotent)."
            >
              {defaultRootsBusy
                ? "Προσθήκη βασικών…"
                : `Προσθήκη ${DEFAULT_MARKETPLACE_ROOT_CATEGORY_NAMES_EL.length} βασικών`}
            </button>
          </div>
        </div>

        <div className="divide-y divide-red-100 p-2 sm:p-3" aria-label="Κατηγορίες">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-red-800/80">Δεν βρέθηκαν κατηγορίες για την αναζήτηση.</p>
          ) : (
            filtered.map((cat) => {
              const expanded = open[cat.id] !== false;
              const subsSorted = sortNodes(cat.children);
              const hasKids = subsSorted.length > 0;
              return (
                <div key={cat.id} className="rounded-lg py-1">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 hover:bg-red-50/40 sm:px-3">
                    {hasKids ? (
                      <button
                        type="button"
                        onClick={() => toggle(cat.id)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-800 transition hover:bg-red-50"
                        aria-expanded={expanded}
                        aria-controls={`cat-panel-${cat.id}`}
                        id={`cat-trigger-${cat.id}`}
                      >
                        <svg
                          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="sr-only">{expanded ? "Σύμπτυξη" : "Ανάπτυξη"}</span>
                      </button>
                    ) : (
                      <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
                    )}
                    {cat.imageDataUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- blob or remote URL */}
                        <img
                          src={cat.imageDataUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg border border-red-200 object-cover"
                        />
                      </>
                    ) : null}
                    <div className="min-w-0 flex-1 font-bold text-slate-900">
                      <span className="mr-1.5" aria-hidden>
                        {cat.emoji ?? "📂"}
                      </span>
                      {displayName(cat)}
                      <span className="ml-2 inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-red-900 ring-1 ring-red-200/80">
                        Σειρά {cat.order}
                      </span>
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-red-700/80">{cat.children.length} υποκατηγορίες</span>
                    </div>
                    <div className="flex w-full shrink-0 flex-wrap justify-end gap-1.5 sm:w-auto">
                      <button
                        type="button"
                        onClick={() => openCreateSub(cat.id)}
                        className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-800 shadow-sm hover:bg-red-50"
                      >
                        + Υποκατηγορία
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(cat.id)}
                        className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-800 shadow-sm hover:bg-red-50"
                      >
                        Επεξεργασία
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteCategory(cat.id)}
                        className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-900 hover:bg-red-100"
                      >
                        Διαγραφή
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <ul
                      id={`cat-panel-${cat.id}`}
                      className="ml-2 border-l-2 border-red-100 pb-2 pl-4 sm:ml-11 sm:pl-5"
                      aria-labelledby={`cat-trigger-${cat.id}`}
                    >
                      {subsSorted.map((sub) => renderNestedSubtree(sub))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {deleteConfirm ? (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            aria-label="Κλείσιμο επιβεβαίωσης διαγραφής"
            onClick={closeDeleteConfirm}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-del-confirm-title"
            className="relative z-[106] w-full max-w-sm rounded-xl border-2 border-red-300/80 bg-white p-5 shadow-2xl shadow-red-900/25 ring-1 ring-red-200/60"
          >
            <h2 id="admin-del-confirm-title" className="text-center text-base font-semibold text-slate-900">
              Είστε σίγουροι;
            </h2>
            <p className="mt-3 text-center text-sm text-slate-600">
              Η κατηγορία και τα παιδιά της θα σημειωθούν ως διαγραμμένα (soft delete). Δεν γίνεται φυσική διαγραφή από τη βάση.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="min-w-[100px] rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteModal()}
                className="min-w-[100px] rounded-lg border-2 border-red-700 bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700"
              >
                Διαγραφή
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createModal ? (
        <div className="fixed inset-0 z-[102] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
            aria-label="Κλείσιμο διαλόγου δημιουργίας"
            onClick={closeCreateModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-cat-create-title"
            className="relative z-[103] max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-xl border-2 border-red-300/80 bg-white p-5 shadow-2xl shadow-red-900/20 ring-1 ring-red-200/60"
          >
            <h2 id="admin-cat-create-title" className="text-base font-bold text-slate-900">
              {createModal.kind === "main" ? "Νέα κύρια κατηγορία" : "Νέα υποκατηγορία"}
            </h2>
            <p className="mt-1 text-xs text-red-800/85">Συμπλήρωσε το όνομα και πάτησε Δημιουργία.</p>
            {createModal.kind === "sub" && createTargetParentBreadcrumb ? (
              <p className="mt-2 text-xs font-medium text-slate-700">
                Κάτω από: <span className="break-words">{createTargetParentBreadcrumb}</span>
              </p>
            ) : null}

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="admin-cat-create-name" className="block text-xs font-semibold uppercase tracking-wide text-red-900/90">
                  Όνομα κατηγορίας <span className="text-red-600">*</span>
                </label>
                <input
                  ref={createNameInputRef}
                  id="admin-cat-create-name"
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && createName.trim()) {
                      e.preventDefault();
                      void handleCreateSubmit();
                    }
                  }}
                  className="mt-1.5 w-full rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200/80"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-red-900/90">Εικόνα (προαιρετικό)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPickCreateImage}
                  className="mt-1.5 w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                />
                {createDraftObjectUrl ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Προεπισκόπηση</p>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview URLs */}
                    <img src={createDraftObjectUrl} alt="" className="mt-1 h-28 w-full max-w-xs rounded-lg border border-red-200 object-cover" />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Δεν έχει οριστεί εικόνα.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-red-100 pt-4">
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                disabled={!createName.trim()}
                onClick={() => void handleCreateSubmit()}
                className="rounded-lg border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
              >
                Δημιουργία
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editNodeId && editingNode ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" aria-label="Κλείσιμο διαλόγου" onClick={closeModal} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-cat-edit-title"
            className="relative z-[101] max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-xl border-2 border-red-300/80 bg-white p-5 shadow-2xl shadow-red-900/20 ring-1 ring-red-200/60"
          >
            <h2 id="admin-cat-edit-title" className="text-base font-bold text-slate-900">
              {isRootEdit ? "Επεξεργασία κατηγορίας" : "Επεξεργασία υποκατηγορίας"}
            </h2>
            <p className="mt-1 text-xs text-red-800/85">
              Μικρότερο order = πιο πάνω στη λίστα. Ίδιο order με άλλο στο ίδιο επίπεδο → swap.
            </p>
            {parentBreadcrumb ? (
              <p className="mt-2 text-xs font-medium text-slate-700">
                Γονική αλυσίδα: <span className="break-words">{parentBreadcrumb}</span>
              </p>
            ) : null}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-red-900/90">Εικόνα (προαιρετικό)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPickImage}
                  className="mt-1.5 w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                />
                {modalPreviewSrc ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Προεπισκόπηση</p>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview URLs */}
                    <img src={modalPreviewSrc} alt="" className="mt-1 h-28 w-full max-w-xs rounded-lg border border-red-200 object-cover" />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Δεν έχει οριστεί εικόνα.</p>
                )}
              </div>

              <div>
                <label htmlFor="admin-cat-name" className="block text-xs font-semibold uppercase tracking-wide text-red-900/90">
                  {isRootEdit ? "Όνομα κατηγορίας" : "Όνομα υποκατηγορίας"}
                </label>
                <input
                  id="admin-cat-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200/80"
                />
                {isRootEdit && editingNode.emoji ? (
                  <p className="mt-1 text-[11px] text-slate-500">Το emoji παραμένει: {editingNode.emoji}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="admin-cat-order" className="block text-xs font-semibold uppercase tracking-wide text-red-900/90">
                  Σειρά εμφάνισης (order)
                </label>
                <input
                  id="admin-cat-order"
                  type="number"
                  min={1}
                  value={formOrder}
                  onChange={(e) => setFormOrder(e.target.value)}
                  className="mt-1.5 w-full max-w-[140px] rounded-lg border-2 border-red-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200/80"
                />
                <p className="mt-1 text-[11px] text-slate-500">Order στο ίδιο επίπεδο (αδέλφια): έως {siblingCountForEdit} εγγραφές.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-red-100 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                className="rounded-lg border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700"
              >
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
