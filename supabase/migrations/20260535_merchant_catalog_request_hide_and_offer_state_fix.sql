-- =============================================================================
-- P0: Merchant hybrid delete (hide catalog request + archive offer)
--     + fix marketplace activation trigger (preserve paused/draft/archived)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Merchant hide columns on catalog_product_requests
-- -----------------------------------------------------------------------------
alter table public.catalog_product_requests
  add column if not exists merchant_hidden_at timestamptz,
  add column if not exists merchant_hidden_by_user_id uuid
    references auth.users(id) on delete set null;

comment on column public.catalog_product_requests.merchant_hidden_at is
  'When set, row is hidden from merchant Store OS Products UI. Admin/history unchanged.';

comment on column public.catalog_product_requests.merchant_hidden_by_user_id is
  'Vendor owner who hid the row from merchant UI.';

create index if not exists idx_catalog_product_requests_vendor_visible
  on public.catalog_product_requests (vendor_id, created_at desc)
  where merchant_hidden_at is null;

-- -----------------------------------------------------------------------------
-- 2) Narrow merchant hide write path (SECURITY DEFINER RPC)
-- -----------------------------------------------------------------------------
create or replace function public.merchant_hide_catalog_product_request(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.catalog_product_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if p_request_id is null then
    raise exception 'invalid_input';
  end if;

  select * into v_req
  from public.catalog_product_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_req.merchant_hidden_at is not null then
    return;
  end if;

  if not exists (
    select 1
    from public.vendors v
    where v.id = v_req.vendor_id
      and v.owner_user_id = auth.uid()
      and v.tenant_id = v_req.tenant_id
      and v.tenant_id is not distinct from public.auth_tenant_id()
  ) then
    raise exception 'forbidden';
  end if;

  update public.catalog_product_requests
  set
    merchant_hidden_at = now(),
    merchant_hidden_by_user_id = auth.uid()
  where id = p_request_id;
end;
$$;

comment on function public.merchant_hide_catalog_product_request(uuid) is
  'Merchant owner hides catalog request from Store OS UI. Does not change status, products, or publications.';

revoke all on function public.merchant_hide_catalog_product_request(uuid) from public;
grant execute on function public.merchant_hide_catalog_product_request(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Fix marketplace activation state preservation (20260528 regression)
-- -----------------------------------------------------------------------------
create or replace function public.compute_store_product_marketplace_state(
  state text,
  price_amount numeric,
  stock_quantity integer
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when state in ('archived', 'paused', 'draft') then state
    when price_amount is null
      or price_amount <= 0
      or stock_quantity is null
      or stock_quantity <= 0 then 'paused'
    else 'active'
  end;
$$;

-- =============================================================================
-- ROLLBACK (manual):
-- drop function if exists public.merchant_hide_catalog_product_request(uuid);
-- drop index if exists idx_catalog_product_requests_vendor_visible;
-- alter table public.catalog_product_requests
--   drop column if exists merchant_hidden_by_user_id,
--   drop column if exists merchant_hidden_at;
-- Restore compute_store_product_marketplace_state from 20260528 if needed.
-- =============================================================================
