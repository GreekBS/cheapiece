-- Idempotent marketplace taxonomy for public.categories (default SaaS tenant).
-- App mirror / source-of-truth for structure + slugs: taxonomy/marketplace-taxonomy.v1.json (keep in sync).
-- INSERT only; no DELETE/DROP. Safe to re-run (skips existing tenant_id + slug).
-- Run in Supabase SQL Editor as postgres / role that bypasses RLS (not anon JWT).

-- ROOTS (level 0)
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', null, v.name, v.slug, v.sort_order, 0, 'active', '/' || v.slug, false, null, v.emoji
from (values
  (1, 'Τεχνολογία', 'tech', '💻'),
  (2, 'Μόδα', 'fashion', '👗'),
  (3, 'Ομορφιά', 'beauty', '💄'),
  (4, 'Σπίτι', 'home', '🏠'),
  (5, 'Αθλητισμός - Ψυχαγωγία', 'sports-leisure', '🏃‍♂️'),
  (6, 'Παιδικά - Βρεφικά', 'kids-baby', '👶'),
  (7, 'Auto - Moto', 'automoto', '🚗'),
  (8, 'Κατοικίδια', 'pets', '🐾'),
  (9, 'Βιβλία', 'books', '📚'),
  (10, 'Οικιακές Συσκευές', 'household-appliances', '🏠')
) as v(sort_order, name, slug, emoji)
where not exists (
  select 1 from public.categories c
  where c.tenant_id = '11111111-1111-4111-8111-111111111111' and c.slug = v.slug
    and c.state is distinct from 'deleted'
);

