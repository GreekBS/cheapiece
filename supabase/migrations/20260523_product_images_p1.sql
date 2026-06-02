-- Admin product catalog images: tenant-scoped gallery + list thumbnails.

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order int not null default 0 check (sort_order >= 0 and sort_order < 5),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_storage_path_unique unique (storage_path)
);

create index if not exists idx_product_images_tenant
  on public.product_images (tenant_id);

create index if not exists idx_product_images_product_sort
  on public.product_images (product_id, sort_order asc);

create unique index if not exists uq_product_images_one_primary
  on public.product_images (product_id)
  where is_primary = true;

drop trigger if exists trg_product_images_set_updated_at on public.product_images;
create trigger trg_product_images_set_updated_at
before update on public.product_images
for each row
execute function public.set_updated_at();

create or replace function public.product_images_enforce_max_five()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  select count(*)::int into v_count
  from public.product_images
  where product_id = new.product_id;

  if v_count >= 5 then
    raise exception 'product_images: maximum 5 images per product (product_id=%)', new.product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_product_images_max_five on public.product_images;
create trigger trg_product_images_max_five
before insert on public.product_images
for each row
execute function public.product_images_enforce_max_five();

create or replace function public.product_images_enforce_tenant_match()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.products p
    where p.id = new.product_id
      and p.tenant_id = new.tenant_id
  ) then
    raise exception 'product_images: tenant_id must match products.tenant_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_images_tenant_match on public.product_images;
create trigger trg_product_images_tenant_match
before insert or update of tenant_id, product_id on public.product_images
for each row
execute function public.product_images_enforce_tenant_match();

alter table public.product_images enable row level security;

drop policy if exists product_images_select_unified on public.product_images;
create policy product_images_select_unified
on public.product_images
for select
to authenticated
using (
  public.auth_is_platform_admin()
  or (
    public.auth_tenant_id() is not null
    and tenant_id = public.auth_tenant_id()
  )
);

drop policy if exists product_images_insert_admin on public.product_images;
create policy product_images_insert_admin
on public.product_images
for insert
to authenticated
with check (public.auth_is_platform_admin());

drop policy if exists product_images_update_admin on public.product_images;
create policy product_images_update_admin
on public.product_images
for update
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());

drop policy if exists product_images_delete_admin on public.product_images;
create policy product_images_delete_admin
on public.product_images
for delete
to authenticated
using (public.auth_is_platform_admin());

grant select, insert, update, delete on public.product_images to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists product_images_storage_insert on storage.objects;
drop policy if exists product_images_storage_update on storage.objects;
drop policy if exists product_images_storage_delete on storage.objects;
drop policy if exists product_images_storage_select on storage.objects;

create policy product_images_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy product_images_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
)
with check (
  bucket_id = 'product-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy product_images_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);

create policy product_images_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and (
    public.auth_is_platform_admin()
    or split_part(name, '/', 1) = public.auth_tenant_id()::text
  )
);
