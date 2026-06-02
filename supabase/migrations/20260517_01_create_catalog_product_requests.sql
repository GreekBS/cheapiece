-- Phase 1: catalog_product_requests — structural baseline only.
-- Dependencies: tenants, categories, category_schema_versions, public.set_updated_at()
--
-- SOURCE OF TRUTH (catalog schema):
--   category_schema_versions + category_schema_fields = authoritative
--   document_snapshot = cache/audit only, never authoritative

create table if not exists public.catalog_product_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vendor_id uuid,
  submitted_by_user_id uuid,
  category_id uuid references public.categories(id) on delete restrict,
  title text,
  brand text,
  model text,
  slug_suggestion text,
  status text not null default 'pending',
  constraint catalog_product_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  attribute_payload jsonb not null default '{}'::jsonb,
  schema_version_id uuid references public.category_schema_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_product_requests_tenant_vendor
  on public.catalog_product_requests (tenant_id, vendor_id);

create index if not exists idx_catalog_product_requests_schema_version_id
  on public.catalog_product_requests (schema_version_id);

create index if not exists idx_catalog_product_requests_status
  on public.catalog_product_requests (status);

create index if not exists idx_catalog_product_requests_tenant_status_created
  on public.catalog_product_requests (tenant_id, status, created_at desc);

drop trigger if exists trg_catalog_product_requests_set_updated_at on public.catalog_product_requests;
create trigger trg_catalog_product_requests_set_updated_at
before update on public.catalog_product_requests
for each row
execute function public.set_updated_at();