-- Τεχνολογία → children
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Κινητή Τηλεφωνία', 'tech-kiniti-tilefonia', 1),
  ('Εικόνα', 'tech-eikona', 2),
  ('Ηλεκτρονικοί Υπολογιστές', 'tech-ilektronikoi-ypologistes', 3),
  ('Wearables', 'tech-wearables', 4),
  ('Gaming', 'tech-gaming', 5),
  ('Tablets & Αξεσουάρ', 'tech-tablets-axesouar', 6),
  ('Ήχος', 'tech-ichos', 7),
  ('Ηλεκτρονικά', 'tech-ilektronika', 8),
  ('Refurbished', 'tech-refurbished', 9),
  ('Φωτογραφία & Video', 'tech-photografia-video', 10),
  ('Drones & Τηλεκατευθυνόμενα', 'tech-drones-tilekateuthynomena', 11),
  ('Τηλεφωνία', 'tech-tilefonia', 12),
  ('Gadgets', 'tech-gadgets', 13)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'tech'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Μόδα
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Γυναικεία', 'fashion-gynaikeia', 1),
  ('Ανδρικά', 'fashion-andrika', 2),
  ('Παιδικά - Βρεφικά', 'fashion-paidika-vrefika', 3),
  ('Παπούτσια', 'fashion-papoutsia', 4),
  ('Αξεσουάρ', 'fashion-axesouar', 5),
  ('Outlet', 'fashion-outlet', 6)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'fashion'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Ομορφιά
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Περιποίηση & Μακιγιάζ', 'beauty-peripoihsh-makigiaz', 1),
  ('Συμπληρώματα Διατροφής & Βιταμίνες', 'beauty-sympliromata', 2),
  ('Φαρμακευτικά', 'beauty-farmakeutika', 3),
  ('Sex Shop', 'beauty-sex-shop', 4),
  ('Προσωπική Φροντίδα & Υγιεινή', 'beauty-prosopiki-frontida', 5),
  ('Οπτικά', 'beauty-optika', 6),
  ('Ιατρικά Βοηθήματα', 'beauty-iatrika-voithimata', 7),
  ('Προϊόντα Κάνναβης (CBD)', 'beauty-cbd', 8)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'beauty'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Σπίτι
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Συστήματα Ασφαλείας', 'home-asfaleia-systimata', 1),
  ('Έπιπλα', 'home-epipla', 2),
  ('Κουζίνα', 'home-kouzina', 3),
  ('Λευκά Είδη', 'home-lefka-eidi', 4),
  ('Φωτισμός', 'home-fotismos', 5),
  ('Διακόσμηση', 'home-diakosmisi', 6),
  ('Ηλεκτρολογικά & Αυτοματισμοί', 'home-ilektrologika-automatismoi', 7),
  ('Μπάνιο', 'home-mpanio', 8),
  ('Γραφείο', 'home-grafeio', 9),
  ('Τρόφιμα & Ροφήματα', 'home-trofima-rofimata', 10),
  ('Καθαρισμός', 'home-katharismos', 11),
  ('Εκκλησιαστικά', 'home-ekklisiastika', 12)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'home'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Αθλητισμός - Ψυχαγωγία
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Είδη Party & Δώρων', 'sports-party-dora', 1),
  ('Αθλητική Μόδα', 'sports-athlitiki-moda', 2),
  ('Ταξίδια', 'sports-taksidia', 3),
  ('Camping', 'sports-camping', 4),
  ('Γυμναστική', 'sports-gymnastiki', 5),
  ('Αθλήματα', 'sports-athlimata', 6),
  ('Κάπνισμα - Άτμισμα', 'sports-kapnisma-atmisma', 7),
  ('Ποδηλασία', 'sports-podilasia', 8),
  ('DIY', 'sports-diy', 9),
  ('Μουσική', 'sports-mousiki', 10),
  ('Παραλία & Πισίνα', 'sports-paralia-pisina', 11),
  ('Yoga - Pilates', 'sports-yoga-pilates', 12)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'sports-leisure'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Παιδικά - Βρεφικά
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Παιχνίδια', 'kids-paichnidia', 1),
  ('Μόδα', 'kids-moda', 2),
  ('Βόλτα Μωρού', 'kids-volta-mwrou', 3),
  ('Έπιπλα', 'kids-epipla', 4),
  ('Βιβλία', 'kids-vivlia', 5),
  ('Σχολικά', 'kids-scholika', 6),
  ('Φαγητό Μωρού', 'kids-fagito-mwrou', 7),
  ('Βαπτιστικά', 'kids-vaptistika', 8),
  ('Βρεφικό Δωμάτιο', 'kids-vrefiko-domatio', 9),
  ('Υγιεινή Μωρού', 'kids-ygieini-mwrou', 10),
  ('Διακόσμηση Δωματίου', 'kids-diakosmisi-domatiou', 11),
  ('Προίκα Μωρού', 'kids-proika-mwrou', 12),
  ('Λευκά Είδη', 'kids-lefka-eidi', 13)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'kids-baby'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Auto - Moto
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Αυτοκίνητο', 'auto-autokinito', 1),
  ('Μοτοσυκλέτα', 'auto-motosykleeta', 2),
  ('Σκάφος', 'auto-skafos', 3)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'automoto'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Κατοικίδια
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Σκύλοι', 'pets-skiloi', 1),
  ('Γάτες', 'pets-gates', 2),
  ('Ψάρια', 'pets-psaria', 3),
  ('Πτηνά', 'pets-ptina', 4),
  ('Τρωκτικά', 'pets-troktila', 5),
  ('Ερπετά', 'pets-erpetta', 6)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'pets'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Βιβλία
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Λογοτεχνία', 'books-logotechnia', 1),
  ('Παιδικά', 'books-paidika', 2),
  ('Manga', 'books-manga', 3),
  ('Hobby', 'books-hobby', 4),
  ('Επιστημονικά', 'books-epistimonika', 5),
  ('Σχολικά', 'books-scholika', 6),
  ('Ξενόγλωσσα', 'books-xenoglosa', 7),
  ('Self Improvement', 'books-self-improvement', 8),
  ('Comics', 'books-comics', 9),
  ('Τέχνη', 'books-tehni', 10),
  ('Θρησκεία', 'books-thriskeia', 11),
  ('Ιστορία', 'books-istoria', 12),
  ('Business', 'books-business', 13),
  ('Ψυχολογία', 'books-psychologia', 14),
  ('Βιογραφίες', 'books-viografies', 15),
  ('Πολιτικά', 'books-politika', 16),
  ('Γονείς', 'books-goneis', 17),
  ('Εκπαίδευση', 'books-ekpaidefsi', 18),
  ('Ποίηση', 'books-poiisi', 19),
  ('Φιλοσοφία', 'books-filosofia', 20),
  ('Κλασικά', 'books-klassika', 21),
  ('Εγκυμοσύνη', 'books-egkymosyni', 22),
  ('Γλώσσες', 'books-glosses', 23),
  ('Περιοδικά', 'books-periodika', 24)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'books'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');

-- Οικιακές Συσκευές
insert into public.categories (id, tenant_id, parent_id, name, slug, sort_order, level, state, path, is_leaf, created_by, emoji)
select gen_random_uuid(), '11111111-1111-4111-8111-111111111111', p.id, v.name, v.slug, v.sort_order, 1, 'active', p.path || '/' || v.slug, true, null, null
from public.categories p
cross join (values
  ('Θέρμανση & Κλιματισμός', 'appliances-thermansi-klimatismos', 1),
  ('Λευκές Συσκευές', 'appliances-lefkes-syskeves', 2),
  ('Καθαρισμός', 'appliances-katharismos', 3),
  ('Air Quality', 'appliances-air-quality', 4),
  ('Μαγείρεμα', 'appliances-mageirema', 5),
  ('Καφετιέρες', 'appliances-kafetieres', 6),
  ('Πρωινό & Snacks', 'appliances-proino-snacks', 7),
  ('Σιδέρωμα', 'appliances-sideroma', 8),
  ('Food Processing', 'appliances-food-processing', 9),
  ('Stock Appliances', 'appliances-stock', 10),
  ('Sets', 'appliances-sets', 11)
) as v(name, slug, sort_order)
where p.tenant_id = '11111111-1111-4111-8111-111111111111' and p.slug = 'household-appliances'
  and not exists (select 1 from public.categories c2 where c2.tenant_id = '11111111-1111-4111-8111-111111111111' and c2.slug = v.slug and c2.state is distinct from 'deleted');
