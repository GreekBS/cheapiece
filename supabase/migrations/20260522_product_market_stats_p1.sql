create table if not exists public.canonical_product_stats_dirty (
  product_id uuid primary key references public.products(id) on delete cascade,
  bumped_at timestamptz not null default now()
);

drop index if exists public.idx_dirty_unique_recent;

create index if not exists idx_canonical_product_stats_dirty_bumped
  on public.canonical_product_stats_dirty (bumped_at asc);

create table if not exists public.product_market_stats (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  active_offer_count integer not null default 0,
  buyable_offer_count integer not null default 0,
  min_buyable_price numeric(12, 2),
  max_buyable_price numeric(12, 2),
  best_offer_id uuid references public.store_products(id) on delete set null,
  best_offer_price numeric(12, 2),
  currency char(3) not null default 'EUR',
  stats_version bigint not null default 0,
  computed_at timestamptz not null default now(),
  primary key (tenant_id, product_id),
  constraint product_market_stats_active_offer_count_nonneg
    check (active_offer_count >= 0),
  constraint product_market_stats_buyable_offer_count_nonneg
    check (buyable_offer_count >= 0),
  constraint product_market_stats_buyable_lte_active
    check (buyable_offer_count <= active_offer_count)
);

create index if not exists idx_product_market_stats_tenant_min_buyable_price
  on public.product_market_stats (tenant_id, min_buyable_price asc nulls last);

create index if not exists idx_product_market_stats_tenant_active_products
  on public.product_market_stats (tenant_id, product_id)
  where active_offer_count > 0;

create or replace function public.trg_store_products_mark_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  pid uuid;
begin
  if tg_op = 'DELETE' then
    pid := old.product_id;
  else
    pid := new.product_id;
  end if;

  if pid is not null then
    insert into public.canonical_product_stats_dirty (product_id, bumped_at)
    values (pid, now())
    on conflict (product_id) do update set
      bumped_at = greatest(
        public.canonical_product_stats_dirty.bumped_at,
        excluded.bumped_at
      );
  end if;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_store_products_mark_dirty on public.store_products;

create trigger trg_store_products_mark_dirty
after insert or update or delete on public.store_products
for each row
execute function public.trg_store_products_mark_dirty();

create index if not exists idx_store_products_pdp_active_in_stock
  on public.store_products (tenant_id, product_id, price_amount asc, stock_quantity desc, updated_at desc, id asc)
  where state = 'active' and stock_quantity > 0;

create index if not exists idx_store_products_pdp_active_oos
  on public.store_products (tenant_id, product_id, price_amount asc, stock_quantity desc, updated_at desc, id asc)
  where state = 'active' and stock_quantity = 0;

