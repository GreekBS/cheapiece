-- Vendor store logos: public bucket, tenant-prefixed paths (RLS on storage.objects only).

insert into storage.buckets (id, name, public)
values ('vendor-logos', 'vendor-logos', true)
on conflict (id) do update set public = excluded.public;

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
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy vendor_logos_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vendor-logos'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
)
with check (
  bucket_id = 'vendor-logos'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy vendor_logos_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vendor-logos'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

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
