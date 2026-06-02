-- RLS HARDENING: store_products write paths only
-- Date: 2026-04-30
-- Scope: INSERT/UPDATE — authority only profiles.platform_admin + vendors.owner_user_id
-- SELECT policies unchanged. vendor_members not used on write paths.

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
