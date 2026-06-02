-- SUPABASE SQL LOG
-- This file tracks all SQL commands in execution order.
-- Rule: Do not delete old SQL. Append updates with:
-- -- UPDATED: reason for change

-- STEP 0: Required extension for UUID generation
create extension if not exists pgcrypto;

-- STEP 1: Shared utility function for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- STEP 2: profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'platform_admin')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- STEP 3: vendors table
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null,
  state text not null default 'active' check (state in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_slug_unique unique (slug)
);

create trigger trg_vendors_set_updated_at
before update on public.vendors
for each row
execute function public.set_updated_at();

-- STEP 4: vendor_members table
create table if not exists public.vendor_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner', 'manager', 'editor')),
  status text not null default 'active' check (status in ('active', 'invited', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_members_vendor_user_unique unique (vendor_id, user_id)
);

create trigger trg_vendor_members_set_updated_at
before update on public.vendor_members
for each row
execute function public.set_updated_at();

-- STEP 5: categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  state text not null default 'active' check (state in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_unique unique (slug)
);

create trigger trg_categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

-- STEP 6: products table (canonical products)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete restrict,
  title text not null,
  brand text,
  model text,
  slug text not null,
  state text not null default 'draft' check (state in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_unique unique (slug)
);

create trigger trg_products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

-- STEP 7: store_products table (vendor offers)
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  condition text not null default 'new' check (condition in ('new', 'used', 'refurbished')),
  listing_variant_key text not null default '',
  price_amount numeric(12,2) not null check (price_amount >= 0),
  currency char(3) not null default 'EUR',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  state text not null default 'draft' check (state in ('draft', 'active', 'paused', 'archived')),
  created_by uuid references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_store_products_set_updated_at
before update on public.store_products
for each row
execute function public.set_updated_at();

-- STEP 8: Immutability guard for store_products vendor_id/product_id
create or replace function public.prevent_store_product_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.vendor_id <> old.vendor_id then
    raise exception 'vendor_id is immutable';
  end if;
  if new.product_id <> old.product_id then
    raise exception 'product_id is immutable';
  end if;
  return new;
end;
$$;

create trigger trg_store_products_immutable_owner_keys
before update on public.store_products
for each row
execute function public.prevent_store_product_owner_change();

-- STEP 9: Core indexes
create index if not exists idx_vendor_members_vendor_id on public.vendor_members(vendor_id);
create index if not exists idx_vendor_members_user_id on public.vendor_members(user_id);
create index if not exists idx_vendor_members_status on public.vendor_members(status);
create index if not exists idx_products_state on public.products(state);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_store_products_vendor_id on public.store_products(vendor_id);
create index if not exists idx_store_products_product_id on public.store_products(product_id);
create index if not exists idx_store_products_state on public.store_products(state);
create index if not exists idx_store_products_price_amount on public.store_products(price_amount);

-- Prevent duplicate non-archived offer business rows
create unique index if not exists uq_store_products_business_active
on public.store_products(vendor_id, product_id, condition, listing_variant_key)
where state <> 'archived';

-- STEP 10: Enable RLS (default deny strategy)
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_products enable row level security;

-- STEP 11: RLS skeleton policies (intentionally deny-all placeholders)
-- These are structural placeholders and will be replaced by full business policies in next steps.

create policy profiles_skeleton_deny_all
on public.profiles
for all
to authenticated
using (false)
with check (false);

create policy vendors_skeleton_deny_all
on public.vendors
for all
to authenticated
using (false)
with check (false);

create policy vendor_members_skeleton_deny_all
on public.vendor_members
for all
to authenticated
using (false)
with check (false);

create policy categories_skeleton_deny_all
on public.categories
for all
to authenticated
using (false)
with check (false);

create policy products_skeleton_deny_all
on public.products
for all
to authenticated
using (false)
with check (false);

create policy store_products_skeleton_deny_all
on public.store_products
for all
to authenticated
using (false)
with check (false);

-- UPDATE: replace profiles skeleton with production-safe own-row policies
-- TABLE: profiles
-- RLS POLICY CHANGE SUMMARY
-- - dropped skeleton deny-all policy
-- - added own-row SELECT
-- - added own-row INSERT (base role only)
-- - added own-row UPDATE (no role escalation)
-- - added explicit DELETE deny

drop policy if exists profiles_skeleton_deny_all on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'user'
);

create policy profiles_update_own_no_role_change
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (
    select p.role
    from public.profiles as p
    where p.id = auth.uid()
  )
);

create policy profiles_delete_denied
on public.profiles
for delete
to authenticated
using (false);

-- UPDATE: implement vendors production RLS + ownership immutability guard
-- TABLE: vendors
-- RLS POLICY CHANGE SUMMARY
-- - added DB-side immutability trigger for owner_user_id
-- - dropped skeleton deny-all policy
-- - added SELECT gate: active member or platform admin
-- - added INSERT gate: self-owned vendor creation (or platform admin)
-- - added UPDATE gate: owner/manager (active membership) or platform admin
-- - added explicit DELETE deny

