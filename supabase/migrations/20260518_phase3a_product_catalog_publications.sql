-- Phase 3A: Product catalog publication companion (write-time snapshot layer).
-- Approval orchestration builds snapshots in app; this RPC persists atomically.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.product_catalog_publications (
  product_id uuid primary key references public.products(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_request_id uuid not null references public.catalog_product_requests(id) on delete restrict,
  schema_version_id uuid references public.category_schema_versions(id) on delete restrict,
  validation_mode text not null,
  locale text not null default 'el',
  attribute_values jsonb not null default '{}'::jsonb,
  display_snapshot jsonb not null,
  facet_snapshot jsonb not null default '[]'::jsonb,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_catalog_publications_validation_mode_check
    check (validation_mode in ('STRICT', 'LEGACY_SAFE', 'NO_SCHEMA_MINIMAL'))
);

create index if not exists idx_product_catalog_publications_tenant
  on public.product_catalog_publications (tenant_id);

create index if not exists idx_product_catalog_publications_schema_version
  on public.product_catalog_publications (schema_version_id);

create unique index if not exists uq_product_catalog_publications_source_request
  on public.product_catalog_publications (source_request_id);

create index if not exists idx_product_catalog_publications_facet_snapshot
  on public.product_catalog_publications using gin (facet_snapshot jsonb_path_ops);

drop trigger if exists trg_product_catalog_publications_set_updated_at on public.product_catalog_publications;
create trigger trg_product_catalog_publications_set_updated_at
before update on public.product_catalog_publications
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (read paths for 3B; writes via SECURITY DEFINER publish RPC)
-- ---------------------------------------------------------------------------
alter table public.product_catalog_publications enable row level security;

drop policy if exists product_catalog_publications_select_public_market on public.product_catalog_publications;
create policy product_catalog_publications_select_public_market
on public.product_catalog_publications
for select
to anon
using (
  exists (
    select 1
    from public.products p
    where p.id = product_catalog_publications.product_id
      and p.state = 'active'
  )
);

drop policy if exists product_catalog_publications_select_vendor_enrichment on public.product_catalog_publications;
create policy product_catalog_publications_select_vendor_enrichment
on public.product_catalog_publications
for select
to authenticated
using (
  not public.auth_is_platform_admin()
  and public.auth_tenant_id() is not null
  and tenant_id = public.auth_tenant_id()
);

drop policy if exists product_catalog_publications_select_admin_catalog on public.product_catalog_publications;
create policy product_catalog_publications_select_admin_catalog
on public.product_catalog_publications
for select
to authenticated
using (public.auth_is_platform_admin());

drop policy if exists product_catalog_publications_insert_platform_admin on public.product_catalog_publications;
create policy product_catalog_publications_insert_platform_admin
on public.product_catalog_publications
for insert
to authenticated
with check (public.auth_is_platform_admin());

-- ---------------------------------------------------------------------------
-- Atomic publish RPC (dumb writer — snapshot built in application)
-- ---------------------------------------------------------------------------
create or replace function public.approve_catalog_request_publish(
  p_request_id uuid,
  p_final_slug text,
  p_title text,
  p_brand text,
  p_model text,
  p_category_id uuid,
  p_admin_note text,
  p_publication jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
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

  if v_req.status is distinct from 'pending' then
    raise exception 'invalid_state';
  end if;

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

comment on function public.approve_catalog_request_publish(uuid, text, text, text, text, uuid, text, jsonb) is
  'Platform admin: atomic approve + products insert + product_catalog_publications — publication JSON built in app.';

revoke all on function public.approve_catalog_request_publish(uuid, text, text, text, text, uuid, text, jsonb) from public;
grant execute on function public.approve_catalog_request_publish(uuid, text, text, text, text, uuid, text, jsonb) to authenticated;
