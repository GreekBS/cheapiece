-- SaaS tenant unification: commerce + categories + tenants RLS
-- Date: 2026-05-04
-- Scope:
--   * ADD tenant_id + indexes to vendors, vendor_members, products, store_products
--   * BACKFILL from categories / vendors / default tenant (no DROP of business data)
--   * Tenant-scoped uniqueness (slug / business keys)
--   * Triggers: tenant alignment, store_products vendor↔product tenant match
--   * REPLACE RLS with unified pattern: platform_admin OR tenant_id = profile.tenant_id
--   * Storage category-images: same pattern + platform_admin
--
-- Default tenant UUID (existing seed / marketplace):
--   11111111-1111-4111-8111-111111111111

-- ---------------------------------------------------------------------------
-- 1) Helper functions (SECURITY INVOKER — respect caller RLS on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.auth_is_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  );
$$;

create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select p.tenant_id
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.auth_is_platform_admin() to authenticated;
grant execute on function public.auth_tenant_id() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) vendors.tenant_id
-- ---------------------------------------------------------------------------
alter table public.vendors
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

update public.vendors v
set tenant_id = coalesce(v.tenant_id, '11111111-1111-4111-8111-111111111111'::uuid)
where v.tenant_id is null;

alter table public.vendors alter column tenant_id set not null;

alter table public.vendors drop constraint if exists vendors_slug_unique;

drop index if exists uq_vendors_tenant_slug;
create unique index uq_vendors_tenant_slug
  on public.vendors (tenant_id, slug);

create index if not exists idx_vendors_tenant_id on public.vendors (tenant_id);
create index if not exists idx_vendors_tenant_created on public.vendors (tenant_id, created_at);

-- Default tenant_id from session profile when client omits it (keeps existing insert paths valid)
create or replace function public.vendors_set_tenant_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.auth_tenant_id();
  end if;
  if new.tenant_id is null then
    raise exception 'vendors: tenant_id is required (set profiles.tenant_id or pass tenant_id explicitly)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vendors_set_tenant_before_insert on public.vendors;
create trigger trg_vendors_set_tenant_before_insert
before insert on public.vendors
for each row execute function public.vendors_set_tenant_before_insert();

-- ---------------------------------------------------------------------------
-- 3) vendor_members.tenant_id (denormalized from vendor; RLS + integrity)
-- ---------------------------------------------------------------------------
alter table public.vendor_members
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

update public.vendor_members vm
set tenant_id = v.tenant_id
from public.vendors v
where v.id = vm.vendor_id
  and (vm.tenant_id is null or vm.tenant_id is distinct from v.tenant_id);

alter table public.vendor_members alter column tenant_id set not null;

alter table public.vendor_members drop constraint if exists vendor_members_vendor_user_unique;

create index if not exists idx_vendor_members_tenant_id on public.vendor_members (tenant_id);
create index if not exists idx_vendor_members_tenant_vendor on public.vendor_members (tenant_id, vendor_id);

-- Unique membership per tenant + vendor + user (replaces global vendor_id+user_id unique)
drop index if exists uq_vendor_members_tenant_vendor_user;
create unique index uq_vendor_members_tenant_vendor_user
  on public.vendor_members (tenant_id, vendor_id, user_id);

create or replace function public.vendor_members_sync_tenant_from_vendor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare tid uuid;
begin
  select v.tenant_id into strict tid from public.vendors v where v.id = new.vendor_id;
  new.tenant_id := tid;
  return new;
end;
$$;

drop trigger if exists trg_vendor_members_sync_tenant on public.vendor_members;
create trigger trg_vendor_members_sync_tenant
before insert or update of vendor_id on public.vendor_members
for each row execute function public.vendor_members_sync_tenant_from_vendor();

-- ---------------------------------------------------------------------------
-- 4) products.tenant_id
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

update public.products p
set tenant_id = c.tenant_id
from public.categories c
where p.category_id = c.id
  and p.tenant_id is null;

update public.products p
set tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
where p.tenant_id is null;

alter table public.products alter column tenant_id set not null;

alter table public.products drop constraint if exists products_slug_unique;

drop index if exists uq_products_tenant_slug;
create unique index uq_products_tenant_slug
  on public.products (tenant_id, slug);

