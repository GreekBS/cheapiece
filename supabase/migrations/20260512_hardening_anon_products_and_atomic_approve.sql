-- Pre-prod hardening:
-- 1) Remove hardcoded anon tenant filter on `products` (idempotent for DBs that ran older phase0).
-- 2) Atomic approve: single SECURITY DEFINER RPC (insert product + update request in one transaction).

-- ---------------------------------------------------------------------------
-- 1) Anon SELECT on products — active only, no tenant literal
-- ---------------------------------------------------------------------------
drop policy if exists products_select_anon_marketplace_active on public.products;
drop policy if exists products_select_anon_active on public.products;

create policy products_select_anon_active
on public.products
for select
to anon
using (state = 'active');

-- ---------------------------------------------------------------------------
-- 2) approve_catalog_product_request — platform_admin only, row lock, atomic
-- ---------------------------------------------------------------------------
create or replace function public.approve_catalog_product_request(
  p_request_id uuid,
  p_final_slug text,
  p_title text,
  p_brand text,
  p_model text,
  p_category_id uuid,
  p_admin_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.catalog_product_requests%rowtype;
  v_product_id uuid;
  v_slug text;
  v_cat uuid;
  v_brand text;
  v_model text;
  n int;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_req
  from public.catalog_product_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_req.status is distinct from 'pending' then
    raise exception 'invalid_state';
  end if;

  v_slug := lower(trim(p_final_slug));
  if v_slug is null or length(v_slug) = 0 then
    raise exception 'invalid_slug';
  end if;

  if exists (
    select 1
    from public.products p
    where p.tenant_id = v_req.tenant_id
      and p.slug = v_slug
  ) then
    raise exception 'slug_conflict';
  end if;

  v_cat := coalesce(p_category_id, v_req.category_id);
  v_brand := nullif(trim(coalesce(p_brand, '')), '');
  v_model := nullif(trim(coalesce(p_model, '')), '');

  insert into public.products (
    tenant_id,
    category_id,
    title,
    brand,
    model,
    slug,
    state
  )
  values (
    v_req.tenant_id,
    v_cat,
    trim(p_title),
    v_brand,
    v_model,
    v_slug,
    'active'
  )
  returning id into v_product_id;

  update public.catalog_product_requests r
  set
    status = 'approved',
    resolved_product_id = v_product_id,
    reviewed_by_user_id = auth.uid(),
    reviewed_at = now(),
    admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where r.id = p_request_id
    and r.status = 'pending';

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'request_not_updated';
  end if;

  return v_product_id;
end;
$$;

comment on function public.approve_catalog_product_request(uuid, text, text, text, text, uuid, text) is
  'Platform admin only: approve catalog_product_request, insert active product, update request — single transaction.';

revoke all on function public.approve_catalog_product_request(uuid, text, text, text, text, uuid, text) from public;
grant execute on function public.approve_catalog_product_request(uuid, text, text, text, text, uuid, text) to authenticated;
