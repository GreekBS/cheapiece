-- =============================================================================
-- Withdrawn lifecycle: merchant cancel of pending catalog requests
-- - Terminal moderation state (never re-queues, never approvable)
-- - Pending delete => status withdrawn + merchant_hidden_at
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Extend status enum
-- -----------------------------------------------------------------------------
alter table public.catalog_product_requests
  drop constraint if exists catalog_product_requests_status_check;

alter table public.catalog_product_requests
  add constraint catalog_product_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'withdrawn'));

comment on column public.catalog_product_requests.status is
  'Moderation lifecycle: pending | approved | rejected | withdrawn (merchant-cancelled pending, terminal).';

-- -----------------------------------------------------------------------------
-- 2) Terminal state: withdrawn must never transition to another status
-- -----------------------------------------------------------------------------
create or replace function public.enforce_catalog_product_request_withdrawn_terminal()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
    and old.status = 'withdrawn'
    and new.status is distinct from old.status then
    raise exception 'withdrawn_terminal';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_catalog_product_requests_withdrawn_terminal on public.catalog_product_requests;

create trigger trg_catalog_product_requests_withdrawn_terminal
before update of status on public.catalog_product_requests
for each row
execute function public.enforce_catalog_product_request_withdrawn_terminal();

-- -----------------------------------------------------------------------------
-- 3) Shared admin moderation guard (pending only; withdrawn is explicit)
-- -----------------------------------------------------------------------------
create or replace function public.assert_catalog_request_moderatable(p_status text)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if p_status = 'withdrawn' then
    raise exception 'request_withdrawn';
  end if;

  if p_status is distinct from 'pending' then
    raise exception 'invalid_state';
  end if;
end;
$$;

comment on function public.assert_catalog_request_moderatable(text) is
  'Raises request_withdrawn or invalid_state unless status is pending.';

-- -----------------------------------------------------------------------------
-- 4) Merchant hide/withdraw RPC (pending => withdrawn + hidden)
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

  if v_req.status = 'withdrawn' then
    if v_req.merchant_hidden_at is null then
      update public.catalog_product_requests
      set
        merchant_hidden_at = coalesce(v_req.merchant_hidden_at, now()),
        merchant_hidden_by_user_id = coalesce(v_req.merchant_hidden_by_user_id, auth.uid())
      where id = p_request_id;
    end if;
    perform public.archive_active_offers_for_merchant_hidden_request(p_request_id, auth.uid());
    return;
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
    merchant_hidden_by_user_id = auth.uid(),
    status = case
      when v_req.status = 'pending' then 'withdrawn'
      else v_req.status
    end
  where id = p_request_id;

  perform public.archive_active_offers_for_merchant_hidden_request(p_request_id, auth.uid());
end;
$$;

comment on function public.merchant_hide_catalog_product_request(uuid) is
  'Merchant owner hides request from Store OS. Pending submissions become withdrawn (terminal).';

-- -----------------------------------------------------------------------------
-- 5) Admin moderation RPC guards
-- -----------------------------------------------------------------------------

