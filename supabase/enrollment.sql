-- Install after community.sql. Configure as Auth Before User Created hook.
-- Initial enrollment is by email. Existing eligible accounts may connect Google.
begin;
create table if not exists private.enrollment_tickets(ticket_hash text primary key,age_band text not null check(age_band in ('teen','adult')),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '15 minutes');
revoke all on private.enrollment_tickets from public,anon,authenticated;
create or replace function public.issue_enrollment(ticket_hash text,age_band text) returns void language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(146059112);
 delete from private.enrollment_tickets where expires_at<now();
 if (select count(*) from private.enrollment_tickets where created_at>now()-interval '1 minute')>=100 then raise exception 'Enrollment rate limit';end if;
 insert into private.enrollment_tickets(ticket_hash,age_band) values(ticket_hash,age_band);
end$$;
revoke all on function public.issue_enrollment(text,text) from public,anon,authenticated;
grant execute on function public.issue_enrollment(text,text) to service_role;
create or replace function public.check_tkdflow_enrollment(event jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare band text;ticket text:=event->'user'->'user_metadata'->>'enrollment_ticket';who uuid:=(event->'user'->>'id')::uuid;
begin
 if event->'user'->'app_metadata'->>'provider' is distinct from 'email' then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Create your account with email first, then connect Google from your profile.'));end if;
 if nullif(event->'user'->'user_metadata'->'pending_profile'->>'age','')::integer < 13 then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Use the public learning resources without an account.'));end if;
 delete from private.enrollment_tickets where ticket_hash=encode(sha256(convert_to(ticket,'UTF8')),'hex') and expires_at>now() returning age_band into band;
 if band is null then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Complete the age screen again before creating an account.'));end if;
 if nullif(event->'user'->'user_metadata'->'pending_profile'->>'age','')::integer between 13 and 17 then band:='teen';end if;
 insert into private.account_eligibility(user_id,age_band) values(who,band);return '{}'::jsonb;
end$$;
revoke all on function public.check_tkdflow_enrollment(jsonb) from public,anon,authenticated;
-- Supabase auth-admin role is created by Supabase, not by this migration.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.check_tkdflow_enrollment(jsonb) to supabase_auth_admin;
commit;
