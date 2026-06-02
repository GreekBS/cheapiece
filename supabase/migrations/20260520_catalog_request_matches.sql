-- Catalog request matching: classification metadata (additive; does not change approval pipeline).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.catalog_request_matches (
  request_id uuid primary key references public.catalog_product_requests(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  -- System suggestion (server-computed at submit)
  suggested_product_id uuid references public.products(id) on delete set null,
  confidence numeric(5, 4),
  match_tier text not null default 'SIMPLE_V1',
  match_method text not null default 'simple_v1',
  score_breakdown jsonb not null default '{}'::jsonb,
  match_reasons jsonb not null default '[]'::jsonb,
  suggested_publication_published_at timestamptz,
  engine_version text not null default 'match-v1',
  suggestion_computed_at timestamptz not null default now(),

  -- Merchant selection (optional hint validated server-side)
  merchant_selected_product_id uuid references public.products(id) on delete set null,
  merchant_selected_at timestamptz,
  merchant_selected_by_user_id uuid references auth.users(id) on delete set null,

  -- Admin classification (separate from request approval)
  match_review_status text not null default 'pending'
    check (match_review_status in ('pending', 'accepted', 'rejected', 'overridden')),
  match_reviewed_product_id uuid references public.products(id) on delete set null,
  match_reviewed_by_user_id uuid references auth.users(id) on delete set null,
  match_reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_request_matches_tenant
  on public.catalog_request_matches (tenant_id);

create index if not exists idx_catalog_request_matches_suggested_product
  on public.catalog_request_matches (suggested_product_id)
  where suggested_product_id is not null;

drop trigger if exists trg_catalog_request_matches_set_updated_at on public.catalog_request_matches;
create trigger trg_catalog_request_matches_set_updated_at
before update on public.catalog_request_matches
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: merchants read-only; writes via SECURITY DEFINER RPC only
-- ---------------------------------------------------------------------------
alter table public.catalog_request_matches enable row level security;

create policy catalog_request_matches_select_unified
on public.catalog_request_matches
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and exists (
      select 1
      from public.catalog_product_requests r
      where r.id = catalog_request_matches.request_id
        and exists (
          select 1
          from public.vendor_members vm
          where vm.vendor_id = r.vendor_id
            and vm.user_id = auth.uid()
            and vm.status = 'active'
        )
    )
  )
);

create policy catalog_request_matches_insert_denied
on public.catalog_request_matches
for insert
to authenticated
with check (false);

create policy catalog_request_matches_update_admin_classification
on public.catalog_request_matches
for update
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());

create policy catalog_request_matches_delete_denied
on public.catalog_request_matches
for delete
to authenticated
using (false);

grant select on public.catalog_request_matches to authenticated;
grant update on public.catalog_request_matches to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic submit: catalog_product_requests + catalog_request_matches
-- ---------------------------------------------------------------------------
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
  v_pub_at timestamptz;
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
    attribute_payload
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
    coalesce(p_request->'attribute_payload', '{}'::jsonb)
  )
  returning id into v_request_id;

  v_pub_at := nullif(p_match_snapshot->>'suggested_publication_published_at', '')::timestamptz;

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
    nullif(p_match_snapshot->>'suggested_product_id', '')::uuid,
    nullif(p_match_snapshot->>'confidence', '')::numeric,
    coalesce(nullif(p_match_snapshot->>'match_tier', ''), 'SIMPLE_V1'),
    coalesce(nullif(p_match_snapshot->>'match_method', ''), 'simple_v1'),
    coalesce(p_match_snapshot->'score_breakdown', '{}'::jsonb),
    coalesce(p_match_snapshot->'match_reasons', '[]'::jsonb),
    v_pub_at,
    coalesce(nullif(p_match_snapshot->>'engine_version', ''), 'match-v1'),
    coalesce(
      nullif(p_match_snapshot->>'suggestion_computed_at', '')::timestamptz,
      now()
    ),
    v_selected,
    case when v_selected is not null then now() else null end,
    case when v_selected is not null then v_user_id else null end,
    'pending'
  );

  return v_request_id;
end;
$$;

grant execute on function public.submit_catalog_product_request_with_match(jsonb, jsonb, uuid) to authenticated;
