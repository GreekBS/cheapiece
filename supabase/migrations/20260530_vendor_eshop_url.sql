alter table public.vendors
  add column if not exists eshop_url text;

comment on column public.vendors.eshop_url is
  'External e-shop URL (HTTPS only when set).';

alter table public.vendors
  drop constraint if exists vendors_eshop_url_https_check;

alter table public.vendors
  add constraint vendors_eshop_url_https_check
  check (eshop_url is null or eshop_url ~ '^https://');
