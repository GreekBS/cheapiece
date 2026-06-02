-- =============================================================================
-- P0 hardening: merchant_hidden_at ⇒ no active marketplace commerce
-- - One-time reconciliation for existing inconsistent rows
-- - BEFORE trigger blocks active state on linked offers
-- - Hide + provision paths archive any active linked offers defensively
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Shared predicate: offer linked to a merchant-hidden catalog request
-- -----------------------------------------------------------------------------
create or replace function public.store_product_blocked_by_merchant_hidden(
  p_source_catalog_request_id uuid,
  p_vendor_id uuid,
  p_product_id uuid,
  p_condition text,
  p_listing_variant_key text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.catalog_product_requests cpr
    where cpr.merchant_hidden_at is not null
      and (
        cpr.id is not distinct from p_source_catalog_request_id
        or (
          p_source_catalog_request_id is null
          and cpr.resolved_product_id is not null
          and cpr.vendor_id = p_vendor_id
          and cpr.resolved_product_id = p_product_id
          and coalesce(p_condition, 'new') = 'new'
          and coalesce(p_listing_variant_key, '') = ''
        )
      )
  );
$$;

comment on function public.store_product_blocked_by_merchant_hidden(uuid, uuid, uuid, text, text) is
  'True when a store_products row is linked to a merchant-hidden catalog_product_requests row.';

