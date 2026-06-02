-- RLS IMPLEMENTATION STEP: products
-- Date: 2026-04-30
-- Scope: Replace products skeleton deny policy with production-safe policies.

-- Remove skeleton placeholder policy for products
drop policy if exists products_skeleton_deny_all on public.products;

-- SELECT: active products are publicly visible, platform admin can read all
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

-- INSERT: platform admin only
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

-- UPDATE: platform admin only
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

-- DELETE: explicitly denied for authenticated users
create policy products_delete_denied
on public.products
for delete
to authenticated
using (false);