create index if not exists idx_products_tenant_id on public.products (tenant_id);
create index if not exists idx_products_tenant_category on public.products (tenant_id, category_id);
create index if not exists idx_products_tenant_state on public.products (tenant_id, state);
create index if not exists idx_products_tenant_created on public.products (tenant_id, created_at);

create or replace function public.enforce_products_category_tenant()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.category_id is not null then
    if not exists (
      select 1 from public.categories c
      where c.id = new.category_id
        and c.tenant_id = new.tenant_id
    ) then
      raise exception 'products: category_id must belong to same tenant_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_category_tenant on public.products;
create trigger trg_products_category_tenant
before insert or update of category_id, tenant_id on public.products
for each row execute function public.enforce_products_category_tenant();

create or replace function public.products_set_tenant_from_category()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.tenant_id is null and new.category_id is not null then
    select c.tenant_id into strict new.tenant_id from public.categories c where c.id = new.category_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_tenant_from_category on public.products;
create trigger trg_products_tenant_from_category
before insert on public.products
for each row execute function public.products_set_tenant_from_category();

-- ---------------------------------------------------------------------------
-- 5) store_products.tenant_id
-- ---------------------------------------------------------------------------
alter table public.store_products
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

update public.store_products sp
set tenant_id = v.tenant_id
from public.vendors v
where v.id = sp.vendor_id
  and (sp.tenant_id is null or sp.tenant_id is distinct from v.tenant_id);

update public.store_products sp
set tenant_id = p.tenant_id
from public.products p
where p.id = sp.product_id
  and sp.tenant_id is distinct from p.tenant_id;

-- If any row still null (should not), assign default
update public.store_products sp
set tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
where sp.tenant_id is null;

alter table public.store_products alter column tenant_id set not null;

drop index if exists uq_store_products_business_active;
create unique index uq_store_products_business_active
on public.store_products (tenant_id, vendor_id, product_id, condition, listing_variant_key)
where state <> 'archived';

create index if not exists idx_store_products_tenant_id on public.store_products (tenant_id);
create index if not exists idx_store_products_tenant_vendor on public.store_products (tenant_id, vendor_id);
create index if not exists idx_store_products_tenant_product on public.store_products (tenant_id, product_id);
create index if not exists idx_store_products_tenant_created on public.store_products (tenant_id, created_at);

create or replace function public.enforce_store_products_tenant_alignment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_tid uuid;
declare p_tid uuid;
begin
  select v.tenant_id into strict v_tid from public.vendors v where v.id = new.vendor_id;
  select p.tenant_id into strict p_tid from public.products p where p.id = new.product_id;
  if v_tid is distinct from p_tid then
    raise exception 'store_products: vendor tenant_id must match product tenant_id';
  end if;
  new.tenant_id := v_tid;
  return new;
end;
$$;

drop trigger if exists trg_store_products_tenant_alignment on public.store_products;
create trigger trg_store_products_tenant_alignment
before insert or update of vendor_id, product_id on public.store_products
for each row execute function public.enforce_store_products_tenant_alignment();

-- ---------------------------------------------------------------------------
-- 6) tenants RLS — tenant members + platform_admin (all rows)
-- ---------------------------------------------------------------------------
drop policy if exists tenants_select_member on public.tenants;

create policy tenants_select_unified
on public.tenants
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or id = public.auth_tenant_id()
);

-- ---------------------------------------------------------------------------
-- 7) categories — replace strict-tenant-only with unified (+ platform_admin)
-- ---------------------------------------------------------------------------
drop policy if exists categories_select_strict on public.categories;
drop policy if exists categories_insert_strict on public.categories;
drop policy if exists categories_update_strict on public.categories;
drop policy if exists categories_delete_strict on public.categories;

create policy categories_select_unified
on public.categories
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or tenant_id = public.auth_tenant_id()
);

create policy categories_insert_unified
on public.categories
for insert
to authenticated
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
  )
);

create policy categories_update_unified
on public.categories
for update
to authenticated
using (
  public.auth_is_platform_admin()
  or tenant_id = public.auth_tenant_id()
)
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
  )
);

create policy categories_delete_unified
on public.categories
for delete
to authenticated
using (
  public.auth_is_platform_admin()
  or tenant_id = public.auth_tenant_id()
);

