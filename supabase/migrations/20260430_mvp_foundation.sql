-- MVP FOUNDATION MIGRATION
-- Date: 2026-04-30
-- Scope: profiles, vendors, vendor_members, categories, products, store_products
-- Notes:
-- 1) No hard delete in application paths (RLS deny by default, no delete policies).
-- 2) RLS enabled on all tables with skeleton deny policies.

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
