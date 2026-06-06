-- Customer cart (marketplace) — one row per authenticated user + vendor offer (store_products).
-- Scope: authenticated users only; RLS enforces auth.uid() = user_id.
--
-- Offer lifecycle note:
--   store_products rows are normally retired via state (paused/archived), not hard DELETE.
--   Application layers (Phase 2+) must validate offer.state = 'active' and stock on read/write.
--   offer_id uses ON DELETE CASCADE as defensive cleanup for exceptional hard deletes only
--   (app RLS denies DELETE on store_products for authenticated merchants).

create table if not exists public.user_cart_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid not null references public.store_products (id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 1 and quantity <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, offer_id)
);

comment on table public.user_cart_items is
  'Authenticated customer cart lines. Each row references a vendor offer (store_products.id), not a catalog product alone.';

comment on column public.user_cart_items.offer_id is
  'Vendor listing id (store_products.id). CASCADE on delete handles rare hard deletes; normal unavailability is state=archived/paused (row retained).';

comment on column public.user_cart_items.quantity is
  'Units of this offer in cart. Distinct line cap (e.g. 50) enforced in application layer.';

create index if not exists user_cart_items_user_id_created_at_idx
  on public.user_cart_items (user_id, created_at desc);

drop trigger if exists trg_user_cart_items_set_updated_at on public.user_cart_items;
create trigger trg_user_cart_items_set_updated_at
  before update on public.user_cart_items
  for each row
  execute function public.set_updated_at();

alter table public.user_cart_items enable row level security;

drop policy if exists user_cart_items_select_own on public.user_cart_items;
create policy user_cart_items_select_own
  on public.user_cart_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_cart_items_insert_own on public.user_cart_items;
create policy user_cart_items_insert_own
  on public.user_cart_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_cart_items_update_own on public.user_cart_items;
create policy user_cart_items_update_own
  on public.user_cart_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_cart_items_delete_own on public.user_cart_items;
create policy user_cart_items_delete_own
  on public.user_cart_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Rollback:
--   drop policy if exists user_cart_items_delete_own on public.user_cart_items;
--   drop policy if exists user_cart_items_update_own on public.user_cart_items;
--   drop policy if exists user_cart_items_insert_own on public.user_cart_items;
--   drop policy if exists user_cart_items_select_own on public.user_cart_items;
--   drop trigger if exists trg_user_cart_items_set_updated_at on public.user_cart_items;
--   drop table if exists public.user_cart_items;
