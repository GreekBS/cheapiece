# Store OS Products — Architecture Guardrails

**Status:** Locked baseline (UI State Engine)  
**Scope:** `src/components/merchant-store/os/` Products module  
**Not:** DB source of truth, routing layer, or admin system (yet)

This document preserves the current deterministic architecture. **Do not break these rules when adding features.**

---

## Current architecture (correct pattern)

```
productsState  →  selectors  →  pure render layer
```

| Layer | Responsibility | Key files |
|-------|----------------|-----------|
| **State** | Single client-only dataset | `StoreOsProductsView` → `productsState` |
| **Selectors** | Pure derivation, no mutation | `filterProductsByTab`, `countProductsByTab`, `mapOfferToProduct` |
| **Render** | Presentational UI only | `StoreOsProductList`, `StoreOsProductTabNav`, `StoreOsProductCreateForm` |
| **Contracts** | Types, mappers, validators | `store-os-product-list-types.ts` |

`productsState` is **ephemeral UI working state**. It is NOT persistent backend state and NOT the database source of truth.

---

## Critical rules (do not break)

### 1. Single source of truth

`productsState` is the **only** authoritative product dataset inside the Products view.

**Do not:**
- Create additional local product arrays (`localProducts`, cached copies, etc.)
- Store filtered lists in separate state
- Introduce hidden temporary caches that shadow `productsState`

**Do:**
- Derive all product UI from `productsState` via pure selectors

### 2. Selector-only rendering

Pattern must always remain:

```
state → selector → render
```

**Components must not:**
- Filter products internally (except display formatting like price strings)
- Mutate `productsState`
- Encode business rules in render components

**Selectors live in** `store-os-product-list-types.ts` (or future dedicated selector module co-located with types).

### 3. Pure render layer

`StoreOsProductList` and any future product list/detail components must remain **presentational only**.

They receive **already-derived** props (e.g. `visibleProducts`) and render them. No hidden logic.

### 4. State update contract

All product dataset mutations go **only** through:

```ts
setProductsState(...)
```

**Do not:**
- Mutate arrays in place (`productsState.push(...)`, in-place `.sort()` on state)
- Store intermediate create results outside the commit handler
- Add side mutation paths (refs, module-level caches, context duplicates)

**Initial seed only:** `buildInitialProductsState(data.offers)` in `useState` initializer — one-time snapshot, not a parallel authority.

### 5. Create flow contract (deterministic)

New products must follow this **strict synchronous sequence** (see `commitProductCreateResult` in `StoreOsProductsView`):

1. `applyProductCreate(productsState, productDraft)` → `{ products, nextTab }`
2. `setProductsState(result.products)` — **first**
3. `setProductDraft(emptyProductDraft())`
4. `setIsCreateMode(false)`
5. `setActiveProductTab(result.nextTab)` — always `"pending"` for new products

**Invariants:**
- New products **always** get `status: "pending"`
- No async side effects inside this UI flow
- No backend writes until a dedicated sync phase is designed

### 6. Future status system (compatibility only)

Documented transitions (`FUTURE_ADMIN_STATUS_TRANSITIONS`):

| From | To |
|------|-----|
| `pending` | `active` |
| `active` | `inactive` |
| `inactive` | `active` |

**Do not** implement admin approval UI or transition logic yet. When implemented, transitions must still commit via `setProductsState` with validated status (`validateProductStatus`).

---

## File map (Products module)

| File | Role |
|------|------|
| `views/StoreOsProductsView.tsx` | State owner: `productsState`, `activeProductTab`, `isCreateMode`, `productDraft` |
| `store-os-product-list-types.ts` | Types, mappers, validators, selectors, `applyProductCreate` |
| `StoreOsProductList.tsx` | Pure list render |
| `StoreOsProductTabNav.tsx` | Tab UI (counts passed in, no filtering) |
| `StoreOsProductCreateForm.tsx` | Controlled draft form (no product list logic) |

**Out of scope for Products SSOT:** `MerchantStoreClientIsland`, Next.js routes, `data.offers` server fetch (seed input only).

---

## Approved evolution order

### Phase A — Real product schema UI (next correct step)

Extend `StoreOsProduct` / create form for richer catalog fields **without** breaking SSOT:

- images, SKU, barcode, stock, brand, category, attributes, variants, pricing, visibility

**Rules:**
- Extend the `StoreOsProduct` type and mappers — do not fork parallel models
- Keep `state → selector → render`
- UI-only until sync layer is explicitly designed

### Phase B — Admin approval workflow (later)

- Pending queue UI
- Approve / reject actions
- Moderation + audit log
- Status transitions via `setProductsState` + validator

### Phase C — Marketplace matching engine (later)

- Normalized catalog matching
- Attribute comparison, duplicate detection, standardization
- Likely a **separate panel or derived view** — still fed from `productsState` or a clearly named server sync layer, not ad-hoc local caches

---

## Warnings (avoid state chaos)

**Do not yet:**
- Rush Supabase writes from the Products form
- Use optimistic mutation hacks with mixed UI/server authority
- Add React Context providers for product lists (island state is sufficient)
- Create new Next.js routes for Products tabs (internal `activeView` + `activeProductTab` only)
- Reintroduce drawer/side-panel create flows that duplicate form state paths

**Before any backend sync:**
1. Define server authority vs client working copy explicitly
2. Add a sync boundary (e.g. `hydrateProductsStateFromServer`, `commitProductToServer`) — not inline in render
3. Preserve selectors and pure render layer

---

## Checklist for future PRs touching Products

- [ ] Only `setProductsState` mutates the product dataset
- [ ] No new product arrays in component state
- [ ] New UI uses selectors, not inline `.filter()`
- [ ] List/detail components stay presentational
- [ ] Create flow keeps pending invariant + commit order
- [ ] No new routes or Client Island structural changes without explicit approval
- [ ] Types updated in `store-os-product-list-types.ts` first

---

## Goal

Keep Store OS Products:

- **Modular** — isolated under `activeView === "products"`
- **Deterministic** — predictable state transitions
- **Scalable** — schema and admin can grow without rewiring
- **SaaS-grade** — dashboard state engine, not page spaghetti
- **Future-safe** — status model and mappers ready for admin + marketplace
