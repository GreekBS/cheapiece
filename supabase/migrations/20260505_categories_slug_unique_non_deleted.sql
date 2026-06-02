-- Allow re-using a slug after soft-delete (state = 'deleted') while keeping
-- uniqueness among active + archived rows for tenant-safe taxonomy sync.
drop index if exists uq_categories_tenant_slug;

create unique index uq_categories_tenant_slug_active
  on public.categories (tenant_id, slug)
  where state is distinct from 'deleted';
