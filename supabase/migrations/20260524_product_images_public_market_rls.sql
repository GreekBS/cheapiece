-- Marketplace (anon) read access for product_images + product-images storage.
-- Option A: business rules on product_images RLS; minimal path-only storage RLS.
-- Admin policies from 20260523_product_images_p1.sql are unchanged.

grant select on public.product_images to anon;

drop policy if exists product_images_select_public_market on public.product_images;
create policy product_images_select_public_market
on public.product_images
for select
to anon
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.tenant_id = product_images.tenant_id
      and p.state = 'active'
  )
);

drop policy if exists product_images_storage_select_public_market on storage.objects;
create policy product_images_storage_select_public_market
on storage.objects
for select
to anon
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 2) = 'products'
);
