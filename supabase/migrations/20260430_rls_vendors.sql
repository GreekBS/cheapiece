-- RLS IMPLEMENTATION STEP: vendors
-- Date: 2026-04-30
-- Scope: Replace vendors skeleton deny policy with production-safe vendors policies.

-- UPDATED: enforce DB-side ownership lock for owner_user_id immutability
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

-- Remove skeleton placeholder policy for vendors
drop policy if exists vendors_skeleton_deny_all on public.vendors;

-- SELECT: only active vendor members or platform admins
create policy vendors_select_member_or_admin
on public.vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = vendors.id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
  )
);

-- INSERT: authenticated user can create only own-owned vendor row
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

-- UPDATE: only platform admin or active owner/manager of same vendor
-- owner_user_id immutability is enforced by DB trigger above.
create policy vendors_update_owner_manager_or_admin
on public.vendors
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = vendors.id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
      and vm.role in ('owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = vendors.id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
      and vm.role in ('owner', 'manager')
  )
);

-- DELETE: explicitly denied for authenticated users
create policy vendors_delete_denied
on public.vendors
for delete
to authenticated
using (false);
