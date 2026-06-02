-- Phase 1: Merchant catalog submissions → admin queue → new `products` row (platform_admin only).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.catalog_product_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  title text not null,
  brand text,
  model text,
  slug_suggestion text not null,
  gtin text,
  mpn text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  admin_note text,
  resolved_product_id uuid references public.products(id) on delete set null,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_catalog_product_requests_set_updated_at
before update on public.catalog_product_requests
for each row
execute function public.set_updated_at();

create index if not exists idx_catalog_product_requests_tenant_status_created
  on public.catalog_product_requests (tenant_id, status, created_at desc);

create index if not exists idx_catalog_product_requests_vendor
  on public.catalog_product_requests (vendor_id, status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.catalog_product_requests enable row level security;

create policy catalog_product_requests_select_unified
on public.catalog_product_requests
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and exists (
      select 1
      from public.vendor_members vm
      where vm.vendor_id = catalog_product_requests.vendor_id
        and vm.user_id = auth.uid()
        and vm.status = 'active'
    )
  )
);

create policy catalog_product_requests_insert_merchant
on public.catalog_product_requests
for insert
to authenticated
with check (
  status = 'pending'
  and submitted_by_user_id = auth.uid()
  and tenant_id = public.auth_tenant_id()
  and public.auth_tenant_id() is not null
  and exists (
    select 1
    from public.vendors v
    where v.id = catalog_product_requests.vendor_id
      and v.tenant_id = catalog_product_requests.tenant_id
      and v.tenant_id = public.auth_tenant_id()
  )
  and exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = catalog_product_requests.vendor_id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
      and vm.role in ('owner', 'manager', 'editor')
  )
);

create policy catalog_product_requests_insert_admin
on public.catalog_product_requests
for insert
to authenticated
with check (public.auth_is_platform_admin());

create policy catalog_product_requests_update_admin
on public.catalog_product_requests
for update
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());

create policy catalog_product_requests_delete_denied
on public.catalog_product_requests
for delete
to authenticated
using (false);

grant select, insert, update on public.catalog_product_requests to authenticated;
