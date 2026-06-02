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
