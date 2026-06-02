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
