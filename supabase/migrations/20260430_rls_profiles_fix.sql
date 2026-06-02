-- UPDATE: profiles
-- TABLE: profiles
-- SUMMARY: RLS fix applied (circular dependency removal + deterministic policies)

drop policy if exists profiles_update_own_no_role_change on public.profiles;

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role then
    raise exception 'role is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_immutable on public.profiles;
create trigger trg_profiles_role_immutable
before update on public.profiles
for each row
execute function public.prevent_profile_role_change();