-- ---------------------------------------------------------------------------
-- 8) vendors RLS
-- ---------------------------------------------------------------------------
drop policy if exists vendors_select_member_or_admin on public.vendors;
drop policy if exists vendors_select_owner_or_admin on public.vendors;
drop policy if exists vendors_insert_owner_self_or_admin on public.vendors;
drop policy if exists vendors_update_owner_manager_or_admin on public.vendors;
drop policy if exists vendors_update_owner_or_admin on public.vendors;
drop policy if exists vendors_delete_denied on public.vendors;

create policy vendors_select_unified
on public.vendors
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and (
      owner_user_id = auth.uid()
      or exists (
        select 1
        from public.vendor_members vm
        where vm.vendor_id = vendors.id
          and vm.user_id = auth.uid()
          and vm.status = 'active'
      )
    )
  )
);

create policy vendors_insert_unified
on public.vendors
for insert
to authenticated
with check (
  (
    public.auth_is_platform_admin()
    or (
      tenant_id = public.auth_tenant_id()
      and public.auth_tenant_id() is not null
      and owner_user_id = auth.uid()
    )
  )
);

create policy vendors_update_unified
on public.vendors
for update
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and (
      owner_user_id = auth.uid()
      or exists (
        select 1
        from public.vendor_members vm
        where vm.vendor_id = vendors.id
          and vm.user_id = auth.uid()
          and vm.status = 'active'
          and vm.role in ('owner', 'manager')
      )
    )
  )
)
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and (
      owner_user_id = auth.uid()
      or exists (
        select 1
        from public.vendor_members vm
        where vm.vendor_id = vendors.id
          and vm.user_id = auth.uid()
          and vm.status = 'active'
          and vm.role in ('owner', 'manager')
      )
    )
  )
);

create policy vendors_delete_denied
on public.vendors
for delete
to authenticated
using (false);

-- ---------------------------------------------------------------------------
-- 9) vendor_members RLS
-- ---------------------------------------------------------------------------
drop policy if exists vendor_members_select_self_owner_or_admin on public.vendor_members;
drop policy if exists vendor_members_insert_owner_or_admin on public.vendor_members;
drop policy if exists vendor_members_update_owner_or_admin on public.vendor_members;
drop policy if exists vendor_members_delete_denied on public.vendor_members;

create policy vendor_members_select_unified
on public.vendor_members
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and (
      user_id = auth.uid()
      or exists (
        select 1
        from public.vendors v
        where v.id = vendor_members.vendor_id
          and v.owner_user_id = auth.uid()
      )
    )
  )
);

create policy vendor_members_insert_unified
on public.vendor_members
for insert
to authenticated
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and exists (
      select 1
      from public.vendors v
      where v.id = vendor_members.vendor_id
        and v.owner_user_id = auth.uid()
        and v.tenant_id = vendor_members.tenant_id
    )
    and vendor_members.role in ('manager', 'editor')
    and vendor_members.status = 'active'
  )
);

create policy vendor_members_update_unified
on public.vendor_members
for update
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and exists (
      select 1
      from public.vendors v
      where v.id = vendor_members.vendor_id
        and v.owner_user_id = auth.uid()
    )
  )
)
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and exists (
      select 1
      from public.vendors v
      where v.id = vendor_members.vendor_id
        and v.owner_user_id = auth.uid()
    )
  )
);

create policy vendor_members_delete_denied
on public.vendor_members
for delete
to authenticated
using (false);

-- ---------------------------------------------------------------------------
-- 10) products RLS (tenant merchants: owner/manager; full read in-tenant)
-- ---------------------------------------------------------------------------
drop policy if exists products_select_active_or_admin on public.products;
drop policy if exists products_insert_admin_only on public.products;
drop policy if exists products_update_admin_only on public.products;
drop policy if exists products_delete_denied on public.products;

create policy products_select_unified
on public.products
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or tenant_id = public.auth_tenant_id()
);

create policy products_insert_unified
on public.products
for insert
to authenticated
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and exists (
      select 1
      from public.vendor_members vm
      join public.vendors v on v.id = vm.vendor_id
      where vm.user_id = auth.uid()
        and vm.status = 'active'
        and vm.role in ('owner', 'manager')
        and v.tenant_id = products.tenant_id
    )
  )
);

