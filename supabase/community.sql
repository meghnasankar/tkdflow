-- Additive discussion service. Apply after supabase-setup.sql, on staging first.
-- No private profile field or author UUID is exposed in public post queries.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.account_eligibility(user_id uuid primary key,age_band text not null check(age_band in ('teen','adult')),created_at timestamptz not null default now());
create table if not exists private.community_moderators(user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on private.account_eligibility,private.community_moderators from public,anon,authenticated;
create table if not exists public.discussion_topics(
 id uuid primary key default gen_random_uuid(),category text not null check(category in ('technique-qa','forms-discussion','sparring','training','competitions','grading-testing','general')),
 title text not null check(char_length(btrim(title)) between 8 and 160),body text not null check(char_length(btrim(body)) between 20 and 8000),
 author_id uuid references auth.users(id) on delete set null,author_handle text not null,editorial boolean not null default false,
 status text not null default 'pending' check(status in ('pending','published','rejected')),created_at timestamptz not null default now());
create table if not exists public.discussion_replies(
 id uuid primary key default gen_random_uuid(),topic_id uuid not null references public.discussion_topics(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 10 and 4000),author_id uuid references auth.users(id) on delete set null,author_handle text not null,
 status text not null default 'pending' check(status in ('pending','published','rejected')),created_at timestamptz not null default now());
create table if not exists public.discussion_reports(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('topic','reply')),content_id uuid not null,reason text not null check(char_length(btrim(reason)) between 5 and 500),reporter_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),unique(kind,content_id,reporter_id));
create index if not exists discussion_topics_feed on public.discussion_topics(status,created_at desc);
create index if not exists discussion_replies_topic on public.discussion_replies(topic_id,status,created_at);
create or replace function public.is_community_moderator() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.community_moderators where user_id=auth.uid())$$;
create or replace function public.discussion_access() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('adult',exists(select 1 from private.account_eligibility where user_id=auth.uid() and age_band='adult'),'moderator',public.is_community_moderator())$$;
revoke all on function public.is_community_moderator(),public.discussion_access() from public,anon;
grant execute on function public.is_community_moderator(),public.discussion_access() to authenticated;
alter table public.discussion_topics enable row level security;
alter table public.discussion_replies enable row level security;
alter table public.discussion_reports enable row level security;
drop policy if exists topic_read on public.discussion_topics;
create policy topic_read on public.discussion_topics for select to anon,authenticated using(status='published' or author_id=auth.uid());
drop policy if exists reply_read on public.discussion_replies;
create policy reply_read on public.discussion_replies for select to anon,authenticated using((status='published' or author_id=auth.uid()) and exists(select 1 from public.discussion_topics t where t.id=topic_id and t.status='published'));
revoke all on public.discussion_topics,public.discussion_replies,public.discussion_reports from public,anon,authenticated;
grant select(id,category,title,body,author_handle,editorial,status,created_at) on public.discussion_topics to anon,authenticated;
grant select(id,topic_id,body,author_handle,status,created_at) on public.discussion_replies to anon,authenticated;
-- Writes only through narrow functions; author, public handle, status and timestamps are server controlled.
create or replace function public.submit_discussion(topic_title text,topic_body text,topic_category text) returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();handle text;result uuid;
begin
 if not exists(select 1 from private.account_eligibility where user_id=who and age_band='adult') then raise exception 'Adult enrollment required' using errcode='42501';end if;
 select username into handle from public.profiles where id=who;if handle is null then raise exception 'Complete your profile first' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(who::text));
 if exists(select 1 from public.discussion_topics where author_id=who and created_at>now()-interval '1 minute') or (select count(*) from public.discussion_topics where author_id=who and created_at>now()-interval '1 day')>=10 then raise exception 'Please wait before posting again' using errcode='P0001';end if;
 insert into public.discussion_topics(title,body,category,author_id,author_handle) values(btrim(topic_title),btrim(topic_body),topic_category,who,handle) returning id into result;return result;
end$$;
create or replace function public.reply_discussion(parent_topic uuid,reply_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();handle text;result uuid;
begin
 if not exists(select 1 from private.account_eligibility where user_id=who and age_band='adult') then raise exception 'Adult enrollment required' using errcode='42501';end if;
 if not exists(select 1 from public.discussion_topics where id=parent_topic and status='published') then raise exception 'Topic unavailable' using errcode='42501';end if;
 select username into handle from public.profiles where id=who;if handle is null then raise exception 'Complete your profile first' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(who::text));
 if exists(select 1 from public.discussion_replies where author_id=who and created_at>now()-interval '30 seconds') or (select count(*) from public.discussion_replies where author_id=who and created_at>now()-interval '1 day')>=30 then raise exception 'Please wait before replying again' using errcode='P0001';end if;
 insert into public.discussion_replies(topic_id,body,author_id,author_handle) values(parent_topic,btrim(reply_body),who,handle) returning id into result;return result;
end$$;
create or replace function public.report_discussion(content_kind text,target_id uuid,report_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501';end if;
 if not ((content_kind='topic' and exists(select 1 from public.discussion_topics where id=target_id and status='published')) or (content_kind='reply' and exists(select 1 from public.discussion_replies r join public.discussion_topics t on t.id=r.topic_id where r.id=target_id and r.status='published' and t.status='published'))) then raise exception 'Content unavailable' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.discussion_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily report limit reached';end if;
 insert into public.discussion_reports(kind,content_id,reason,reporter_id) values(content_kind,target_id,btrim(report_reason),auth.uid()) on conflict(kind,content_id,reporter_id) do nothing;
end$$;
create or replace function public.discussion_queue() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not public.is_community_moderator() then raise exception 'Moderator only' using errcode='42501';end if;
 return jsonb_build_object('topics',(select coalesce(jsonb_agg(to_jsonb(t)-'author_id'),'[]') from (select * from public.discussion_topics where status='pending' order by created_at limit 100)t),'replies',(select coalesce(jsonb_agg(to_jsonb(r)-'author_id'),'[]') from (select * from public.discussion_replies where status='pending' order by created_at limit 100)r),'reports',(select coalesce(jsonb_agg(to_jsonb(r)-'reporter_id'),'[]') from (select * from public.discussion_reports order by created_at desc limit 100)r));
end$$;
create or replace function public.moderate_discussion(content_kind text,target_id uuid,decision text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_community_moderator() then raise exception 'Moderator only' using errcode='42501';end if;
 if decision not in ('published','rejected') then raise exception 'Invalid decision';end if;
 if content_kind='topic' then update public.discussion_topics set status=decision where id=target_id;
 elsif content_kind='reply' then update public.discussion_replies set status=decision where id=target_id and (decision='rejected' or exists(select 1 from public.discussion_topics t where t.id=topic_id and t.status='published'));
 else raise exception 'Invalid content kind';end if;
end$$;
revoke all on function public.submit_discussion(text,text,text),public.reply_discussion(uuid,text),public.report_discussion(text,uuid,text),public.discussion_queue(),public.moderate_discussion(text,uuid,text) from public,anon;
grant execute on function public.submit_discussion(text,text,text),public.reply_discussion(uuid,text),public.report_discussion(text,uuid,text),public.discussion_queue(),public.moderate_discussion(text,uuid,text) to authenticated;
commit;
