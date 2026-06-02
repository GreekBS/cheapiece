-- Row Level Security — final frozen model from supabase/sql_log.sql (append-only log consolidated).
-- Run after schema.sql + indexes.sql.
-- Clears existing policies on these public tables only, then recreates the production set.

do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles',
        'vendors',
        'vendor_members',
        'categories',
        'products',
        'store_products'
      ])
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.store_products enable row level security;

-- profiles
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

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy profiles_delete_denied
on public.profiles
for delete
to authenticated
using (false);

-- vendors
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

create policy vendors_delete_denied
on public.vendors
for delete
to authenticated
using (false);

-- vendor_members
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

create policy vendor_members_delete_denied
on public.vendor_members
for delete
to authenticated
using (false);

-- categories
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

-- products
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

-- store_products (split SELECT + owner writes; matches offer-mutation-service owner gate)
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

create policy store_products_delete_denied
on public.store_products
for delete
to authenticated
using (false);
