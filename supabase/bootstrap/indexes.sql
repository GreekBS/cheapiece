-- Indexes referenced by marketplace ordering / filters (code: search-market-offers, store-product-queries)
-- Source: supabase/sql_log.sql STEP 9

create index if not exists idx_vendor_members_vendor_id on public.vendor_members(vendor_id);
create index if not exists idx_vendor_members_user_id on public.vendor_members(user_id);
create index if not exists idx_vendor_members_status on public.vendor_members(status);
create index if not exists idx_products_state on public.products(state);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_store_products_vendor_id on public.store_products(vendor_id);
create index if not exists idx_store_products_product_id on public.store_products(product_id);
create index if not exists idx_store_products_state on public.store_products(state);
create index if not exists idx_store_products_price_amount on public.store_products(price_amount);

create unique index if not exists uq_store_products_business_active
on public.store_products(vendor_id, product_id, condition, listing_variant_key)
where state <> 'archived';
