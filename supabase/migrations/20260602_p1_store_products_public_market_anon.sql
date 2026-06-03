-- =============================================================================
-- Option A — P1 (STAGING-FIRST): anonymous marketplace read for store_products
-- =============================================================================
-- Scope:
--   - Adds anon SELECT policy for public active offers (catalog commerce layer).
--   - Does NOT modify store_products_select_unified (merchant/authenticated paths).
--   - Does NOT touch vendors (see 20260602_p2_marketplace_vendors_public_view.sql).
--
-- Rollback:
--   drop policy if exists store_products_select_public_market on public.store_products;
--   revoke select on public.store_products from anon;  -- only if no other anon policy needs it
--
-- Apply on STAGING first; wait for explicit approval before production.
-- =============================================================================

grant select on public.store_products to anon;

drop policy if exists store_products_select_public_market on public.store_products;

create policy store_products_select_public_market
on public.store_products
for select
to anon
using (
  state = 'active'
  and exists (
    select 1
    from public.products p
    where p.id = store_products.product_id
      and p.state = 'active'
      and p.tenant_id = store_products.tenant_id
  )
);

comment on policy store_products_select_public_market on public.store_products is
  'Anonymous marketplace: active offers for active products in marketplace tenants only.';
