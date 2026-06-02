-- =============================================================================
-- Fix 42P17: infinite recursion in RLS on public.vendors
-- =============================================================================
-- Root cause (20260504 regression):
--   vendors_select_unified  → EXISTS (SELECT … FROM vendor_members …)
--   vendor_members_select_unified → EXISTS (SELECT … FROM vendors …)
--   → policy re-entry loop → SQLSTATE 42P17
--
-- Minimal fix:
--   Replace inline vendor_members subqueries on vendors policies with
--   SECURITY DEFINER helper auth_has_active_vendor_membership().
--   Helper reads vendor_members without RLS (same pattern as auth_is_platform_admin).
--   vendor_members policies are NOT changed.
--
-- Semantics preserved:
--   • platform_admin  → auth_is_platform_admin()
--   • store owner     → owner_user_id = auth.uid() + tenant match
--   • team member     → active vendor_members row + tenant match
--   • UPDATE          → owner OR manager/owner membership roles (unchanged)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Helper: membership check without RLS recursion
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER + search_path = public: reads vendor_members directly.
-- p_roles NULL  → any active role (SELECT semantics, incl. editor).
-- p_roles set   → restrict to listed roles (UPDATE semantics: owner, manager).
-- Tenant guard: vm.tenant_id must match auth_tenant_id() (profile tenant).
-- -----------------------------------------------------------------------------

create or replace function public.auth_has_active_vendor_membership(
  p_vendor_id uuid,
  p_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_members vm
    where vm.vendor_id = p_vendor_id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
      and vm.tenant_id is not distinct from public.auth_tenant_id()
      and (
        p_roles is null
        or vm.role = any (p_roles)
      )
  );
$$;

comment on function public.auth_has_active_vendor_membership(uuid, text[]) is
  'Active vendor_members row for auth.uid() on vendor; optional role filter. SECURITY DEFINER avoids vendors↔vendor_members RLS recursion (42P17).';

revoke all on function public.auth_has_active_vendor_membership(uuid, text[]) from public;
grant execute on function public.auth_has_active_vendor_membership(uuid, text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 2) vendors SELECT: drop + recreate (only policy that caused SELECT recursion)
-- -----------------------------------------------------------------------------

drop policy if exists vendors_select_unified on public.vendors;

create policy vendors_select_unified
on public.vendors
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and (
      owner_user_id = auth.uid()
      or public.auth_has_active_vendor_membership(id)
    )
  )
);

-- -----------------------------------------------------------------------------
-- 3) vendors UPDATE: drop + recreate (USING + WITH CHECK; same membership rules)
-- -----------------------------------------------------------------------------

drop policy if exists vendors_update_unified on public.vendors;

create policy vendors_update_unified
on public.vendors
for update
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and (
      owner_user_id = auth.uid()
      or public.auth_has_active_vendor_membership(id, array['owner', 'manager']::text[])
    )
  )
)
with check (
  public.auth_is_platform_admin()
  or (
    tenant_id = public.auth_tenant_id()
    and public.auth_tenant_id() is not null
    and (
      owner_user_id = auth.uid()
      or public.auth_has_active_vendor_membership(id, array['owner', 'manager']::text[])
    )
  )
);

-- =============================================================================
-- NOT MODIFIED (intentionally):
--   vendors_insert_unified, vendors_delete_denied
--   all vendor_members_* policies
--   store_products_*, products_*, catalog_* policies
-- =============================================================================

-- =============================================================================
-- ROLLBACK (manual — run only to revert this migration)
-- =============================================================================
--
-- drop policy if exists vendors_select_unified on public.vendors;
-- drop policy if exists vendors_update_unified on public.vendors;
--
-- create policy vendors_select_unified
-- on public.vendors
-- for select
-- to authenticated
-- using (
--   public.auth_is_platform_admin()
--   or (
--     tenant_id = public.auth_tenant_id()
--     and (
--       owner_user_id = auth.uid()
--       or exists (
--         select 1
--         from public.vendor_members vm
--         where vm.vendor_id = vendors.id
--           and vm.user_id = auth.uid()
--           and vm.status = 'active'
--       )
--     )
--   )
-- );
--
-- create policy vendors_update_unified
-- on public.vendors
-- for update
-- to authenticated
-- using (
--   public.auth_is_platform_admin()
--   or (
--     tenant_id = public.auth_tenant_id()
--     and (
--       owner_user_id = auth.uid()
--       or exists (
--         select 1
--         from public.vendor_members vm
--         where vm.vendor_id = vendors.id
--           and vm.user_id = auth.uid()
--           and vm.status = 'active'
--           and vm.role in ('owner', 'manager')
--       )
--     )
--   )
-- )
-- with check (
--   public.auth_is_platform_admin()
--   or (
--     tenant_id = public.auth_tenant_id()
--     and (
--       owner_user_id = auth.uid()
--       or exists (
--         select 1
--         from public.vendor_members vm
--         where vm.vendor_id = vendors.id
--           and vm.user_id = auth.uid()
--           and vm.status = 'active'
--           and vm.role in ('owner', 'manager')
--       )
--     )
--   )
-- );
--
-- drop function if exists public.auth_has_active_vendor_membership(uuid, text[]);
-- =============================================================================
