-- Phase 0: Canonical `products` writes — platform_admin ONLY.
-- Merchants and tenant staff must never INSERT/UPDATE `products` (use catalog_product_requests + admin).
-- Adds anonymous SELECT for active rows on the default marketplace tenant (public SSR / storefront).

-- ---------------------------------------------------------------------------
-- Replace merchant-capable products write policies
-- ---------------------------------------------------------------------------
drop policy if exists products_insert_unified on public.products;
drop policy if exists products_update_unified on public.products;

create policy products_insert_platform_admin_only
on public.products
for insert
to authenticated
with check (public.auth_is_platform_admin());

create policy products_update_platform_admin_only
on public.products
for update
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());

-- ---------------------------------------------------------------------------
-- Anonymous read: all active catalog rows (no tenant_id hardcoding).
-- Tenant scoping for public storefront remains in application queries.
-- ---------------------------------------------------------------------------
drop policy if exists products_select_anon_marketplace_active on public.products;
drop policy if exists products_select_anon_active on public.products;

create policy products_select_anon_active
on public.products
for select
to anon
using (state = 'active');
