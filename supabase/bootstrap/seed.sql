-- Optional demo catalog rows (no auth.users required).
-- Vendor + store_products rows require real UUIDs from Supabase Auth → Users.

insert into public.categories (id, name, slug, state)
values (
  '11111111-1111-4111-8111-111111111101',
  'Demo category',
  'demo-category',
  'active'
)
on conflict (id) do nothing;

insert into public.products (id, category_id, title, brand, model, slug, state)
values (
  '22222222-2222-4222-8222-222222222201',
  '11111111-1111-4111-8111-111111111101',
  'Demo product',
  'DemoBrand',
  'X-1',
  'demo-product-x1',
  'active'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- After you create a test user in Authentication:
--   1) Copy the user's UUID as :user_id
--   2) Run (replace :user_id) so resolveActor + dashboard work:
--
-- insert into public.profiles (id, role, display_name)
-- values (:'user_id', 'user', 'Demo buyer')
-- on conflict (id) do update set display_name = excluded.display_name;
--
-- insert into public.vendors (id, owner_user_id, name, slug, state)
-- values (
--   '33333333-3333-4333-8333-333333333301',
--   :'user_id',
--   'Demo vendor',
--   'demo-vendor',
--   'active'
-- );
--
-- insert into public.store_products (
--   id, vendor_id, product_id, condition, listing_variant_key,
--   price_amount, currency, stock_quantity, state, created_by, updated_by
-- ) values (
--   '44444444-4444-4444-8444-444444444401',
--   '33333333-3333-4333-8333-333333333301',
--   '22222222-2222-4222-8222-222222222201',
--   'new',
--   '',
--   99.99,
--   'EUR',
--   10,
--   'active',
--   :'user_id',
--   :'user_id'
-- );
-- ---------------------------------------------------------------------------
