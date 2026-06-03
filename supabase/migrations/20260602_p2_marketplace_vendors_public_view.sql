-- =============================================================================
-- Option A — P2 (NOT part of initial staging rollout): anon-safe vendor display
-- =============================================================================
-- Does NOT add RLS policies on public.vendors.
-- Exposes only display-safe columns via a definer view (bypasses vendors RLS safely).
--
-- Deploy AFTER P1 staging verification + explicit approval (same gate as production).
-- App: vendor-display-resolver.ts reads from marketplace_vendors_public.
--
-- Rollback:
--   drop view if exists public.marketplace_vendors_public;
-- =============================================================================

drop view if exists public.marketplace_vendors_public;

create view public.marketplace_vendors_public
with (security_invoker = false)
as
select
  v.id,
  v.tenant_id,
  v.name,
  v.slug,
  v.logo_url,
  v.state
from public.vendors v
where v.state = 'active';

alter view public.marketplace_vendors_public owner to postgres;

comment on view public.marketplace_vendors_public is
  'Marketplace PDP/browse: vendor id, name, logo only. No contact_email, phone, address, or owner_user_id.';

revoke all on public.marketplace_vendors_public from public;
grant select on public.marketplace_vendors_public to anon, authenticated;
