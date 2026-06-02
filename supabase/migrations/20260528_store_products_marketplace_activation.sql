create or replace function public.compute_store_product_marketplace_state(
  state text,
  price_amount numeric,
  stock_quantity integer
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when state = 'archived' then 'archived'
    when state = 'draft' then 'draft'
    when price_amount is null
      or price_amount <= 0
      or stock_quantity is null
      or stock_quantity <= 0 then 'paused'
    else 'active'
  end;
$$;

create or replace function public.enforce_store_product_marketplace_activation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.state := public.compute_store_product_marketplace_state(
    new.state,
    new.price_amount,
    new.stock_quantity
  );
  return new;
end;
$$;

drop trigger if exists trg_store_products_enforce_marketplace_activation on public.store_products;

create trigger trg_store_products_enforce_marketplace_activation
before insert or update of state, price_amount, stock_quantity
on public.store_products
for each row
execute function public.enforce_store_product_marketplace_activation();

update public.store_products sp
set state = public.compute_store_product_marketplace_state(
  sp.state,
  sp.price_amount,
  sp.stock_quantity
)
where sp.state in ('active', 'paused')
  and sp.state is distinct from public.compute_store_product_marketplace_state(
    sp.state,
    sp.price_amount,
    sp.stock_quantity
  );
