-- ============================================================
--  NEXORA MONITOR — Full Migration (run once in SQL Editor)
-- ============================================================

-- 0. Drop old tables
drop table if exists user_settings    cascade;
drop table if exists profiles          cascade;
drop table if exists notification_log    cascade;
drop table if exists notification_channels cascade;
drop table if exists alert_rules         cascade;
drop table if exists alerts              cascade;
drop table if exists ssl_certs           cascade;
drop table if exists incidents           cascade;
drop table if exists checks              cascade;
drop table if exists "CHECKS"            cascade;
drop table if exists websites            cascade;

-- 1. websites
create table websites (
  id                 bigserial primary key,
  name               text        not null,
  url                text        not null unique,
  region             text        not null default 'India - Mumbai',
  check_interval_sec integer     not null default 60,
  status             text        not null default 'pending',
  uptime_pct         numeric(6,3) not null default 0,
  last_response_ms   integer,
  last_checked_at    timestamptz,
  ssl_expiry_at      timestamptz,
  is_active          boolean     not null default true,
  created_at         timestamptz not null default now()
);
create index websites_status_idx    on websites (status);
create index websites_is_active_idx on websites (is_active);

-- 2. checks
create table checks (
  id             bigserial primary key,
  website_id     bigint      not null references websites(id) on delete cascade,
  url            text        not null,
  status_code    integer,
  latency_ms     integer,
  is_up          boolean     not null default false,
  error          text,
  region         text        not null default 'India - Mumbai',
  checked_at     timestamptz not null default now()
);
create index checks_website_id_idx on checks (website_id, checked_at desc);
create index checks_checked_at_idx on checks (checked_at desc);
create index checks_url_idx        on checks (url, checked_at desc);

-- 3. incidents
create table incidents (
  id           bigserial primary key,
  website_id   bigint      not null references websites(id) on delete cascade,
  url          text        not null,
  type         text        not null default 'down',
  started_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  status       text        not null default 'open',
  details      text
);
create index incidents_website_id_idx on incidents (website_id);
create index incidents_status_idx     on incidents (status);

-- 4. ssl_certs
create table ssl_certs (
  id              bigserial primary key,
  website_id      bigint      not null references websites(id) on delete cascade unique,
  url             text        not null,
  issuer          text,
  valid_from      timestamptz,
  expires_at      timestamptz,
  days_remaining  integer,
  last_checked_at timestamptz not null default now()
);
create index ssl_certs_website_id_idx on ssl_certs (website_id);

-- 5. profiles (linked to auth.users)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text        not null default '',
  email       text        not null,
  phone       text        not null default '',
  avatar_url  text        not null default '',
  created_at  timestamptz not null default now()
);

-- 6. user_settings (one row per user)
create table user_settings (
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

-- 7. Auto-create profile + settings when a new auth user signs up
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. RLS
alter table websites  enable row level security;
alter table checks    enable row level security;
alter table incidents enable row level security;
alter table ssl_certs enable row level security;
alter table profiles     enable row level security;
alter table user_settings enable row level security;

create policy "anon read websites"    on websites  for select using (true);
create policy "anon read checks"      on checks    for select using (true);
create policy "anon read incidents"   on incidents for select using (true);
create policy "anon read ssl_certs"   on ssl_certs for select using (true);
create policy "anon insert websites"  on websites  for insert with check (true);
create policy "anon update websites"  on websites  for update using (true);
create policy "anon delete websites"  on websites  for delete using (true);
create policy "anon insert checks"    on checks    for insert with check (true);
create policy "anon update checks"    on checks    for update using (true);
create policy "anon insert incidents" on incidents for insert with check (true);
create policy "anon update incidents" on incidents for update using (true);
create policy "anon insert ssl_certs" on ssl_certs for insert with check (true);
create policy "anon update ssl_certs" on ssl_certs for update using (true) with check (true);

-- Profile & settings: users manage their own rows
create policy "profiles select own"  on profiles     for select using (auth.uid() = id);
create policy "profiles update own"  on profiles     for update using (auth.uid() = id);
create policy "settings select own"  on user_settings for select using (auth.uid() = user_id);
create policy "settings update own"  on user_settings for update using (auth.uid() = user_id);

-- 9. Realtime
alter publication supabase_realtime add table websites;
alter publication supabase_realtime add table checks;
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table ssl_certs;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table user_settings;