create or replace function public.recompute_product_market_stats(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  t record;
  v_active integer;
  v_buyable integer;
  v_min_price numeric(12, 2);
  v_max_price numeric(12, 2);
  v_best_offer_id uuid;
  v_best_price numeric(12, 2);
  v_currency char(3);
  v_prev_version bigint;
  v_next_version bigint;
begin
  if p_product_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.products p
    where p.id = p_product_id
  ) then
    delete from public.product_market_stats
    where product_id = p_product_id;
    return;
  end if;

  for t in
    select distinct sp.tenant_id
    from public.store_products sp
    where sp.product_id = p_product_id
  loop
    v_active := 0;
    v_buyable := 0;
    v_min_price := null;
    v_max_price := null;
    v_best_offer_id := null;
    v_best_price := null;
    v_currency := 'EUR';
    v_prev_version := null;
    v_next_version := 1;

    select count(*)::integer
    into v_active
    from public.store_products sp
    where sp.product_id = p_product_id
      and sp.tenant_id = t.tenant_id
      and sp.state = 'active';

    select count(*)::integer
    into v_buyable
    from public.store_products sp
    where sp.product_id = p_product_id
      and sp.tenant_id = t.tenant_id
      and sp.state = 'active'
      and sp.stock_quantity > 0;

    select
      min(sp.price_amount),
      max(sp.price_amount)
    into v_min_price, v_max_price
    from public.store_products sp
    where sp.product_id = p_product_id
      and sp.tenant_id = t.tenant_id
      and sp.state = 'active'
      and sp.stock_quantity > 0;

    select sp.id, sp.price_amount, sp.currency
    into v_best_offer_id, v_best_price, v_currency
    from public.store_products sp
    where sp.product_id = p_product_id
      and sp.tenant_id = t.tenant_id
      and sp.state = 'active'
      and sp.stock_quantity > 0
    order by sp.price_amount asc,
             sp.stock_quantity desc,
             sp.updated_at desc nulls last,
             sp.id asc
    limit 1;

    if v_currency is null then
      v_currency := 'EUR';
    end if;

    select pms.stats_version
    into v_prev_version
    from public.product_market_stats pms
    where pms.tenant_id = t.tenant_id
      and pms.product_id = p_product_id;

    v_next_version := coalesce(v_prev_version, 0) + 1;

    insert into public.product_market_stats (
      tenant_id,
      product_id,
      active_offer_count,
      buyable_offer_count,
      min_buyable_price,
      max_buyable_price,
      best_offer_id,
      best_offer_price,
      currency,
      stats_version,
      computed_at
    )
    values (
      t.tenant_id,
      p_product_id,
      coalesce(v_active, 0),
      coalesce(v_buyable, 0),
      v_min_price,
      v_max_price,
      v_best_offer_id,
      v_best_price,
      v_currency,
      v_next_version,
      now()
    )
    on conflict (tenant_id, product_id)
    do update set
      active_offer_count = excluded.active_offer_count,
      buyable_offer_count = excluded.buyable_offer_count,
      min_buyable_price = excluded.min_buyable_price,
      max_buyable_price = excluded.max_buyable_price,
      best_offer_id = excluded.best_offer_id,
      best_offer_price = excluded.best_offer_price,
      currency = excluded.currency,
      stats_version = excluded.stats_version,
      computed_at = excluded.computed_at;
  end loop;

  delete from public.product_market_stats pms
  where pms.product_id = p_product_id
    and not exists (
      select 1
      from public.store_products sp
      where sp.product_id = p_product_id
        and sp.tenant_id = pms.tenant_id
        and sp.state = 'active'
    );
end;
$function$;

grant execute on function public.recompute_product_market_stats(uuid) to authenticated, service_role;

create or replace function public.canonical_product_stats_process_batch(p_batch_size integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_batch_size integer;
  v_picked integer := 0;
  v_upserted integer := 0;
  v_deleted_dirty integer := 0;
  v_start timestamptz := clock_timestamp();
  r record;
begin
  v_batch_size := greatest(1, least(coalesce(p_batch_size, 500), 5000));

  for r in
    select d.product_id
    from public.canonical_product_stats_dirty d
    order by d.bumped_at asc
    limit v_batch_size
  loop
    v_picked := v_picked + 1;
    perform public.recompute_product_market_stats(r.product_id);
    v_upserted := v_upserted + 1;

    delete from public.canonical_product_stats_dirty d
    where d.product_id = r.product_id;
    v_deleted_dirty := v_deleted_dirty + 1;
  end loop;

  return jsonb_build_object(
    'picked', v_picked,
    'upserted_stats', v_upserted,
    'deleted_dirty', v_deleted_dirty,
    'remaining_dirty_rows', (select count(*)::bigint from public.canonical_product_stats_dirty),
    'duration_ms', (extract(epoch from (clock_timestamp() - v_start)) * 1000)::integer
  );
end;
$function$;

grant execute on function public.canonical_product_stats_process_batch(integer) to authenticated, service_role;

alter table public.product_market_stats enable row level security;

drop policy if exists product_market_stats_select_public on public.product_market_stats;

create policy product_market_stats_select_public
on public.product_market_stats
for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.product_market_stats from anon, authenticated;
grant select on public.product_market_stats to anon, authenticated;

insert into public.canonical_product_stats_dirty (product_id, bumped_at)
select distinct sp.product_id, now()
from public.store_products sp
on conflict (product_id)
do update set bumped_at = greatest(
  public.canonical_product_stats_dirty.bumped_at,
  excluded.bumped_at
);
