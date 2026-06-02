-- SaaS-ready tenant-scoped categories + RLS (admin /categories — schema foundation)
-- Date: 2026-05-02
-- * tenants + profiles.tenant_id + nested categories (parent_id, level, sort_order, image_url, emoji)
-- * RLS: tenant isolation via profiles.tenant_id; platform_admin bypass
-- * Recursive delete: parent_id ON DELETE CASCADE
-- * Storage bucket category-images

-- ---------------------------------------------------------------------------
-- 1) Tenants
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint tenants_slug_unique unique (slug)
);

create index if not exists idx_tenants_slug on public.tenants (slug);

alter table public.tenants enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Profiles: link auth user → tenant (nullable for legacy platform_admin)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

create index if not exists idx_profiles_tenant_id on public.profiles (tenant_id);

-- ---------------------------------------------------------------------------
-- 3) Categories: tree columns
-- ---------------------------------------------------------------------------
alter table public.categories
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade;

alter table public.categories
  add column if not exists level integer not null default 0;

alter table public.categories
  add column if not exists sort_order integer not null default 1;

alter table public.categories
  add column if not exists image_url text;

alter table public.categories
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.categories
  add column if not exists emoji text;

-- Sync level from parent (best-effort for existing rows)
update public.categories c
set level = coalesce(p.level, 0) + 1
from public.categories p
where c.parent_id = p.id
  and (c.level is distinct from coalesce(p.level, 0) + 1);

alter table public.categories drop constraint if exists categories_slug_unique;

-- Default tenant for backfill
insert into public.tenants (id, name, slug)
values (
  '11111111-1111-4111-8111-111111111111',
  'Default Marketplace',
  'default-marketplace'
)
on conflict (id) do nothing;

update public.categories
set tenant_id = '11111111-1111-4111-8111-111111111111'
where tenant_id is null;

alter table public.categories alter column tenant_id set not null;

create unique index if not exists uq_categories_tenant_slug
  on public.categories (tenant_id, slug);

create index if not exists idx_categories_tenant_id on public.categories (tenant_id);
create index if not exists idx_categories_parent_id on public.categories (parent_id);
create index if not exists idx_categories_sort_order on public.categories (tenant_id, parent_id, sort_order);
create index if not exists idx_categories_tenant_parent on public.categories (tenant_id, parent_id);

-- ---------------------------------------------------------------------------
-- 4) RLS: tenants
-- ---------------------------------------------------------------------------
drop policy if exists tenants_select_member_or_admin on public.tenants;
create policy tenants_select_member_or_admin
on public.tenants
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or id in (
    select p.tenant_id from public.profiles p
    where p.id = auth.uid() and p.tenant_id is not null
  )
);

-- ---------------------------------------------------------------------------
-- 5) RLS: categories (replace legacy admin-only policies)
-- ---------------------------------------------------------------------------
drop policy if exists categories_select_active_or_admin on public.categories;
drop policy if exists categories_insert_admin_only on public.categories;
drop policy if exists categories_update_admin_only on public.categories;
drop policy if exists categories_delete_denied on public.categories;
drop policy if exists categories_skeleton_deny_all on public.categories;
drop policy if exists categories_select_tenant on public.categories;
drop policy if exists categories_insert_tenant on public.categories;
drop policy if exists categories_update_tenant on public.categories;
drop policy if exists categories_delete_tenant on public.categories;

create policy categories_select_tenant
on public.categories
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or tenant_id in (
    select p.tenant_id from public.profiles p
    where p.id = auth.uid() and p.tenant_id is not null
  )
);

create policy categories_insert_tenant
on public.categories
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or tenant_id in (
    select p.tenant_id from public.profiles p
    where p.id = auth.uid() and p.tenant_id is not null
  )
);

create policy categories_update_tenant
on public.categories
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or tenant_id in (
    select p.tenant_id from public.profiles p
    where p.id = auth.uid() and p.tenant_id is not null
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or tenant_id in (
    select p.tenant_id from public.profiles p
    where p.id = auth.uid() and p.tenant_id is not null
  )
);

create policy categories_delete_tenant
on public.categories
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or tenant_id in (
    select p.tenant_id from public.profiles p
    where p.id = auth.uid() and p.tenant_id is not null
  )
);

-- Catalog: anonymous read of active rows (storefront / APIs outside admin)
drop policy if exists categories_select_anon_active on public.categories;
create policy categories_select_anon_active
on public.categories
for select
to anon
using (state = 'active');

-- ---------------------------------------------------------------------------
-- 6) Storage: category-images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists category_images_insert_own_tenant on storage.objects;
create policy category_images_insert_own_tenant
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) in (
    select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null
  )
);

drop policy if exists category_images_update_own_tenant on storage.objects;
create policy category_images_update_own_tenant
on storage.objects
for update
to authenticated
using (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) in (
    select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null
  )
);

drop policy if exists category_images_delete_own_tenant on storage.objects;
create policy category_images_delete_own_tenant
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) in (
    select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null
  )
);

drop policy if exists category_images_select_public on storage.objects;
create policy category_images_select_public
on storage.objects
for select
to public
using (bucket_id = 'category-images');
