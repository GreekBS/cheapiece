-- Phase A: additive product definition revisions (major-edit moderation foundation).
-- No changes to existing approval/publish behavior.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.product_definition_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  source_catalog_request_id uuid not null references public.catalog_product_requests(id) on delete restrict,
  baseline_publication_product_id uuid not null
    references public.product_catalog_publications(product_id) on delete restrict,
  status text not null default 'pending_review'
    check (status in ('draft', 'pending_review', 'approved', 'rejected', 'cancelled', 'superseded')),
  proposed_payload jsonb not null,
  changed_fields text[] not null default array[]::text[],
  diff_summary jsonb,
  merchant_note text,
  rejection_reason text,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_publication_product_id uuid
    references public.product_catalog_publications(product_id) on delete set null,
  superseded_by_revision_id uuid
    references public.product_definition_revisions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_definition_revisions_review_pair_check
    check (
      (reviewed_at is null and reviewed_by is null)
      or (reviewed_at is not null and reviewed_by is not null)
    )
);

create index if not exists idx_product_definition_revisions_vendor_product_created
  on public.product_definition_revisions (vendor_id, product_id, created_at desc);

create index if not exists idx_product_definition_revisions_status_submitted
  on public.product_definition_revisions (status, submitted_at desc);

create index if not exists idx_product_definition_revisions_source_request
  on public.product_definition_revisions (source_catalog_request_id);

create unique index if not exists uq_product_definition_revisions_one_pending_per_product
  on public.product_definition_revisions (vendor_id, product_id)
  where status = 'pending_review';

drop trigger if exists trg_product_definition_revisions_set_updated_at on public.product_definition_revisions;
create trigger trg_product_definition_revisions_set_updated_at
before update on public.product_definition_revisions
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (minimal: merchant owner submit/read own vendor; admin read all)
-- ---------------------------------------------------------------------------
alter table public.product_definition_revisions enable row level security;

drop policy if exists product_definition_revisions_select_admin on public.product_definition_revisions;
create policy product_definition_revisions_select_admin
on public.product_definition_revisions
for select
to authenticated
using (public.auth_is_platform_admin());

drop policy if exists product_definition_revisions_select_vendor on public.product_definition_revisions;
create policy product_definition_revisions_select_vendor
on public.product_definition_revisions
for select
to authenticated
using (
  not public.auth_is_platform_admin()
  and tenant_id = public.auth_tenant_id()
  and public.auth_tenant_id() is not null
  and exists (
    select 1
    from public.vendors v
    where v.id = product_definition_revisions.vendor_id
      and v.owner_user_id = auth.uid()
  )
);

drop policy if exists product_definition_revisions_insert_vendor_owner on public.product_definition_revisions;
create policy product_definition_revisions_insert_vendor_owner
on public.product_definition_revisions
for insert
to authenticated
with check (
  status = 'pending_review'
  and submitted_by = auth.uid()
  and tenant_id = public.auth_tenant_id()
  and public.auth_tenant_id() is not null
  and exists (
    select 1
    from public.vendors v
    where v.id = product_definition_revisions.vendor_id
      and v.tenant_id = product_definition_revisions.tenant_id
      and v.owner_user_id = auth.uid()
  )
);
