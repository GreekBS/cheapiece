-- Phase 2: Merchant read-only RLS on catalog-schema tables (SELECT only).
-- Additive to existing platform_admin policies — does not block admin or service-role flows.
-- No schema changes, triggers, or catalog_product_requests modifications.
--
-- Tenant scope: auth.uid() → vendor_members (active) → vendors.tenant_id
-- Do not use auth_tenant_id().

-- ---------------------------------------------------------------------------
-- attribute_definitions — active rows, merchant tenant via vendor_members
-- ---------------------------------------------------------------------------
drop policy if exists attribute_definitions_select_merchant on public.attribute_definitions;

create policy attribute_definitions_select_merchant
on public.attribute_definitions
for select
to authenticated
using (
  state = 'active'
  and exists (
    select 1
    from public.vendor_members vm
    inner join public.vendors v on v.id = vm.vendor_id
    where vm.user_id = auth.uid()
      and vm.status = 'active'
      and v.tenant_id = attribute_definitions.tenant_id
  )
);

-- ---------------------------------------------------------------------------
-- category_schema_versions — published only, merchant tenant via vendor_members
-- ---------------------------------------------------------------------------
drop policy if exists category_schema_versions_select_merchant on public.category_schema_versions;

create policy category_schema_versions_select_merchant
on public.category_schema_versions
for select
to authenticated
using (
  state = 'published'
  and exists (
    select 1
    from public.vendor_members vm
    inner join public.vendors v on v.id = vm.vendor_id
    where vm.user_id = auth.uid()
      and vm.status = 'active'
      and v.tenant_id = category_schema_versions.tenant_id
  )
);

-- ---------------------------------------------------------------------------
-- category_schema_fields — parent version published + tenant via vendor_members
-- ---------------------------------------------------------------------------
drop policy if exists category_schema_fields_select_merchant on public.category_schema_fields;

create policy category_schema_fields_select_merchant
on public.category_schema_fields
for select
to authenticated
using (
  exists (
    select 1
    from public.category_schema_versions csv
    where csv.id = category_schema_fields.schema_version_id
      and csv.state = 'published'
      and exists (
        select 1
        from public.vendor_members vm
        inner join public.vendors v on v.id = vm.vendor_id
        where vm.user_id = auth.uid()
          and vm.status = 'active'
          and v.tenant_id = csv.tenant_id
      )
  )
);