-- -----------------------------------------------------------------------------
-- 2) Archive active offers for one hidden request (idempotent)
-- -----------------------------------------------------------------------------
create or replace function public.archive_active_offers_for_merchant_hidden_request(
  p_request_id uuid,
  p_updated_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.catalog_product_requests%rowtype;
  v_count integer;
begin
  if p_request_id is null then
    return 0;
  end if;

  select * into v_req
  from public.catalog_product_requests
  where id = p_request_id;

  if not found or v_req.merchant_hidden_at is null then
    return 0;
  end if;

  with archived as (
    update public.store_products sp
    set
      state = 'archived',
      updated_by = coalesce(p_updated_by, sp.updated_by),
      updated_at = now()
    where sp.state = 'active'
      and (
        sp.source_catalog_request_id = p_request_id
        or (
          sp.source_catalog_request_id is null
          and v_req.resolved_product_id is not null
          and sp.vendor_id = v_req.vendor_id
          and sp.product_id = v_req.resolved_product_id
          and sp.condition = 'new'
          and sp.listing_variant_key = ''
        )
      )
    returning sp.id
  )
  select count(*)::integer into v_count from archived;

  return coalesce(v_count, 0);
end;
$$;

comment on function public.archive_active_offers_for_merchant_hidden_request(uuid, uuid) is
  'Defensive: archive active store_products linked to a merchant-hidden catalog request.';

revoke all on function public.archive_active_offers_for_merchant_hidden_request(uuid, uuid) from public;
grant execute on function public.archive_active_offers_for_merchant_hidden_request(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Offer activation guard (BEFORE INSERT/UPDATE on store_products)
-- -----------------------------------------------------------------------------
create or replace function public.enforce_store_product_marketplace_activation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.state := public.compute_store_product_marketplace_state(
    new.state,
    new.price_amount,
    new.stock_quantity
  );

  if public.store_product_blocked_by_merchant_hidden(
    new.source_catalog_request_id,
    new.vendor_id,
    new.product_id,
    new.condition,
    new.listing_variant_key
  )
  and new.state = 'active' then
    new.state := 'archived';
  end if;

  return new;
end;
$$;

comment on function public.enforce_store_product_marketplace_activation() is
  'Marketplace auto-activation + merchant-hidden guard (active ⇒ archived when blocked).';

-- -----------------------------------------------------------------------------
-- 4) Hide RPC: archive linked active offers when merchant hides request
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
    perform public.archive_active_offers_for_merchant_hidden_request(p_request_id, auth.uid());
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

  perform public.archive_active_offers_for_merchant_hidden_request(p_request_id, auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) Provision RPC: hidden branch archives active offers before idempotent return
-- -----------------------------------------------------------------------------
create or replace function public.provision_store_offer_from_catalog_request(
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_req public.catalog_product_requests%rowtype;
  v_product public.products%rowtype;
  v_offer_id uuid;
  v_price numeric(12, 2);
  v_stock integer;
  v_currency text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if not public.auth_is_platform_admin() then
    raise exception 'forbidden';
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

  if v_req.status is distinct from 'approved' then
    raise exception 'request_not_approved';
  end if;

  if v_req.resolved_product_id is null then
    raise exception 'missing_resolved_product';
  end if;

  v_price := v_req.requested_price_amount;
  if v_price is null then
    return null;
  end if;

  if v_price < 0 then
    raise exception 'invalid_price';
  end if;

  v_stock := coalesce(v_req.requested_stock_quantity, 0);
  if v_stock < 0 then
    raise exception 'invalid_stock';
  end if;

  v_currency := coalesce(nullif(trim(v_req.requested_price_currency), ''), 'EUR');

  select * into v_product
  from public.products
  where id = v_req.resolved_product_id;

  if not found then
    raise exception 'product_not_found';
  end if;

  if v_product.tenant_id is distinct from v_req.tenant_id then
    raise exception 'tenant_mismatch';
  end if;

  if v_product.state is distinct from 'active' then
    raise exception 'product_not_active';
  end if;

  if not exists (
    select 1
    from public.vendors v
    where v.id = v_req.vendor_id
      and v.tenant_id = v_req.tenant_id
  ) then
    raise exception 'invalid_vendor';
  end if;

  if v_req.merchant_hidden_at is not null then
    perform public.archive_active_offers_for_merchant_hidden_request(p_request_id, v_user_id);

    select sp.id
    into v_offer_id
    from public.store_products sp
    where sp.source_catalog_request_id = p_request_id
    limit 1;

    if v_offer_id is not null then
      return v_offer_id;
    end if;

    select sp.id
    into v_offer_id
    from public.store_products sp
    where sp.tenant_id = v_req.tenant_id
      and sp.vendor_id = v_req.vendor_id
      and sp.product_id = v_req.resolved_product_id
      and sp.condition = 'new'
      and sp.listing_variant_key = ''
    order by sp.updated_at desc nulls last, sp.id asc
    limit 1;

    if v_offer_id is not null then
      return v_offer_id;
    end if;

    return null;
  end if;

  select sp.id
  into v_offer_id
  from public.store_products sp
  where sp.source_catalog_request_id = p_request_id
  limit 1;

  if v_offer_id is not null then
    update public.store_products sp
    set
      price_amount = v_price,
      stock_quantity = v_stock,
      currency = v_currency,
      state = 'active',
      updated_by = v_user_id
    where sp.id = v_offer_id;
    return v_offer_id;
  end if;

  select sp.id
  into v_offer_id
  from public.store_products sp
  where sp.tenant_id = v_req.tenant_id
    and sp.vendor_id = v_req.vendor_id
    and sp.product_id = v_req.resolved_product_id
    and sp.condition = 'new'
    and sp.listing_variant_key = ''
    and sp.state <> 'archived'
  limit 1;

  if v_offer_id is not null then
    update public.store_products sp
    set
      source_catalog_request_id = p_request_id,
      price_amount = v_price,
      stock_quantity = v_stock,
      currency = v_currency,
      state = 'active',
      updated_by = v_user_id
    where sp.id = v_offer_id;
    return v_offer_id;
  end if;

  insert into public.store_products (
    vendor_id,
    product_id,
    condition,
    listing_variant_key,
    price_amount,
    currency,
    stock_quantity,
    state,
    source_catalog_request_id,
    created_by,
    updated_by
  )
  values (
    v_req.vendor_id,
    v_req.resolved_product_id,
    'new',
    '',
    v_price,
    v_currency,
    v_stock,
    'active',
    p_request_id,
    v_user_id,
    v_user_id
  )
  returning id into v_offer_id;

  return v_offer_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6) One-time reconciliation: hidden request + active offer ⇒ archived
-- -----------------------------------------------------------------------------
update public.store_products sp
set
  state = 'archived',
  updated_at = now(),
  updated_by = null
from public.catalog_product_requests cpr
where cpr.merchant_hidden_at is not null
  and sp.state = 'active'
  and (
    sp.source_catalog_request_id = cpr.id
    or (
      sp.source_catalog_request_id is null
      and cpr.resolved_product_id is not null
      and sp.vendor_id = cpr.vendor_id
      and sp.product_id = cpr.resolved_product_id
      and sp.condition = 'new'
      and sp.listing_variant_key = ''
    )
  );

-- =============================================================================
-- ROLLBACK (manual):
-- Restore prior enforce_store_product_marketplace_activation, hide RPC, provision RPC.
-- drop function public.archive_active_offers_for_merchant_hidden_request(uuid, uuid);
-- drop function public.store_product_blocked_by_merchant_hidden(uuid, uuid, uuid, text, text);
-- =============================================================================