create policy products_update_unified
on public.products
for update
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and exists (
      select 1
      from public.vendor_members vm
      join public.vendors v on v.id = vm.vendor_id
      where vm.user_id = auth.uid()
        and vm.status = 'active'
        and vm.role in ('owner', 'manager')
        and v.tenant_id = products.tenant_id
    )
  )
)
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and exists (
      select 1
      from public.vendor_members vm
      join public.vendors v on v.id = vm.vendor_id
      where vm.user_id = auth.uid()
        and vm.status = 'active'
        and vm.role in ('owner', 'manager')
        and v.tenant_id = products.tenant_id
    )
  )
);

create policy products_delete_denied
on public.products
for delete
to authenticated
using (false);

-- ---------------------------------------------------------------------------
-- 11) store_products RLS (merge prior split SELECT + hardened writes + tenant)
-- ---------------------------------------------------------------------------
drop policy if exists store_products_select_public_member_or_admin on public.store_products;
drop policy if exists store_products_select_public_active on public.store_products;
drop policy if exists store_products_select_admin_full on public.store_products;
drop policy if exists store_products_select_vendor_scoped on public.store_products;
drop policy if exists store_products_insert_member_or_admin on public.store_products;
drop policy if exists store_products_insert_owner_or_admin on public.store_products;
drop policy if exists store_products_update_member_or_admin on public.store_products;
drop policy if exists store_products_update_owner_or_admin on public.store_products;
drop policy if exists store_products_delete_denied on public.store_products;

create policy store_products_select_unified
on public.store_products
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and (
      exists (
        select 1
        from public.vendor_members vm
        join public.vendors v on v.id = vm.vendor_id
        where vm.vendor_id = store_products.vendor_id
          and vm.user_id = auth.uid()
          and vm.status = 'active'
      )
      or (
        state = 'active'
        and exists (
          select 1
          from public.products p
          where p.id = store_products.product_id
            and p.state = 'active'
            and p.tenant_id = store_products.tenant_id
        )
      )
    )
  )
);

create policy store_products_insert_unified
on public.store_products
for insert
to authenticated
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and exists (
      select 1
      from public.vendors v
      where v.id = store_products.vendor_id
        and v.owner_user_id = auth.uid()
        and v.tenant_id = store_products.tenant_id
    )
    and exists (
      select 1
      from public.products p
      where p.id = store_products.product_id
        and p.state = 'active'
        and p.tenant_id = store_products.tenant_id
    )
    and created_by = auth.uid()
  )
);

create policy store_products_update_unified
on public.store_products
for update
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and (
      state <> 'archived'
      and exists (
        select 1
        from public.vendors v
        where v.id = store_products.vendor_id
          and v.owner_user_id = auth.uid()
          and v.tenant_id = store_products.tenant_id
      )
    )
  )
)
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and exists (
      select 1
      from public.vendors v
      where v.id = store_products.vendor_id
        and v.owner_user_id = auth.uid()
        and v.tenant_id = store_products.tenant_id
    )
    and exists (
      select 1
      from public.products p
      where p.id = store_products.product_id
        and p.state = 'active'
        and p.tenant_id = store_products.tenant_id
    )
    and updated_by = auth.uid()
    and (
      state <> 'archived'
      or exists (
        select 1
        from public.vendors v2
        where v2.id = store_products.vendor_id
          and v2.owner_user_id = auth.uid()
      )
    )
  )
);

create policy store_products_delete_denied
on public.store_products
for delete
to authenticated
using (false);

-- ---------------------------------------------------------------------------
-- 12) Storage: category-images — tenant prefix + platform_admin
-- ---------------------------------------------------------------------------
drop policy if exists category_images_insert on storage.objects;
drop policy if exists category_images_update on storage.objects;
drop policy if exists category_images_delete on storage.objects;
drop policy if exists category_images_select on storage.objects;

create policy category_images_insert_unified
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'category-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy category_images_update_unified
on storage.objects
for update
to authenticated
using (
  bucket_id = 'category-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
)
with check (
  bucket_id = 'category-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy category_images_delete_unified
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'category-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy category_images_select_unified
on storage.objects
for select
to authenticated
using (
  bucket_id = 'category-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);