create or replace function public.prevent_vendor_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.owner_user_id <> old.owner_user_id then
    raise exception 'owner_user_id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vendors_owner_immutable on public.vendors;
create trigger trg_vendors_owner_immutable
before update on public.vendors
for each row
execute function public.prevent_vendor_owner_change();

drop policy if exists vendors_skeleton_deny_all on public.vendors;

create policy vendors_select_member_or_admin
on public.vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = vendors.id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
  )
);

create policy vendors_insert_owner_self_or_admin
on public.vendors
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy vendors_update_owner_manager_or_admin
on public.vendors
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = vendors.id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
      and vm.role in ('owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = vendors.id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
      and vm.role in ('owner', 'manager')
  )
);

create policy vendors_delete_denied
on public.vendors
for delete
to authenticated
using (false);

-- UPDATE: vendor_members RLS production
-- TABLE: vendor_members
-- SUMMARY: dropped skeleton policy, added immutable identity trigger, added SELECT/INSERT/UPDATE policies with owner/admin authority, added DELETE deny.
-- SECURITY NOTE: This vendor_members RLS set is frozen. Any change requires a new security review.

drop policy if exists vendor_members_skeleton_deny_all on public.vendor_members;

create or replace function public.prevent_vendor_members_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.vendor_id <> old.vendor_id then
    raise exception 'vendor_id is immutable';
  end if;

  if new.user_id <> old.user_id then
    raise exception 'user_id is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vendor_members_identity_immutable on public.vendor_members;
create trigger trg_vendor_members_identity_immutable
before update on public.vendor_members
for each row
execute function public.prevent_vendor_members_identity_change();

create policy vendor_members_select_self_owner_or_admin
on public.vendor_members
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or user_id = auth.uid()
  or exists (
    select 1
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
);

create policy vendor_members_insert_owner_or_admin
on public.vendor_members
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'platform_admin'
    )
  )
  or (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_members.vendor_id
        and v.owner_user_id = auth.uid()
    )
    and vendor_members.role in ('manager', 'editor')
    and vendor_members.status = 'active'
  )
);

create policy vendor_members_update_owner_or_admin
on public.vendor_members
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
);

create policy vendor_members_delete_denied
on public.vendor_members
for delete
to authenticated
using (false);

-- UPDATE: products RLS production
-- TABLE: products
-- SUMMARY: dropped skeleton policy, added SELECT active-or-admin, INSERT admin-only, UPDATE admin-only, DELETE deny.

drop policy if exists products_skeleton_deny_all on public.products;

create policy products_select_active_or_admin
on public.products
for select
to authenticated
using (
  state = 'active'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy products_insert_admin_only
on public.products
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy products_update_admin_only
on public.products
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy products_delete_denied
on public.products
for delete
to authenticated
using (false);

-- UPDATE: categories RLS production
-- TABLE: categories
-- SUMMARY: dropped skeleton policy, added SELECT active-or-admin, INSERT admin-only, UPDATE admin-only, DELETE deny.

drop policy if exists categories_skeleton_deny_all on public.categories;

create policy categories_select_active_or_admin
on public.categories
for select
to authenticated
using (
  state = 'active'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy categories_insert_admin_only
on public.categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy categories_update_admin_only
on public.categories
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy categories_delete_denied
on public.categories
for delete
to authenticated
using (false);

-- UPDATE: store_products RLS production
-- TABLE: store_products
-- SUMMARY: dropped skeleton policy, added SELECT public/member/admin, INSERT member-or-admin, UPDATE member-or-admin with archived restrictions, DELETE deny.

drop policy if exists store_products_skeleton_deny_all on public.store_products;

create policy store_products_select_public_member_or_admin
on public.store_products
for select
to authenticated
using (
  (
    state = 'active'
    and exists (
      select 1
      from public.products p
      where p.id = store_products.product_id
        and p.state = 'active'
    )
  )
  or exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = store_products.vendor_id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
  )
);

create policy store_products_insert_member_or_admin
on public.store_products
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
  or (
    exists (
      select 1
      from public.vendor_members vm
      where vm.vendor_id = store_products.vendor_id
        and vm.user_id = auth.uid()
        and vm.status = 'active'
        and vm.role in ('owner', 'manager', 'editor')
    )
    and exists (
      select 1
      from public.products p
      where p.id = store_products.product_id
        and p.state = 'active'
    )
    and created_by = auth.uid()
  )
);

