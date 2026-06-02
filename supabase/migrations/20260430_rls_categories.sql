-- RLS IMPLEMENTATION STEP: categories
-- Date: 2026-04-30
-- Scope: Replace categories skeleton deny policy with production-safe policies.

-- Remove skeleton placeholder policy for categories
drop policy if exists categories_skeleton_deny_all on public.categories;

-- SELECT: active categories are publicly visible, platform admin can read all
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

-- INSERT: platform admin only
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

-- UPDATE: platform admin only
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

-- DELETE: explicitly denied for authenticated users
create policy categories_delete_denied
on public.categories
for delete
to authenticated
using (false);
