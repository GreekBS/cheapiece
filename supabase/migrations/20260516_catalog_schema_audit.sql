-- Phase 1.5: Lightweight schema audit log (append-only).

create table if not exists public.schema_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  schema_version_id uuid references public.category_schema_versions(id) on delete set null,
  event_type text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  reason text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_schema_audit_events_tenant_category_occurred
  on public.schema_audit_events (tenant_id, category_id, occurred_at desc);

alter table public.schema_audit_events enable row level security;

create policy schema_audit_events_admin_all
on public.schema_audit_events
for all
to authenticated
using (public.auth_is_platform_admin())
with check (public.auth_is_platform_admin());