create policy store_products_update_member_or_admin
on public.store_products
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
  or (
    state <> 'archived'
    and exists (
      select 1
      from public.vendor_members vm
      where vm.vendor_id = store_products.vendor_id
        and vm.user_id = auth.uid()
        and vm.status = 'active'
        and vm.role in ('owner', 'manager', 'editor')
    )
  )
)
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
  or (
    exists (
      select 1
      from public.vendor_members vm
      where vm.vendor_id = store_products.vendor_id
        and vm.user_id = auth.uid()
        and vm.status = 'active'
        and vm.role in ('owner', 'manager', 'editor')
    )
    and exists (
      select 1
      from public.products p
      where p.id = store_products.product_id
        and p.state = 'active'
    )
    and updated_by = auth.uid()
    and (
      state <> 'archived'
      or exists (
        select 1
        from public.vendor_members vm2
        where vm2.vendor_id = store_products.vendor_id
          and vm2.user_id = auth.uid()
          and vm2.status = 'active'
          and vm2.role in ('owner', 'manager')
      )
    )
  )
);

create policy store_products_delete_denied
on public.store_products
for delete
to authenticated
using (false);

-- UPDATE: profiles
-- TABLE: profiles
-- SUMMARY: RLS fix applied (circular dependency removal + deterministic policies)

drop policy if exists profiles_update_own_no_role_change on public.profiles;

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role then
    raise exception 'role is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_immutable on public.profiles;
create trigger trg_profiles_role_immutable
before update on public.profiles
for each row
execute function public.prevent_profile_role_change();

-- UPDATE: vendors
-- TABLE: vendors
-- SUMMARY: RLS fix applied (circular dependency removal + deterministic policies)

drop policy if exists vendors_select_member_or_admin on public.vendors;
drop policy if exists vendors_update_owner_manager_or_admin on public.vendors;

create policy vendors_select_owner_or_admin
on public.vendors
for select
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy vendors_update_owner_or_admin
on public.vendors
for update
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
)
with check (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

-- UPDATE: vendor_members
-- TABLE: vendor_members
-- SUMMARY: RLS fix applied (circular dependency removal + deterministic policies)

drop policy if exists vendor_members_select_self_owner_or_admin on public.vendor_members;
drop policy if exists vendor_members_insert_owner_or_admin on public.vendor_members;
drop policy if exists vendor_members_update_owner_or_admin on public.vendor_members;

create policy vendor_members_select_self_owner_or_admin
on public.vendor_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy vendor_members_insert_owner_or_admin
on public.vendor_members
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_members.vendor_id
        and v.owner_user_id = auth.uid()
    )
    and vendor_members.role in ('manager', 'editor')
    and vendor_members.status = 'active'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

create policy vendor_members_update_owner_or_admin
on public.vendor_members
for update
to authenticated
using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
)
with check (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
);

-- UPDATE: store_products
-- TABLE: store_products
-- SUMMARY: RLS fix applied (circular dependency removal + deterministic policies)

drop policy if exists store_products_select_public_member_or_admin on public.store_products;

create policy store_products_select_public_active
on public.store_products
for select
to authenticated
using (
  state = 'active'
  and exists (
    select 1
    from public.products p
    where p.id = store_products.product_id
      and p.state = 'active'
  )
);

create policy store_products_select_admin_full
on public.store_products
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
);

create policy store_products_select_vendor_scoped
on public.store_products
for select
to authenticated
using (
  exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = store_products.vendor_id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
  )
);

-- UPDATE: store_products
-- TABLE: store_products
-- SUMMARY: Hardening — write paths use only platform_admin + vendors.owner_user_id; vendor_members removed from INSERT/UPDATE; SELECT unchanged.

drop policy if exists store_products_insert_member_or_admin on public.store_products;
drop policy if exists store_products_update_member_or_admin on public.store_products;

create policy store_products_insert_owner_or_admin
on public.store_products
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
  or (
    exists (
      select 1
      from public.vendors v
      where v.id = store_products.vendor_id
        and v.owner_user_id = auth.uid()
    )
    and exists (
      select 1
      from public.products p
      where p.id = store_products.product_id
        and p.state = 'active'
    )
    and created_by = auth.uid()
  )
);

create policy store_products_update_owner_or_admin
on public.store_products
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
  or (
    state <> 'archived'
    and exists (
      select 1
      from public.vendors v
      where v.id = store_products.vendor_id
        and v.owner_user_id = auth.uid()
    )
  )
)
with check (
  exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'platform_admin'
  )
  or (
    exists (
      select 1
      from public.vendors v
      where v.id = store_products.vendor_id
        and v.owner_user_id = auth.uid()
    )
    and exists (
      select 1
      from public.products p
      where p.id = store_products.product_id
        and p.state = 'active'
    )
    and updated_by = auth.uid()
    and (
      store_products.state <> 'archived'
      or exists (
        select 1
        from public.vendors v2
        where v2.id = store_products.vendor_id
          and v2.owner_user_id = auth.uid()
      )
    )
  )
);
