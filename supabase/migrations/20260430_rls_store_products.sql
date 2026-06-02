-- RLS IMPLEMENTATION STEP: store_products
-- Date: 2026-04-30
-- Scope: Replace store_products skeleton deny policy with production-safe policies.

-- Remove skeleton placeholder policy for store_products
drop policy if exists store_products_skeleton_deny_all on public.store_products;

-- SELECT:
-- - public visibility: active offers linked to active products
-- - platform admin: full visibility
-- - active vendor members: own-vendor visibility
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

-- INSERT:
-- - platform admin
-- - active vendor members with role owner/manager/editor on same vendor
-- - non-admin path requires active product and created_by = actor
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

-- UPDATE:
-- - platform admin
-- - active vendor members with role owner/manager/editor on same vendor
-- - archived rows are immutable for non-admin path
-- - transition to archived allowed only for owner/manager (non-admin path)
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

-- DELETE: explicitly denied for authenticated users
create policy store_products_delete_denied
on public.store_products
for delete
to authenticated
using (false);
