-- RLS IMPLEMENTATION STEP: vendor_members
-- Date: 2026-04-30
-- Scope: Replace vendor_members skeleton deny policy with production-safe policies.
-- SECURITY NOTE: This RLS set is frozen. Any change requires a new security review.

-- Remove skeleton placeholder policy for vendor_members
drop policy if exists vendor_members_skeleton_deny_all on public.vendor_members;

-- DB integrity-only trigger for immutable identity keys
create or replace function public.prevent_vendor_members_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.vendor_id <> old.vendor_id then
    raise exception 'vendor_id is immutable';
  end if;

  if new.user_id <> old.user_id then
    raise exception 'user_id is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vendor_members_identity_immutable on public.vendor_members;
create trigger trg_vendor_members_identity_immutable
before update on public.vendor_members
for each row
execute function public.prevent_vendor_members_identity_change();

-- SELECT: platform admin, self row visibility, or vendor owner visibility
create policy vendor_members_select_self_owner_or_admin
on public.vendor_members
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_admin'
  )
  or user_id = auth.uid()
  or exists (
    select 1
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
);

-- INSERT: platform admin or vendor owner, with strict role/status constraints
create policy vendor_members_insert_owner_or_admin
on public.vendor_members
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'platform_admin'
    )
  )
  or (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_members.vendor_id
        and v.owner_user_id = auth.uid()
    )
    and vendor_members.role in ('manager', 'editor')
    and vendor_members.status = 'active'
  )
);

-- UPDATE: platform admin or vendor owner in same vendor context
create policy vendor_members_update_owner_or_admin
on public.vendor_members
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
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
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
    from public.vendors v
    where v.id = vendor_members.vendor_id
      and v.owner_user_id = auth.uid()
  )
);

-- DELETE: explicitly denied for authenticated users
create policy vendor_members_delete_denied
on public.vendor_members
for delete
to authenticated
using (false);
