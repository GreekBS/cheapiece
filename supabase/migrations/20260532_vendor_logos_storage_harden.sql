-- Harden vendor-logos storage writes: vendor-scoped auth (replaces tenant-only policies from 20260531).

create or replace function public.auth_can_manage_vendor_logo_storage(object_name text)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_tenant_text text;
  v_vendor_text text;
  v_tenant_id uuid;
  v_vendor_id uuid;
begin
  if object_name is null or btrim(object_name) = '' then
    return false;
  end if;

  if split_part(object_name, '/', 2) is distinct from 'vendors' then
    return false;
  end if;

  if split_part(object_name, '/', 5) <> '' then
    return false;
  end if;

  if split_part(object_name, '/', 4) !~ '^logo\.(png|jpg|jpeg|webp)$' then
    return false;
  end if;

  v_tenant_text := split_part(object_name, '/', 1);
  v_vendor_text := split_part(object_name, '/', 3);

  begin
    v_tenant_id := v_tenant_text::uuid;
    v_vendor_id := v_vendor_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  if v_tenant_id is distinct from public.auth_tenant_id()
     and not public.auth_is_platform_admin() then
    return false;
  end if;

  if public.auth_is_platform_admin() then
    return exists (
      select 1
      from public.vendors v
      where v.id = v_vendor_id
        and v.tenant_id = v_tenant_id
        and v.tenant_id::text = v_tenant_text
    );
  end if;

  return exists (
    select 1
    from public.vendors v
    where v.id = v_vendor_id
      and v.tenant_id = v_tenant_id
      and v.tenant_id = public.auth_tenant_id()
      and v.tenant_id::text = v_tenant_text
      and (
        v.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.vendor_members vm
          where vm.vendor_id = v.id
            and vm.user_id = auth.uid()
            and vm.status = 'active'
            and vm.role in ('owner', 'manager')
        )
      )
  );
end;
$$;

comment on function public.auth_can_manage_vendor_logo_storage(text) is
  'Storage RLS: path {tenantId}/vendors/{vendorId}/logo.{ext} + vendors_update-equivalent manage rights.';

grant execute on function public.auth_can_manage_vendor_logo_storage(text) to authenticated;

drop policy if exists vendor_logos_storage_insert on storage.objects;
drop policy if exists vendor_logos_storage_update on storage.objects;
drop policy if exists vendor_logos_storage_delete on storage.objects;
drop policy if exists vendor_logos_storage_select on storage.objects;

create policy vendor_logos_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vendor-logos'
  and public.auth_can_manage_vendor_logo_storage(name)
);

create policy vendor_logos_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vendor-logos'
  and public.auth_can_manage_vendor_logo_storage(name)
)
with check (
  bucket_id = 'vendor-logos'
  and public.auth_can_manage_vendor_logo_storage(name)
);

create policy vendor_logos_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vendor-logos'
  and public.auth_can_manage_vendor_logo_storage(name)
);

-- Public bucket: object GET via public URL does not require this policy.
-- Lightweight authenticated SELECT for Storage API metadata (no separate read helper).
create policy vendor_logos_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vendor-logos'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);
