-- Fix: trg_store_products_mark_dirty must read OLD.product_id on DELETE.
-- On DELETE, NEW is unset; referencing NEW.product_id produced NULL inserts into
-- canonical_product_stats_dirty and violated product_id NOT NULL.

create or replace function public.trg_store_products_mark_dirty()
returns trigger
language plpgsql
as $$
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
    on conflict (product_id)
    do update
      set bumped_at = excluded.bumped_at;
  end if;

  return coalesce(new, old);
end;
$$;
