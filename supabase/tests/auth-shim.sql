-- Minimal stand-in for the parts of Supabase that supabase-setup.sql relies
-- on, so the policies can be exercised in an embedded Postgres (PGlite).
-- This is a TEST FIXTURE: it does not replace verification on a real
-- staging project (see SETUP.md → "Restoring member accounts").
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text);

-- Supabase derives these from the request JWT; tests set the claims with
-- set_config('request.jwt.claim.sub' / '.role', …, true).
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

-- Supabase's default: new public tables/sequences/functions are granted to
-- the client roles, and RLS is what restricts them.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
