create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint tenants_slug_unique unique (slug)
);

create index if not exists idx_tenants_slug on public.tenants (slug);

insert into public.tenants (id, name, slug)
values ('11111111-1111-4111-8111-111111111111', 'Default Marketplace', 'default-marketplace')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'platform_admin')),
  display_name text,
  tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create index if not exists idx_profiles_tenant_id on public.profiles (tenant_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  image_url text,
  sort_order integer not null default 1,
  level integer not null default 0,
  state text not null default 'active',
  path text not null default '',
  is_leaf boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  emoji text
);

alter table public.categories add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;
alter table public.categories add column if not exists parent_id uuid references public.categories(id) on delete cascade;
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists sort_order integer;
alter table public.categories add column if not exists level integer;
alter table public.categories add column if not exists path text;
alter table public.categories add column if not exists is_leaf boolean;
alter table public.categories add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.categories add column if not exists emoji text;

alter table public.categories alter column sort_order set default 1;
alter table public.categories alter column level set default 0;
alter table public.categories alter column path set default '';
alter table public.categories alter column is_leaf set default true;

update public.categories set sort_order = coalesce(sort_order, 1) where sort_order is null;
update public.categories set level = coalesce(level, 0) where level is null;
update public.categories set path = coalesce(path, '') where path is null;
update public.categories set is_leaf = coalesce(is_leaf, true) where is_leaf is null;

update public.categories set state = 'archived' where state is not null and state not in ('active', 'archived', 'deleted');

alter table public.categories drop constraint if exists categories_state_check;
alter table public.categories add constraint categories_state_check check (state in ('active', 'archived', 'deleted'));

alter table public.categories drop constraint if exists categories_slug_unique;

drop index if exists uq_categories_tenant_slug;
create unique index uq_categories_tenant_slug on public.categories (tenant_id, slug);

update public.categories set tenant_id = '11111111-1111-4111-8111-111111111111' where tenant_id is null;

alter table public.categories alter column tenant_id set not null;

create index if not exists idx_categories_tenant_id on public.categories (tenant_id);
create index if not exists idx_categories_parent_id on public.categories (parent_id);
create index if not exists idx_categories_slug on public.categories (slug);
create index if not exists idx_categories_sort on public.categories (tenant_id, parent_id, sort_order);
create index if not exists idx_categories_tenant_parent on public.categories (tenant_id, parent_id);

drop trigger if exists trg_categories_set_updated_at on public.categories;
create trigger trg_categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create or replace function public.categories_cycle_guard()
returns trigger
language plpgsql
as $$
declare v uuid;
begin
  v := new.parent_id;
  while v is not null loop
    if v = new.id then
      raise exception 'categories: parent cycle';
    end if;
    select c.parent_id into v from public.categories c where c.id = v and c.tenant_id = new.tenant_id;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_categories_cycle on public.categories;
create trigger trg_categories_cycle
before insert or update of parent_id, tenant_id on public.categories
for each row
execute function public.categories_cycle_guard();

create or replace function public.categories_rebuild_paths_tenant(p_tenant uuid)
returns void
language plpgsql
as $$
declare r record;
begin
  for r in select id from public.categories where tenant_id = p_tenant order by level, id loop
    update public.categories c set
      level = case when c.parent_id is null then 0 else (select p.level + 1 from public.categories p where p.id = c.parent_id and p.tenant_id = c.tenant_id) end,
      path = case when c.parent_id is null then '/' || c.slug else (select p.path || '/' || c.slug from public.categories p where p.id = c.parent_id and p.tenant_id = c.tenant_id) end
    where c.id = r.id and c.tenant_id = p_tenant;
  end loop;
end;
$$;

create or replace function public.categories_after_paths()
returns trigger
language plpgsql
as $$
declare tid uuid;
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  tid := coalesce(new.tenant_id, old.tenant_id);
  if tid is not null then
    perform public.categories_rebuild_paths_tenant(tid);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_categories_paths_ai on public.categories;
drop trigger if exists trg_categories_paths_au on public.categories;
drop trigger if exists trg_categories_paths_ad on public.categories;
create trigger trg_categories_paths_ai after insert on public.categories for each row execute function public.categories_after_paths();
create trigger trg_categories_paths_au after update of slug, parent_id, tenant_id on public.categories for each row execute function public.categories_after_paths();
create trigger trg_categories_paths_ad after delete on public.categories for each row execute function public.categories_after_paths();

