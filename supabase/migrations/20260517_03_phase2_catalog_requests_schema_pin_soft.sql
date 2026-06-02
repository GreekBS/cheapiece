-- Phase 2.3: Soft schema_version_id pinning validation on catalog_product_requests.
-- NULL schema_version_id → insert allowed (Phase 1 compatibility).
-- Non-null schema_version_id → must reference a published schema with matching tenant/category.
--
-- DB trigger is ONLY for:
--   - published schema existence
--   - tenant/category consistency
-- NOT for mode logic or validation duplication.
-- evaluateCatalogRequestState() in application is the sole validation authority.

create or replace function public.catalog_product_requests_validate_schema_version_soft()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_schema_tenant_id uuid;
  v_schema_category_id uuid;
begin
  if new.schema_version_id is null then
    return new;
  end if;

  select csv.state, csv.tenant_id, csv.category_id
  into v_state, v_schema_tenant_id, v_schema_category_id
  from public.category_schema_versions csv
  where csv.id = new.schema_version_id;

  if not found then
    raise exception 'catalog_product_requests.schema_version_id % does not exist', new.schema_version_id;
  end if;

  if v_state is distinct from 'published' then
    raise exception
      'catalog_product_requests.schema_version_id must reference a published schema (state=%)',
      v_state;
  end if;

  if v_schema_tenant_id is distinct from new.tenant_id then
    raise exception 'catalog_product_requests.schema_version_id tenant mismatch';
  end if;

  if new.category_id is null then
    raise exception 'catalog_product_requests.category_id is required when schema_version_id is set';
  end if;

  if v_schema_category_id is distinct from new.category_id then
    raise exception 'catalog_product_requests.schema_version_id category mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_catalog_product_requests_validate_schema_version on public.catalog_product_requests;
drop trigger if exists trg_catalog_product_requests_validate_schema_version_soft on public.catalog_product_requests;

create trigger trg_catalog_product_requests_validate_schema_version_soft
before insert on public.catalog_product_requests
for each row
execute function public.catalog_product_requests_validate_schema_version_soft();
