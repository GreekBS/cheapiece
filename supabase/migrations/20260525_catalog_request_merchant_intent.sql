-- Optional merchant commercial intent on catalog product requests (not offers).

alter table public.catalog_product_requests
  add column if not exists requested_price_amount numeric(12, 2),
  add column if not exists requested_stock_quantity integer,
  add column if not exists requested_price_currency text default 'EUR';

comment on column public.catalog_product_requests.requested_price_amount is
  'Optional merchant price intent at submit; not a live offer.';
comment on column public.catalog_product_requests.requested_stock_quantity is
  'Optional merchant stock intent at submit; not live inventory.';
comment on column public.catalog_product_requests.requested_price_currency is
  'Currency for requested_price_amount when set; otherwise null.';

alter table public.catalog_product_requests
  drop constraint if exists catalog_product_requests_stock_nonneg;

alter table public.catalog_product_requests
  add constraint catalog_product_requests_stock_nonneg
  check (requested_stock_quantity is null or requested_stock_quantity >= 0);

alter table public.catalog_product_requests
  drop constraint if exists catalog_product_requests_price_nonneg;

alter table public.catalog_product_requests
  add constraint catalog_product_requests_price_nonneg
  check (requested_price_amount is null or requested_price_amount >= 0);

create or replace function public.submit_catalog_product_request_with_match(
  p_request jsonb,
  p_match_snapshot jsonb,
  p_merchant_selected_product_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_vendor_id uuid;
  v_category_id uuid;
  v_request_id uuid;
  v_selected uuid;
  v_suggested uuid;
  v_pub_at timestamptz;
  v_price_amount numeric(12, 2);
  v_stock_quantity integer;
  v_price_currency text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    raise exception 'invalid_request';
  end if;

  if p_match_snapshot is null or jsonb_typeof(p_match_snapshot) <> 'object' then
    raise exception 'invalid_match_snapshot';
  end if;

  v_tenant_id := (p_request->>'tenant_id')::uuid;
  v_vendor_id := (p_request->>'vendor_id')::uuid;
  v_category_id := nullif(p_request->>'category_id', '')::uuid;

  if v_tenant_id is null or v_vendor_id is null then
    raise exception 'invalid_request_scope';
  end if;

  if v_tenant_id is distinct from public.auth_tenant_id() and not public.auth_is_platform_admin() then
    raise exception 'tenant_mismatch';
  end if;

  if not public.auth_is_platform_admin() then
    if (p_request->>'submitted_by_user_id')::uuid is distinct from v_user_id then
      raise exception 'submitter_mismatch';
    end if;

    if (p_request->>'status') is not null and (p_request->>'status') is distinct from 'pending' then
      raise exception 'invalid_status';
    end if;

    if not exists (
      select 1
      from public.vendors v
      where v.id = v_vendor_id
        and v.tenant_id = v_tenant_id
    ) then
      raise exception 'invalid_vendor';
    end if;

    if not exists (
      select 1
      from public.vendor_members vm
      where vm.vendor_id = v_vendor_id
        and vm.user_id = v_user_id
        and vm.status = 'active'
        and vm.role in ('owner', 'manager', 'editor')
    ) then
      raise exception 'forbidden_vendor';
    end if;
  end if;

  v_selected := p_merchant_selected_product_id;
  if v_selected is not null then
    if not exists (
      select 1
      from public.products p
      where p.id = v_selected
        and p.tenant_id = v_tenant_id
        and p.state = 'active'
        and (v_category_id is null or p.category_id = v_category_id)
    ) then
      v_selected := null;
    end if;
  end if;

  v_suggested := nullif(p_match_snapshot->>'suggested_product_id', '')::uuid;
  if v_suggested is not null then
    if not exists (
      select 1
      from public.products p
      where p.id = v_suggested
        and p.tenant_id = v_tenant_id
        and p.state = 'active'
        and (v_category_id is null or p.category_id = v_category_id)
    ) then
      v_suggested := null;
    end if;
  end if;

  v_pub_at := null;
  if v_suggested is not null then
    select pub.published_at
    into v_pub_at
    from public.product_catalog_publications pub
    where pub.product_id = v_suggested
      and pub.tenant_id = v_tenant_id;
  end if;

  v_price_amount :=
    case
      when nullif(trim(coalesce(p_request->>'requested_price_amount', '')), '') is null
      then null
      else (p_request->>'requested_price_amount')::numeric(12, 2)
    end;
  if v_price_amount is not null and v_price_amount < 0 then
    raise exception 'invalid_requested_price';
  end if;

  v_stock_quantity :=
    case
      when nullif(trim(coalesce(p_request->>'requested_stock_quantity', '')), '') is null
      then null
      else (p_request->>'requested_stock_quantity')::integer
    end;
  if v_stock_quantity is not null and v_stock_quantity < 0 then
    raise exception 'invalid_requested_stock';
  end if;

  v_price_currency := null;
  if v_price_amount is not null then
    v_price_currency := coalesce(nullif(trim(coalesce(p_request->>'requested_price_currency', '')), ''), 'EUR');
  end if;

  insert into public.catalog_product_requests (
    tenant_id,
    vendor_id,
    submitted_by_user_id,
    category_id,
    title,
    brand,
    model,
    slug_suggestion,
    gtin,
    mpn,
    status,
    schema_version_id,
    attribute_payload,
    requested_price_amount,
    requested_stock_quantity,
    requested_price_currency
  )
  values (
    v_tenant_id,
    v_vendor_id,
    coalesce((p_request->>'submitted_by_user_id')::uuid, v_user_id),
    v_category_id,
    trim(p_request->>'title'),
    nullif(trim(coalesce(p_request->>'brand', '')), ''),
    nullif(trim(coalesce(p_request->>'model', '')), ''),
    trim(p_request->>'slug_suggestion'),
    nullif(trim(coalesce(p_request->>'gtin', '')), ''),
    nullif(trim(coalesce(p_request->>'mpn', '')), ''),
    'pending',
    nullif(p_request->>'schema_version_id', '')::uuid,
    coalesce(p_request->'attribute_payload', '{}'::jsonb),
    v_price_amount,
    v_stock_quantity,
    v_price_currency
  )
  returning id into v_request_id;

  insert into public.catalog_request_matches (
    request_id,
    tenant_id,
    suggested_product_id,
    confidence,
    match_tier,
    match_method,
    score_breakdown,
    match_reasons,
    suggested_publication_published_at,
    engine_version,
    suggestion_computed_at,
    merchant_selected_product_id,
    merchant_selected_at,
    merchant_selected_by_user_id,
    match_review_status
  )
  values (
    v_request_id,
    v_tenant_id,
    v_suggested,
    null,
    'SIMPLE_V1',
    'simple_v1',
    '{}'::jsonb,
    '[]'::jsonb,
    v_pub_at,
    'match-v1',
    now(),
    v_selected,
    case when v_selected is not null then now() else null end,
    case when v_selected is not null then v_user_id else null end,
    'pending'
  );

  return v_request_id;
end;
$$;

grant execute on function public.submit_catalog_product_request_with_match(jsonb, jsonb, uuid) to authenticated;
