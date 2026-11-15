-- ═══════════════════════════════════════════════════════════════
--  TKDflow · Supabase Database Setup
--  Paste this entire file into: Supabase → SQL Editor → Run
--  Safe to re-run: every statement is idempotent.
-- ═══════════════════════════════════════════════════════════════

-- 1. Schools table ─────────────────────────────────────────────
create table if not exists public.schools (
  id         bigserial   primary key,
  name       text        unique not null,
  created_at timestamptz default now()
);

-- 2. Profiles table ────────────────────────────────────────────
--    Extends auth.users. One row per user.
create table if not exists public.profiles (
  id          uuid        references auth.users on delete cascade primary key,
  full_name   text        not null default '',
  username    text        unique not null,
  age         integer     check (age >= 5 and age <= 100),
  belt_level  text,
  school_name text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. Row Level Security ────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.schools   enable row level security;

-- profiles: anyone can read; only owner can write
drop policy if exists "profiles_select_all"  on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select using (true);

drop policy if exists "profiles_insert_own"  on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- schools: anyone can read; authenticated users can add
drop policy if exists "schools_select_all"   on public.schools;
create policy "schools_select_all"
  on public.schools for select using (true);

drop policy if exists "schools_insert_auth"  on public.schools;
create policy "schools_insert_auth"
  on public.schools for insert with check (auth.role() = 'authenticated');

-- schools: required by upsert({onConflict:'name'}) — an upsert on an
-- existing school name performs an UPDATE, which RLS blocks without this.
drop policy if exists "schools_update_auth"  on public.schools;
create policy "schools_update_auth"
  on public.schools for update using (auth.role() = 'authenticated');

-- 4. Auto-update updated_at ────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 5. Seed example schools (optional — delete rows you don't need)
insert into public.schools (name) values
  ('Tiger Taekwondo Academy'),
  ('Kukkiwon Training Center'),
  ('United Taekwondo Institute'),
  ('Champion TKD School'),
  ('Dragon Taekwondo Club')
on conflict (name) do nothing;

-- ═══════════════════════════════════════════════════════════════
--  DONE. Next steps are in SETUP.md — in particular you MUST turn
--  off "Confirm email", or registration cannot create a profile.
-- ═══════════════════════════════════════════════════════════════
