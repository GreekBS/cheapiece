-- Marketplace boundary hardening for public.products SELECT (anon / public catalog).
-- Adds explicit DB-level marketplace scope (no hardcoded tenant UUIDs; backward compatible: all tenants participate today).
-- Does NOT alter INSERT / UPDATE / DELETE on products; does not touch store_products.

-- ---------------------------------------------------------------------------
-- Step 1 — Marketplace scope (Option A: extensible, currently all tenants)
-- ---------------------------------------------------------------------------
create or replace function public.is_marketplace_tenant(tid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select true;
$$;

comment on function public.is_marketplace_tenant(uuid) is
  'Catalog tenants eligible for anonymous marketplace reads. Currently all tenants; replace body when a tenant allowlist exists.';

revoke all on function public.is_marketplace_tenant(uuid) from public;
grant execute on function public.is_marketplace_tenant(uuid) to anon;
grant execute on function public.is_marketplace_tenant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Steps 2–4 — SELECT policies: public (bounded) + vendor (tenant-isolated) + admin (full)
-- Idempotent: drop known names + legacy anon/unified names, then recreate three policies.
-- ---------------------------------------------------------------------------
drop policy if exists products_select_public_market on public.products;
drop policy if exists products_select_vendor_enrichment on public.products;
drop policy if exists products_select_admin_catalog on public.products;

drop policy if exists products_select_unified on public.products;
drop policy if exists products_select_anon_active on public.products;
drop policy if exists products_select_anon_marketplace_active on public.products;
drop policy if exists products_select_active_or_admin on public.products;

-- Public (anon): publishable rows only, explicit marketplace tenant gate (no app-layer RLS dependency)
create policy products_select_public_market
on public.products
for select
to anon
using (
  state = 'active'
  and public.is_marketplace_tenant(tenant_id)
);

-- Vendor enrichment: strict tenant isolation; never platform_admin (admin uses separate policy)
create policy products_select_vendor_enrichment
on public.products
for select
to authenticated
using (
  not public.auth_is_platform_admin()
  and public.auth_tenant_id() is not null
  and tenant_id = public.auth_tenant_id()
);

-- Admin catalog: unrestricted read
create policy products_select_admin_catalog
on public.products
for select
to authenticated
using (public.auth_is_platform_admin());
