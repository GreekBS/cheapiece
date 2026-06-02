-- Phase 1: Catalog schema persistence (attribute definitions + versioned category schemas).
-- Runtime contracts live in src/modules/catalog-schema — DB stores domain snapshots only.

-- ---------------------------------------------------------------------------
-- attribute_definitions
-- ---------------------------------------------------------------------------
create table if not exists public.attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  primitive text not null,
  definition jsonb not null,
  state text not null default 'active' check (state in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attribute_definitions_tenant_code_unique unique (tenant_id, code)
);

create index if not exists idx_attribute_definitions_tenant_state
  on public.attribute_definitions (tenant_id, state);

drop trigger if exists trg_attribute_definitions_set_updated_at on public.attribute_definitions;
create trigger trg_attribute_definitions_set_updated_at
before update on public.attribute_definitions
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- category_schema_versions
-- ---------------------------------------------------------------------------
create table if not exists public.category_schema_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  version integer not null check (version >= 1),
  state text not null check (state in ('draft', 'published', 'archived')),
  inherits_from_category_id uuid references public.categories(id) on delete set null,
  category_path text not null default '',
  locale text not null default 'el',
  published_at timestamptz,
  matching_config jsonb not null default '{}'::jsonb,
  denormalize_config jsonb not null default '{}'::jsonb,
  document_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_schema_versions_tenant_category_version_unique
    unique (tenant_id, category_id, version)
);

create unique index if not exists uq_category_schema_one_published_per_category
  on public.category_schema_versions (tenant_id, category_id)
  where state = 'published';

create index if not exists idx_category_schema_versions_tenant_category_state
  on public.category_schema_versions (tenant_id, category_id, state);

drop trigger if exists trg_category_schema_versions_set_updated_at on public.category_schema_versions;
create trigger trg_category_schema_versions_set_updated_at
before update on public.category_schema_versions
for each row
execute function public.set_updated_at();

-- Published versions are immutable (only allow archive transition).
create or replace function public.category_schema_versions_immutable_published()
returns trigger
language plpgsql
as $$
begin
  if old.state = 'published' then
    if new.state = 'archived' and new.state is distinct from old.state then
      return new;
    end if;
    raise exception 'category_schema_versions: published row % is immutable', old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_category_schema_versions_immutable_published on public.category_schema_versions;
create trigger trg_category_schema_versions_immutable_published
before update on public.category_schema_versions
for each row
execute function public.category_schema_versions_immutable_published();

-- ---------------------------------------------------------------------------
-- category_schema_fields
-- ---------------------------------------------------------------------------
create table if not exists public.category_schema_fields (
  id uuid primary key default gen_random_uuid(),
  schema_version_id uuid not null references public.category_schema_versions(id) on delete cascade,
  attribute_code text not null,
  binding jsonb not null,
  sort_order integer not null default 0,
  constraint category_schema_fields_version_code_unique unique (schema_version_id, attribute_code)
);

create index if not exists idx_category_schema_fields_version_sort
  on public.category_schema_fields (schema_version_id, sort_order);

create or replace function public.category_schema_fields_immutable_when_published()
returns trigger
language plpgsql
as $$
declare v_state text;
begin
  select v.state into v_state
  from public.category_schema_versions v
  where v.id = coalesce(new.schema_version_id, old.schema_version_id);

  if v_state = 'published' then
    raise exception 'category_schema_fields: cannot modify fields of published schema version';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_category_schema_fields_immutable_published on public.category_schema_fields;
create trigger trg_category_schema_fields_immutable_published
before insert or update or delete on public.category_schema_fields
for each row
execute function public.category_schema_fields_immutable_when_published();

-- ---------------------------------------------------------------------------
-- RLS (platform_admin only — Phase 1 admin infrastructure)
-- ---------------------------------------------------------------------------
alter table public.attribute_definitions enable row level security;
alter table public.category_schema_versions enable row level security;
alter table public.category_schema_fields enable row level security;

create policy attribute_definitions_admin_all
on public.attribute_definitions
for all
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());

create policy category_schema_versions_admin_all
on public.category_schema_versions
for all
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());

create policy category_schema_fields_admin_all
on public.category_schema_fields
for all
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());
