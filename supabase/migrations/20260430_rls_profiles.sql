-- RLS IMPLEMENTATION STEP: profiles
-- Date: 2026-04-30
-- Scope: Replace skeleton deny policy with production-safe profiles policies.

-- Remove skeleton placeholder policy for profiles
drop policy if exists profiles_skeleton_deny_all on public.profiles;

-- SELECT: user can read only own profile
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- INSERT: user can create only own profile row and only with base role
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'user'
);

-- UPDATE: user can update only own row, without role escalation
create policy profiles_update_own_no_role_change
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (
    select p.role
    from public.profiles as p
    where p.id = auth.uid()
  )
);

-- DELETE: explicitly denied for authenticated users
create policy profiles_delete_denied
on public.profiles
for delete
to authenticated
using (false);
