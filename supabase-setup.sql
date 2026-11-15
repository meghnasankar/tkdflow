-- ═══════════════════════════════════════════════════════════════
--  TKDflow · Supabase database setup + hardening migration
--  Works on a fresh project AND on a project created with the
--  original (pre-2026-11-15) script. Safe to re-run.
--
--  BEFORE running on an existing project:
--    1. Run supabase/preflight.sql (read-only) and review the output.
--    2. Run this script against STAGING first, then
--       `npm run test:db` locally (tests/db.test.mjs exercises the same
--       policies in an embedded Postgres) and the staging checks in
--       SETUP.md ("Restoring member accounts").
--
--  What this enforces
--    • profiles are PRIVATE: a signed-in member can read/insert/update
--      only their own row; anonymous visitors cannot read profiles.
--    • username availability is answered by username_available(), which
--      returns only true/false.
--    • schools: anyone can read names; signed-in members can ADD a school
--      (2–100 chars) but cannot rename or delete any school. Edits are
--      reserved for the project owner (dashboard / service role).
--    • the same validation the UI applies is enforced in the database:
--      lowercase username [a-z0-9_]{3,20} (case-insensitive unique),
--      name 1–80 chars (required), belt required from the fixed list,
--      age 5–99 (optional),
--      school ≤ 100 chars, https-only avatar URL, server-set timestamps.
--  New constraints are added NOT VALID so legacy rows do not block the
--  migration; preflight.sql lists rows that should be corrected before
--  running the VALIDATE statements at the end of this file.
--
--  The whole script runs in ONE transaction. It stops (and changes
--  nothing) if it finds a policy on profiles/schools that it does not
--  recognise — an unknown permissive policy would otherwise silently
--  survive the hardening, because Postgres ORs permissive policies.
--  Sample schools are NOT inserted here; see supabase/seed.example.sql.
-- ═══════════════════════════════════════════════════════════════

begin;

-- 0. Stop on unrecognised policies ─────────────────────────────
do $$
declare
  unknown text;
begin
  select string_agg(format('%I.%I: %I', schemaname, tablename, policyname), ', ')
    into unknown
    from pg_policies
   where schemaname = 'public'
     and tablename in ('profiles', 'schools')
     and policyname not in (
       -- policies created by this script
       'profiles_select_own', 'profiles_insert_own', 'profiles_update_own',
       'schools_select_all', 'schools_insert_member',
       -- legacy policies from the original setup script (replaced below)
       'profiles_select_all', 'schools_insert_auth', 'schools_update_auth'
     );
  if unknown is not null then
    raise exception 'TKDflow hardening stopped: unrecognised policies exist (%). Review them with supabase/preflight.sql, drop or rename them deliberately, then re-run.', unknown;
  end if;
end $$;

-- 1. Tables ────────────────────────────────────────────────────
create table if not exists public.schools (
  id         bigserial   primary key,
  name       text        unique not null,
  created_at timestamptz not null default now()
);
alter table public.schools
  add column if not exists created_by uuid references auth.users on delete set null default auth.uid();

