-- Admin: approve pending catalog request by linking to existing published product (no new products row).

create or replace function public.approve_catalog_request_link_existing(
  p_request_id uuid,
  p_product_id uuid,
  p_admin_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_req public.catalog_product_requests%rowtype;
  v_product public.products%rowtype;
  n int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if not public.auth_is_platform_admin() then
    raise exception 'forbidden';
  end if;

  if p_request_id is null or p_product_id is null then
    raise exception 'invalid_input';
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

  select * into v_product
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product_not_found';
  end if;

  if v_product.tenant_id is distinct from v_req.tenant_id then
    raise exception 'tenant_mismatch';
  end if;

  if v_product.state is distinct from 'active' then
    raise exception 'product_not_active';
  end if;

  if not exists (
    select 1
    from public.product_catalog_publications pub
    where pub.product_id = p_product_id
      and pub.tenant_id = v_req.tenant_id
  ) then
    raise exception 'product_not_published';
  end if;

  update public.catalog_product_requests r
  set
    status = 'approved',
    resolved_product_id = p_product_id,
    reviewed_by_user_id = v_user_id,
    reviewed_at = now(),
    admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where r.id = p_request_id
    and r.status = 'pending';

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'request_not_updated';
  end if;

  update public.catalog_request_matches m
  set
    match_reviewed_product_id = p_product_id,
    match_review_status = 'overridden',
    match_reviewed_by_user_id = v_user_id,
    match_reviewed_at = now()
  where m.request_id = p_request_id;

  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'match_not_found';
  end if;

  return p_product_id;
end;
$$;

revoke all on function public.approve_catalog_request_link_existing(uuid, uuid, text) from public;
grant execute on function public.approve_catalog_request_link_existing(uuid, uuid, text) to authenticated;

comment on function public.approve_catalog_request_link_existing(uuid, uuid, text) is
  'Platform admin: approve pending request by resolving to existing published product; no products/publications insert.';
