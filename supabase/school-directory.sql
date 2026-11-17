-- Apply after supabase-setup.sql and community.sql. Keeps all member associations private.
begin;
create table if not exists public.school_directory (
 id text primary key check(char_length(id) between 3 and 100),
 name text not null check(char_length(btrim(name)) between 2 and 100),
 country text check(country ~ '^[A-Z]{2}$'),
 region text not null default '' check(char_length(region)<=100),
 city text not null default '' check(char_length(city)<=100),
 website text not null default '' check(website='' or (char_length(website)<=500 and website ~ '^https?://[^[:space:]]+$')),
 source_url text not null check(char_length(source_url)<=500 and source_url ~ '^https?://[^[:space:]]+$'),
 source text not null check(char_length(source) between 1 and 100),
 license text not null default 'ODbL-1.0',
 imported_at timestamptz not null default now(), active boolean not null default true
);
create index if not exists school_directory_location on public.school_directory(country,region,city);
alter table public.school_directory enable row level security;
drop policy if exists school_directory_read on public.school_directory;
create policy school_directory_read on public.school_directory for select to anon,authenticated using(active);
revoke all on public.school_directory from public,anon,authenticated;
grant select on public.school_directory to anon,authenticated;

alter table public.profiles add column if not exists school_directory_id text references public.school_directory(id);
alter table public.profiles add column if not exists school_country text check(school_country ~ '^[A-Z]{2}$');
alter table public.profiles add column if not exists school_region text check(char_length(school_region)<=100);
alter table public.profiles add column if not exists school_city text check(char_length(school_city)<=100);
alter table public.profiles add column if not exists school_website text check(school_website is null or (char_length(school_website)<=500 and school_website ~ '^https?://[^[:space:]]+$'));

-- School reviewers see business suggestions only; this grants no forum/profile access.
create table if not exists private.school_reviewers(user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on private.school_reviewers from public,anon,authenticated;
create or replace function public.school_review_access() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.school_reviewers where user_id=auth.uid()) or public.is_community_moderator()
$$;
revoke all on function public.school_review_access() from public,anon;
grant execute on function public.school_review_access() to authenticated;

create table if not exists private.school_suggestions (
 id uuid primary key default gen_random_uuid(),
 submitted_by uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 2 and 100), country text check(country ~ '^[A-Z]{2}$'),
 region text not null default '' check(char_length(region)<=100), city text not null default '' check(char_length(city)<=100),
 website text not null default '' check(website='' or (char_length(website)<=500 and website ~ '^https?://[^[:space:]]+$')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 directory_id text references public.school_directory(id), created_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null
);
create unique index if not exists school_suggestion_per_member on private.school_suggestions(submitted_by,lower(btrim(name)),coalesce(country,''),lower(btrim(region)),lower(btrim(city)));
revoke all on private.school_suggestions from public,anon,authenticated;

create or replace function public.canonical_profile_school() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.school_directory;
begin
 if new.school_directory_id is not null and (tg_op='INSERT' or new.school_directory_id is distinct from old.school_directory_id) then
  select * into s from public.school_directory where id=new.school_directory_id and active;
  if not found then raise exception 'School unavailable. Choose another school or add its details.';end if;
  new.school_name:=s.name;new.school_country:=s.country;new.school_region:=nullif(s.region,'');new.school_city:=nullif(s.city,'');new.school_website:=nullif(s.website,'');
 elsif new.school_directory_id is not null then
  -- Keep the selected campus canonical even if a forged client changes its label.
  select * into s from public.school_directory where id=new.school_directory_id;
  new.school_name:=s.name;new.school_country:=s.country;new.school_region:=nullif(s.region,'');new.school_city:=nullif(s.city,'');new.school_website:=nullif(s.website,'');
 end if;
 if nullif(btrim(new.school_name),'') is null then
  new.school_name:=null;new.school_directory_id:=null;new.school_country:=null;new.school_region:=null;new.school_city:=null;new.school_website:=null;
 else
  new.school_name:=regexp_replace(btrim(new.school_name),'\s+',' ','g');
  new.school_region:=nullif(btrim(new.school_region),'');new.school_city:=nullif(btrim(new.school_city),'');new.school_website:=nullif(btrim(new.school_website),'');
 end if;
 return new;
end $$;
revoke all on function public.canonical_profile_school() from public,anon,authenticated;
drop trigger if exists canonical_profile_school on public.profiles;
create trigger canonical_profile_school before insert or update of school_directory_id,school_name,school_country,school_region,school_city,school_website on public.profiles for each row execute function public.canonical_profile_school();

create or replace function public.queue_profile_school() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.school_directory_id is not null or new.school_name is null then return new;end if;
 if exists(select 1 from private.school_suggestions where submitted_by=new.id and lower(btrim(name))=lower(btrim(new.school_name)) and coalesce(country,'')=coalesce(new.school_country,'') and lower(btrim(region))=lower(coalesce(new.school_region,'')) and lower(btrim(city))=lower(coalesce(new.school_city,''))) then return new;end if;
 if (select count(*) from private.school_suggestions where submitted_by=new.id and created_at>now()-interval '1 day')>=5 then raise exception 'Please wait a day before suggesting another school.';end if;
 insert into private.school_suggestions(submitted_by,name,country,region,city,website) values(new.id,new.school_name,new.school_country,coalesce(new.school_region,''),coalesce(new.school_city,''),coalesce(new.school_website,'')) on conflict do nothing;
 return new;
