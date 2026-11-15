-- ═══════════════════════════════════════════════════════════════
--  TKDflow · READ-ONLY preflight for the deployed project
--  Run in the Supabase SQL editor BEFORE supabase-setup.sql and keep the
--  output with the release record. Nothing here modifies data.
--  Any row in sections 1–3 that is not expected is a RELEASE BLOCKER.
-- ═══════════════════════════════════════════════════════════════

-- 1. Every policy on the member tables (expected after hardening:
--    profiles_select_own, profiles_insert_own, profiles_update_own,
--    schools_select_all, schools_insert_member)
select tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename in ('profiles', 'schools')
 order by tablename, policyname;

-- 2. Table and column privileges for client roles
--    Expected: profiles → authenticated SELECT/INSERT/UPDATE only, nothing for anon;
--              schools  → SELECT(name) for anon+authenticated, INSERT(name) for authenticated.
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name in ('profiles', 'schools')
   and grantee in ('anon', 'authenticated', 'public')
 order by 1, 2, 3;
select table_name, column_name, grantee, privilege_type
  from information_schema.column_privileges
 where table_schema = 'public' and table_name in ('profiles', 'schools')
   and grantee in ('anon', 'authenticated', 'public')
 order by 1, 3, 4, 2;

-- 3. Views / functions that could expose profiles another way
select c.relname as view_name
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class c on c.oid = r.ev_class
 where d.refobjid = 'public.profiles'::regclass and c.relkind in ('v', 'm')
 group by 1;
select p.proname, p.prosecdef as security_definer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' order by 1;

-- 4. RLS status of every public table
select relname, relrowsecurity, relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' order by 1;

-- 5. Legacy rows that would violate the new validation (fix before VALIDATE)
select id, username from public.profiles where username !~ '^[a-z0-9_]{3,20}$';
select lower(username) as username, count(*) from public.profiles group by 1 having count(*) > 1;
select id from public.profiles where char_length(btrim(full_name)) not between 1 and 80;
select id, age from public.profiles where age is not null and age not between 5 and 99;
select id, belt_level from public.profiles where belt_level is null or belt_level <> all (array[
  'White Belt (10th Gup)', 'Yellow Belt (9th Gup)', 'Yellow Stripe (8th Gup)',
  'Green Belt (7th Gup)', 'Green Stripe (6th Gup)', 'Blue Belt (5th Gup)',
  'Blue Stripe (4th Gup)', 'Red Belt (3rd Gup)', 'Red Stripe (2nd Gup)',
  '1st Gup (Poom / Pre-Black)', '1st Dan Black Belt', '2nd Dan Black Belt',
  '3rd Dan Black Belt', '4th Dan Black Belt', '5th Dan Black Belt',
  '6th Dan Black Belt', '7th Dan Black Belt', '8th Dan Black Belt',
  '9th Dan Black Belt (Grand Master)']::text[]);
select id from public.profiles where school_name is not null and char_length(btrim(school_name)) not between 2 and 100;
select id from public.profiles where avatar_url is not null and avatar_url !~ '^https://';
select lower(btrim(name)) as school, count(*) from public.schools group by 1 having count(*) > 1;
select id, name from public.schools where char_length(btrim(name)) not between 2 and 100;

-- 6. Counts only (no personal data) for the release record
select (select count(*) from public.profiles) as profiles,
       (select count(*) from public.profiles where age is not null and age < 13) as profiles_under_13,
       (select count(*) from public.schools) as schools;