create or replace function public.categories_recompute_leaf()
returns trigger
language plpgsql
as $$
declare pid uuid;
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    pid := old.parent_id;
    if pid is not null then
      update public.categories c
      set is_leaf = not exists (select 1 from public.categories x where x.parent_id = c.id and x.tenant_id = c.tenant_id)
      where c.id = pid and c.tenant_id = old.tenant_id;
    end if;
    return old;
  end if;

  if new.parent_id is not null then
    update public.categories c set is_leaf = false where c.id = new.parent_id and c.tenant_id = new.tenant_id;
  end if;

  update public.categories c
  set is_leaf = not exists (select 1 from public.categories x where x.parent_id = c.id and x.tenant_id = c.tenant_id)
  where c.id = new.id and c.tenant_id = new.tenant_id;

  if tg_op = 'UPDATE' and old.parent_id is distinct from new.parent_id and old.parent_id is not null then
    update public.categories c
    set is_leaf = not exists (select 1 from public.categories x where x.parent_id = c.id and x.tenant_id = c.tenant_id)
    where c.id = old.parent_id and c.tenant_id = old.tenant_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_categories_leaf_ai on public.categories;
drop trigger if exists trg_categories_leaf_au on public.categories;
drop trigger if exists trg_categories_leaf_ad on public.categories;
create trigger trg_categories_leaf_ai after insert on public.categories for each row execute function public.categories_recompute_leaf();
create trigger trg_categories_leaf_au after update of parent_id on public.categories for each row execute function public.categories_recompute_leaf();
create trigger trg_categories_leaf_ad after delete on public.categories for each row execute function public.categories_recompute_leaf();

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;

drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants for select to authenticated using (
  id = (select p.tenant_id from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_denied on public.profiles;
drop policy if exists profiles_skeleton_deny_all on public.profiles;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());

create policy profiles_insert_own on public.profiles for insert to authenticated with check (
  auth.uid() = id and role = 'user' and tenant_id is null
);

create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_delete_denied on public.profiles for delete to authenticated using (false);

drop policy if exists categories_select_active_or_admin on public.categories;
drop policy if exists categories_insert_admin_only on public.categories;
drop policy if exists categories_update_admin_only on public.categories;
drop policy if exists categories_delete_denied on public.categories;
drop policy if exists categories_skeleton_deny_all on public.categories;
drop policy if exists categories_select_tenant on public.categories;
drop policy if exists categories_insert_tenant on public.categories;
drop policy if exists categories_update_tenant on public.categories;
drop policy if exists categories_delete_tenant on public.categories;
drop policy if exists categories_select_anon_active on public.categories;
drop policy if exists categories_select_strict on public.categories;
drop policy if exists categories_insert_strict on public.categories;
drop policy if exists categories_update_strict on public.categories;
drop policy if exists categories_delete_strict on public.categories;

create policy categories_select_strict on public.categories for select to authenticated using (
  tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

create policy categories_insert_strict on public.categories for insert to authenticated with check (
  tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

create policy categories_update_strict on public.categories for update to authenticated using (
  tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
) with check (
  tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

create policy categories_delete_strict on public.categories for delete to authenticated using (
  tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists category_images_insert on storage.objects;
drop policy if exists category_images_update on storage.objects;
drop policy if exists category_images_delete on storage.objects;
drop policy if exists category_images_select on storage.objects;
drop policy if exists category_images_insert_own_tenant on storage.objects;
drop policy if exists category_images_update_own_tenant on storage.objects;
drop policy if exists category_images_delete_own_tenant on storage.objects;
drop policy if exists category_images_select_public on storage.objects;

create policy category_images_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) = (select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

create policy category_images_update on storage.objects for update to authenticated using (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) = (select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
) with check (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) = (select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

create policy category_images_delete on storage.objects for delete to authenticated using (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) = (select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);

create policy category_images_select on storage.objects for select to authenticated using (
  bucket_id = 'category-images'
  and split_part(name, '/', 1) = (select p.tenant_id::text from public.profiles p where p.id = auth.uid() and p.tenant_id is not null)
);
