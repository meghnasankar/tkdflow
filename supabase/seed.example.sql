-- OPTIONAL sample data for a local or staging project only.
-- These are placeholder names, not real schools. Do not run in production.
insert into public.schools (name) values
  ('Example Taekwondo Club A'),
  ('Example Taekwondo Club B')
on conflict do nothing;