end $$;
revoke all on function public.queue_profile_school() from public,anon,authenticated;
drop trigger if exists queue_profile_school on public.profiles;
create trigger queue_profile_school after insert or update of school_directory_id,school_name,school_country,school_region,school_city,school_website on public.profiles for each row execute function public.queue_profile_school();
-- Preserve old custom values and make them discoverable for private review, without publishing them.
insert into private.school_suggestions(submitted_by,name,country,region,city,website)
 select id,school_name,school_country,coalesce(school_region,''),coalesce(school_city,''),coalesce(school_website,'') from public.profiles where school_name is not null and school_directory_id is null on conflict do nothing;

create or replace function public.school_submission_status() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('status',s.status,'name',s.name,'directory_id',s.directory_id) from private.school_suggestions s join public.profiles p on p.id=s.submitted_by where p.id=auth.uid() and lower(btrim(s.name))=lower(btrim(p.school_name)) and coalesce(s.country,'')=coalesce(p.school_country,'') and lower(btrim(s.region))=lower(coalesce(p.school_region,'')) and lower(btrim(s.city))=lower(coalesce(p.school_city,'')) order by s.created_at desc limit 1),'null'::jsonb)
$$;
create or replace function public.school_review_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.school_review_access() then raise exception 'Moderator only';end if;
 return coalesce((select jsonb_agg(to_jsonb(q)) from (select id,name,country,region,city,website,created_at from private.school_suggestions where status='pending' order by created_at limit 100)q),'[]'::jsonb);
end $$;
create or replace function public.review_school(suggestion_id uuid,decision text,details jsonb) returns text language plpgsql security definer set search_path='' as $$
declare s private.school_suggestions;target text;n text;c text;r text;ct text;w text;src text;
begin
 if not public.school_review_access() then raise exception 'Moderator only';end if;
 if decision not in ('approved','rejected') or decision is null then raise exception 'Invalid decision';end if;
 select * into s from private.school_suggestions where id=suggestion_id for update;
 if not found or s.status<>'pending' then raise exception 'Suggestion already reviewed or unavailable';end if;
 if decision='approved' then
  target:=nullif(details->>'existing_id','');
  if target is not null then
   if not exists(select 1 from public.school_directory where id=target and active) then raise exception 'Existing school unavailable';end if;
  else
   n:=regexp_replace(btrim(details->>'name'),'\s+',' ','g');c:=upper(btrim(details->>'country'));r:=btrim(coalesce(details->>'region',''));ct:=btrim(coalesce(details->>'city',''));w:=btrim(coalesce(details->>'website',''));src:=btrim(details->>'source_url');
   if n is null or char_length(n) not between 2 and 100 or c is null or c !~ '^[A-Z]{2}$' or ct='' or char_length(ct)>100 or char_length(r)>100 or src is null or src !~ '^https?://[^[:space:]]+$' or char_length(src)>500 or (w<>'' and (w !~ '^https?://[^[:space:]]+$' or char_length(w)>500)) then raise exception 'Check the school name, country, city and public reference link';end if;
   -- Serialize equivalent approvals, then reuse a matching campus instead of duplicating it.
   perform pg_advisory_xact_lock(hashtext(lower(n)||c||lower(r)||lower(ct)));
   select id into target from public.school_directory where active and lower(btrim(name))=lower(n) and country=c and lower(btrim(region))=lower(r) and lower(btrim(city))=lower(ct) order by id limit 1;
   if target is null then
    target:='tkd/'||gen_random_uuid()::text;
    insert into public.school_directory(id,name,country,region,city,website,source_url,source)values(target,n,c,r,ct,w,src,'TKDFlow reviewed submission');
   end if;
  end if;
 end if;
 update private.school_suggestions set status=decision,directory_id=target,reviewed_at=now(),reviewed_by=auth.uid() where id=s.id;
 -- Never overwrite a later change to the member's own selected school.
 if target is not null then
  update public.profiles set school_directory_id=target where id=s.submitted_by and school_directory_id is null and lower(btrim(school_name))=lower(btrim(s.name)) and coalesce(school_country,'')=coalesce(s.country,'') and lower(coalesce(school_region,''))=lower(s.region) and lower(coalesce(school_city,''))=lower(s.city);
 end if;
 return target;
end $$;
revoke all on function public.school_submission_status(),public.school_review_queue(),public.review_school(uuid,text,jsonb) from public,anon;
grant execute on function public.school_submission_status(),public.school_review_queue(),public.review_school(uuid,text,jsonb) to authenticated;
-- Retire legacy public insertion, including column-level grants from earlier versions.
revoke all on public.schools from public,anon,authenticated;
revoke insert(name) on public.schools from public,anon,authenticated;
grant select(name) on public.schools to anon,authenticated;
revoke all on sequence public.schools_id_seq from public,anon,authenticated;
drop policy if exists schools_insert_member on public.schools;
drop policy if exists schools_insert_auth on public.schools;
drop policy if exists schools_update_auth on public.schools;
commit;
