-- products SELECT RLS: explicit split (public vs vendor enrichment vs admin catalog).
-- Invariants:
--   * Public (anon): only state = 'active' rows (no tenant filter at RLS — app scopes tenant).
--   * Vendor enrichment (authenticated, non-admin): tenant_id = auth_tenant_id() only (no cross-tenant).
--   * Admin catalog (authenticated platform_admin): unrestricted read.
-- Non-overlap: vendor policy explicitly excludes platform_admin so admins are not scoped by tenant_id.

-- ---------------------------------------------------------------------------
-- Drop ALL existing SELECT policies on public.products (idempotent)
-- ---------------------------------------------------------------------------
drop policy if exists products_select_public_market on public.products;
drop policy if exists products_select_vendor_enrichment on public.products;
drop policy if exists products_select_admin_catalog on public.products;

drop policy if exists products_select_unified on public.products;
drop policy if exists products_select_anon_active on public.products;
drop policy if exists products_select_anon_marketplace_active on public.products;
drop policy if exists products_select_active_or_admin on public.products;

-- ---------------------------------------------------------------------------
-- Deterministic SELECT rules (PERMISSIVE default: any matching policy grants)
-- ---------------------------------------------------------------------------

-- 1) Unauthenticated storefront / SSR: active catalog rows only
create policy products_select_public_market
on public.products
for select
to anon
using (state = 'active');

-- 2) Authenticated tenant members (vendors, staff, shoppers on that tenant):
--    full in-tenant visibility for enrichment / attach flows; never cross-tenant.
--    Excludes platform_admin so admin access is governed solely by admin policy.
create policy products_select_vendor_enrichment
on public.products
for select
to authenticated
using (
  not public.auth_is_platform_admin()
  and public.auth_tenant_id() is not null
  and tenant_id = public.auth_tenant_id()
);

-- 3) Platform operators: unrestricted catalog read (all tenants, all states)
create policy products_select_admin_catalog
on public.products
for select
to authenticated
using (public.auth_is_platform_admin());
