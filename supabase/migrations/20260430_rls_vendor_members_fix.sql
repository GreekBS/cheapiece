-- UPDATE: vendor_members
-- TABLE: vendor_members
-- SUMMARY: RLS fix applied (circular dependency removal + deterministic policies)

drop policy if exists vendor_members_select_self_owner_or_admin on public.vendor_members;
drop policy if exists vendor_members_insert_owner_or_admin on public.vendor_members;
drop policy if exists vendor_members_update_owner_or_admin on public.vendor_members;

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
