-- Municipal / Marketplace — core schema (DDL + triggers + helper functions)
-- Source: supabase/sql_log.sql STEPS 0–8 + vendor/vendor_members/profile immutability from same log.
-- Apply BEFORE indexes.sql and rls.sql on a fresh Supabase project (auth schema must exist).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