create table if not exists public.profiles (
  id          uuid        references auth.users on delete cascade primary key,
  full_name   text        not null default '',
  username    text        unique not null,
  age         integer,
  belt_level  text,
  school_name text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. Validation constraints ────────────────────────────────────
do $$
begin
  -- legacy inline check (age 5..100) is replaced by profiles_age_range (5..99, optional)
  if exists (select 1 from pg_constraint where conname = 'profiles_age_check'
             and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles drop constraint profiles_age_check;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles add constraint profiles_username_format
      check (username ~ '^[a-z0-9_]{3,20}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_full_name_length') then
    alter table public.profiles add constraint profiles_full_name_length
      check (char_length(btrim(full_name)) between 1 and 80) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_age_range') then
    alter table public.profiles add constraint profiles_age_range
      check (age is null or age between 5 and 99) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_belt_level_valid') then
    -- REQUIRED, from the fixed list — the UI requires it too.
    -- Keep in sync with js/lib/belts.js (checked by npm test).
    alter table public.profiles add constraint profiles_belt_level_valid
      check (belt_level is not null and belt_level = any (array[
        'White Belt (10th Gup)', 'Yellow Belt (9th Gup)', 'Yellow Stripe (8th Gup)',
        'Green Belt (7th Gup)', 'Green Stripe (6th Gup)', 'Blue Belt (5th Gup)',
        'Blue Stripe (4th Gup)', 'Red Belt (3rd Gup)', 'Red Stripe (2nd Gup)',
        '1st Gup (Poom / Pre-Black)', '1st Dan Black Belt', '2nd Dan Black Belt',
        '3rd Dan Black Belt', '4th Dan Black Belt', '5th Dan Black Belt',
        '6th Dan Black Belt', '7th Dan Black Belt', '8th Dan Black Belt',
        '9th Dan Black Belt (Grand Master)'
      ]::text[])) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_school_name_length') then
    alter table public.profiles add constraint profiles_school_name_length
      check (school_name is null or char_length(btrim(school_name)) between 2 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_url_https') then
    alter table public.profiles add constraint profiles_avatar_url_https
      check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'schools_name_length') then
    alter table public.schools add constraint schools_name_length
      check (char_length(btrim(name)) between 2 and 100) not valid;
  end if;
end $$;

-- Case-insensitive uniqueness. Fails loudly (with a clear message) if
-- legacy rows collide — resolve them using supabase/preflight.sql first.
do $$
begin
  if exists (select lower(username) from public.profiles group by 1 having count(*) > 1) then
    raise exception 'TKDflow migration stopped: usernames that differ only by case exist. Run supabase/preflight.sql and resolve them first.';
  end if;
  if exists (select lower(btrim(name)) from public.schools group by 1 having count(*) > 1) then
    raise exception 'TKDflow migration stopped: school names that differ only by case/spacing exist. Run supabase/preflight.sql and resolve them first.';
  end if;
end $$;
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));
create unique index if not exists schools_name_lower_key on public.schools (lower(btrim(name)));

-- 3. Server-controlled timestamps ──────────────────────────────
create or replace function public.profiles_set_timestamps()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;          -- legacy trigger
drop trigger if exists profiles_set_timestamps on public.profiles;
create trigger profiles_set_timestamps
  before insert or update on public.profiles
  for each row execute function public.profiles_set_timestamps();
drop function if exists public.handle_updated_at();                -- legacy function

create or replace function public.schools_set_defaults()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.name := btrim(new.name);
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists schools_set_defaults on public.schools;
create trigger schools_set_defaults
  before insert on public.schools
  for each row execute function public.schools_set_defaults();

-- 4. Row Level Security ────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.schools  enable row level security;

-- remove every legacy policy name
drop policy if exists "profiles_select_all"  on public.profiles;
drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "schools_select_all"   on public.schools;
drop policy if exists "schools_insert_auth"  on public.schools;
drop policy if exists "schools_insert_member" on public.schools;
drop policy if exists "schools_update_auth"  on public.schools;

-- profiles: owner-only
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- No DELETE policy: account deletion is an owner-run process (SETUP.md).

-- schools: public names, member additions only
create policy "schools_select_all" on public.schools
  for select to anon, authenticated using (true);
create policy "schools_insert_member" on public.schools
  for insert to authenticated
  with check (created_by = (select auth.uid()));  -- name rules: schools_name_length + unique index

-- Table privileges (defence in depth on top of RLS)
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select, insert, update on public.profiles to authenticated;

-- schools: only the NAME column is readable; creator ids and timestamps stay
-- private. Clients must select explicit columns: .select('name').
revoke all on public.schools from anon, authenticated;
grant select (name) on public.schools to anon, authenticated;
grant insert (name) on public.schools to authenticated;
grant usage on sequence public.schools_id_seq to authenticated;

-- 5. Username availability (returns only a boolean) ────────────
create or replace function public.username_available(candidate text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select candidate ~ '^[a-z0-9_]{3,20}$'
     and not exists (
       select 1 from public.profiles p
       where lower(p.username) = lower(candidate)
         and p.id is distinct from auth.uid()
     );
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

commit;

-- 6. After cleaning legacy rows (see preflight.sql), validate: ──
--   alter table public.profiles validate constraint profiles_username_format;
--   alter table public.profiles validate constraint profiles_full_name_length;
--   alter table public.profiles validate constraint profiles_age_range;
--   alter table public.profiles validate constraint profiles_belt_level_valid;
--   alter table public.profiles validate constraint profiles_school_name_length;
--   alter table public.profiles validate constraint profiles_avatar_url_https;
--   alter table public.schools  validate constraint schools_name_length;
-- ═══════════════════════════════════════════════════════════════