create or replace function public.approve_catalog_product_request(
  p_request_id uuid,
  p_final_slug text,
  p_title text,
  p_brand text,
  p_model text,
  p_category_id uuid,
  p_admin_note text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.catalog_product_requests%rowtype;
  v_product_id uuid;
  v_slug text;
  v_cat uuid;
  v_brand text;
  v_model text;
  n int;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_req
  from public.catalog_product_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  perform public.assert_catalog_request_moderatable(v_req.status);

  v_slug := lower(trim(p_final_slug));
  if v_slug is null or length(v_slug) = 0 then
    raise exception 'invalid_slug';
  end if;

  if exists (
    select 1
    from public.products p
    where p.tenant_id = v_req.tenant_id
      and p.slug = v_slug
  ) then
    raise exception 'slug_conflict';
  end if;

  v_cat := coalesce(p_category_id, v_req.category_id);
  v_brand := nullif(trim(coalesce(p_brand, '')), '');
  v_model := nullif(trim(coalesce(p_model, '')), '');

  insert into public.products (
    tenant_id,
    category_id,
    title,
    brand,
    model,
    slug,
    state
  )
  values (
    v_req.tenant_id,
    v_cat,
    trim(p_title),
    v_brand,
    v_model,
    v_slug,
    'active'
  )
  returning id into v_product_id;

  update public.catalog_product_requests r
  set
    status = 'approved',
    resolved_product_id = v_product_id,
    reviewed_by_user_id = auth.uid(),
    reviewed_at = now(),
    admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where r.id = p_request_id
    and r.status = 'pending';

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'request_not_updated';
  end if;

  return v_product_id;
end;
$$;

create or replace function public.approve_catalog_request_link_existing(
  p_request_id uuid,
  p_product_id uuid,
  p_admin_note text default null
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
  n int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if not public.auth_is_platform_admin() then
    raise exception 'forbidden';
  end if;

  if p_request_id is null or p_product_id is null then
    raise exception 'invalid_input';
  end if;

  select * into v_req
  from public.catalog_product_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  perform public.assert_catalog_request_moderatable(v_req.status);

  select * into v_product
  from public.products
  where id = p_product_id;

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
    from public.product_catalog_publications pub
    where pub.product_id = p_product_id
      and pub.tenant_id = v_req.tenant_id
  ) then
    raise exception 'product_not_published';
  end if;

  update public.catalog_product_requests r
  set
    status = 'approved',
    resolved_product_id = p_product_id,
    reviewed_by_user_id = v_user_id,
    reviewed_at = now(),
    admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where r.id = p_request_id
    and r.status = 'pending';

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'request_not_updated';
  end if;

  update public.catalog_request_matches m
  set
    match_reviewed_product_id = p_product_id,
    match_review_status = 'overridden',
    match_reviewed_by_user_id = v_user_id,
    match_reviewed_at = now()
  where m.request_id = p_request_id;

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'match_not_found';
  end if;

  return p_product_id;
end;
$$;

create or replace function public.approve_catalog_request_publish(
  p_request_id uuid,
  p_final_slug text,
  p_title text,
  p_brand text,
  p_model text,
  p_category_id uuid,
  p_admin_note text,
  p_publication jsonb,
  p_index jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.catalog_product_requests%rowtype;
  v_product_id uuid;
  v_slug text;
  v_cat uuid;
  v_brand text;
  v_model text;
  v_mode text;
  v_locale text;
  v_published_at timestamptz;
  n int;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'forbidden';
  end if;

  if p_publication is null or jsonb_typeof(p_publication) <> 'object' then
    raise exception 'invalid_publication';
  end if;

  v_mode := p_publication->>'validation_mode';
  if v_mode is null or v_mode not in ('STRICT', 'LEGACY_SAFE', 'NO_SCHEMA_MINIMAL') then
    raise exception 'invalid_publication_mode';
  end if;

  if p_publication->'display_snapshot' is null then
    raise exception 'invalid_publication_display';
  end if;

  v_locale := coalesce(nullif(trim(p_publication->>'locale'), ''), 'el');
  v_published_at := coalesce(
    (p_publication->>'published_at')::timestamptz,
    now()
  );

  select * into v_req
  from public.catalog_product_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  perform public.assert_catalog_request_moderatable(v_req.status);

  v_slug := lower(trim(p_final_slug));
  if v_slug is null or length(v_slug) = 0 then
    raise exception 'invalid_slug';
  end if;

  if exists (
    select 1
    from public.products p
    where p.tenant_id = v_req.tenant_id
      and p.slug = v_slug
  ) then
    raise exception 'slug_conflict';
  end if;

  v_cat := coalesce(p_category_id, v_req.category_id);
  v_brand := nullif(trim(coalesce(p_brand, '')), '');
  v_model := nullif(trim(coalesce(p_model, '')), '');

  insert into public.products (
    tenant_id,
    category_id,
    title,
    brand,
    model,
    slug,
    state
  )
  values (
    v_req.tenant_id,
    v_cat,
    trim(p_title),
    v_brand,
    v_model,
    v_slug,
    'active'
  )
  returning id into v_product_id;

  insert into public.product_catalog_publications (
    product_id,
    tenant_id,
    source_request_id,
    schema_version_id,
    validation_mode,
    locale,
    attribute_values,
    display_snapshot,
    facet_snapshot,
    published_at
  )
  values (
    v_product_id,
    v_req.tenant_id,
    p_request_id,
    nullif(p_publication->>'schema_version_id', '')::uuid,
    v_mode,
    v_locale,
    coalesce(p_publication->'attribute_values', '{}'::jsonb),
    p_publication->'display_snapshot',
    coalesce(p_publication->'facet_snapshot', '[]'::jsonb),
    v_published_at
  );

  if p_index is not null
    and jsonb_typeof(p_index) = 'object'
    and v_cat is not null
  then
    insert into public.product_publication_index (
      product_id,
      tenant_id,
      category_id,
      facet_index,
      has_publication,
      published_at
    )
    values (
      v_product_id,
      v_req.tenant_id,
      v_cat,
      coalesce(p_index->'facet_index', '{}'::jsonb),
      coalesce((p_index->>'has_publication')::boolean, true),
      coalesce((p_index->>'published_at')::timestamptz, v_published_at)
    )
    on conflict (product_id) do update set
      tenant_id = excluded.tenant_id,
      category_id = excluded.category_id,
      facet_index = excluded.facet_index,
      has_publication = excluded.has_publication,
      published_at = excluded.published_at,
      updated_at = now();
  end if;

  update public.catalog_product_requests r
  set
    status = 'approved',
    resolved_product_id = v_product_id,
    reviewed_by_user_id = auth.uid(),
    reviewed_at = now(),
    admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where r.id = p_request_id
    and r.status = 'pending';

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'request_not_updated';
  end if;

  return v_product_id;
end;
$$;

-- Provision: explicit withdrawn rejection (terminal, never commerce-bridge)
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

  if v_req.status = 'withdrawn' then
    raise exception 'request_withdrawn';
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
-- 6) One-time reconciliation: hidden pending => withdrawn
-- -----------------------------------------------------------------------------
update public.catalog_product_requests
set status = 'withdrawn'
where status = 'pending'
  and merchant_hidden_at is not null;

-- =============================================================================
-- ROLLBACK (manual):
-- drop trigger trg_catalog_product_requests_withdrawn_terminal on public.catalog_product_requests;
-- drop function public.enforce_catalog_product_request_withdrawn_terminal();
-- drop function public.assert_catalog_request_moderatable(text);
-- Restore prior status check, hide RPC, admin RPCs, provision RPC.
-- =============================================================================
