-- ============================================================
--  NEXORA MONITOR — Additive migration: profiles + user_settings
--  Safe to run on an existing database (does NOT drop tables).
--  Run this once in the Supabase SQL Editor.
-- ============================================================

-- 1. profiles table (linked to auth.users)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text        not null default '',
  email       text        not null,
  phone       text        not null default '',
  avatar_url  text        not null default '',
  created_at  timestamptz not null default now()
);

-- 2. user_settings table (one row per user)
create table if not exists user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  theme           text    not null default 'System',
  font_size       text    not null default 'medium',
  language        text    not null default 'English',
  email_notif     boolean not null default true,
  push_notif      boolean not null default false,
  marketing_notif boolean not null default false,
  public_profile  boolean not null default false,
  show_online     boolean not null default true,
  two_factor      boolean not null default false
);

-- 3. Trigger: auto-create profile + settings on auth user insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

-- Drop trigger if it already exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. RLS
alter table profiles     enable row level security;
alter table user_settings enable row level security;

-- Drop old policies if they exist, then create fresh
drop policy if exists "profiles select own" on profiles;
drop policy if exists "profiles update own" on profiles;
drop policy if exists "settings select own" on user_settings;
drop policy if exists "settings update own" on user_settings;

create policy "profiles select own"  on profiles     for select using (auth.uid() = id);
create policy "profiles update own"  on profiles     for update using (auth.uid() = id);
create policy "settings select own"  on user_settings for select using (auth.uid() = user_id);
create policy "settings update own"  on user_settings for update using (auth.uid() = user_id);

-- 5. Backfill profiles + settings for existing auth users who don't have rows yet
insert into profiles (id, name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

insert into user_settings (user_id)
select u.id
from auth.users u
where not exists (select 1 from user_settings s where s.user_id = u.id);

-- 6. Realtime (optional)
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table user_settings;
