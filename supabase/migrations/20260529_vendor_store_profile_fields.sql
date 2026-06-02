-- Store identity fields on vendors (SaaS per-store profile). RLS unchanged.

alter table public.vendors
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists address text;

comment on column public.vendors.description is 'Public store description (merchant settings).';
comment on column public.vendors.logo_url is 'Store logo URL (v1: external URL only).';
comment on column public.vendors.contact_email is 'Store contact email.';
comment on column public.vendors.contact_phone is 'Store contact phone.';
comment on column public.vendors.address is 'Optional store address.';
