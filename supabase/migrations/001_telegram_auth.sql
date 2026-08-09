create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text unique not null,
  telegram_username text unique not null,
  first_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- `create table if not exists` does not add new columns to an existing table.
-- Keep this migration safe for databases created before telegram usernames
-- were introduced. Existing rows may be backfilled before making it NOT NULL.
alter table public.users
  add column if not exists telegram_username text;

alter table public.users
  add column if not exists telegram_user_id text,
  add column if not exists first_name text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Some earlier versions used a required `username` column. The application
-- now stores the Telegram name in `telegram_username` instead.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'username'
  ) then
    alter table public.users alter column username drop not null;
  end if;
end
$$;

create table if not exists public.telegram_verifications (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  code text not null,
  telegram_user_id text,
  verified boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  verified_at timestamptz
);

create index if not exists telegram_verifications_username_idx
  on public.telegram_verifications (username);

create index if not exists telegram_verifications_created_at_idx
  on public.telegram_verifications (created_at desc);

create index if not exists telegram_verifications_verified_expires_idx
  on public.telegram_verifications (verified, expires_at);

create unique index if not exists users_telegram_username_unique_idx
  on public.users (telegram_username);

create unique index if not exists users_telegram_user_id_unique_idx
  on public.users (telegram_user_id);
