-- =============================================================================
-- P0: Reprovision guard — merchant-hidden catalog requests must never regain
--     marketplace commerce via provision_store_offer_from_catalog_request.
-- =============================================================================

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

  -- Merchant-hidden: never upsert, link, or reactivate commerce. Admin catalog
  -- approval/history unchanged; return existing offer id idempotently if present.
  if v_req.merchant_hidden_at is not null then
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

comment on function public.provision_store_offer_from_catalog_request(uuid) is
  'Admin-only: upsert store_products from approved catalog request merchant intent. Skips all commerce mutations when catalog request is merchant-hidden (returns existing offer id or null).';
