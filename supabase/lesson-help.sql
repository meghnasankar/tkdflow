-- Lesson help questions, private moderator replies and a curated public FAQ.
-- Additive and rerunnable. Apply after supabase-setup.sql, community.sql and
-- enrollment.sql, on staging first. Tables have NO client grants: members,
-- moderators and visitors reach them only through the narrow functions below.
-- Private question text is never copied into the public FAQ by the server.
begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;

-- Canonical animation pose counts (pose indexes, NOT official movement counts).
-- tests/lesson-help-db.test.mjs recomputes these from the lesson data.
create or replace function private.lesson_pose_count(lesson text) returns integer
language sql immutable set search_path='' as $$
 select ('{"taegeuk-1":20,"taegeuk-2":25,"taegeuk-3":36,"taegeuk-4":31,"taegeuk-5":34,"taegeuk-6":33,"taegeuk-7":35,"taegeuk-8":40,"koryo":52,"keumgang":29,"taebaek":44,"pyongwon":33,"sipjin":47,"jitae":40,"chon-ji":21,"dan-gun":23,"do-san":26,"won-hyo":30,"yul-gok":40,"joong-gun":34,"songahm-1":20,"songahm-2":25,"songahm-3":30}'::jsonb->>lesson)::integer
$$;
revoke all on function private.lesson_pose_count(text) from public,anon,authenticated;

create table if not exists public.lesson_help_questions(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 lesson_id text not null,
 pose_index integer,
 pose_count integer,
 body text not null,
 status text not null default 'submitted',
 topic_key text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(author_id,request_id),
 constraint lesson_help_lesson check(private.lesson_pose_count(lesson_id) is not null),
 constraint lesson_help_body check(char_length(btrim(body)) between 10 and 1000),
 constraint lesson_help_status check(status in ('submitted','reviewed','resolved','closed')),
 constraint lesson_help_topic check(topic_key is null or topic_key ~ '^[a-z0-9][a-z0-9-]{1,39}$')
);
-- PostgreSQL accepts a CHECK that evaluates to NULL, so the populated branch
-- names both columns as non-null. Re-added on every run so reruns converge.
alter table public.lesson_help_questions drop constraint if exists lesson_help_pose;
alter table public.lesson_help_questions add constraint lesson_help_pose check((pose_index is null and pose_count is null)
 or (pose_index is not null and pose_count is not null and pose_count=private.lesson_pose_count(lesson_id) and pose_index>=0 and pose_index<pose_count));
create index if not exists lesson_help_questions_queue on public.lesson_help_questions(status,lesson_id,created_at);
create index if not exists lesson_help_questions_author on public.lesson_help_questions(author_id,created_at desc);

create table if not exists public.lesson_help_replies(
 id uuid primary key default gen_random_uuid(),
 question_id uuid not null references public.lesson_help_questions(id) on delete cascade,
 moderator_id uuid references auth.users(id) on delete set null,
 request_id uuid not null,
 body text not null check(char_length(btrim(body)) between 2 and 2000),
 created_at timestamptz not null default now(),
 unique(question_id,request_id)
);
create index if not exists lesson_help_replies_question on public.lesson_help_replies(question_id,created_at);

-- Moderator audit trail for questions (status, grouping and replies).
create table if not exists public.lesson_help_events(
 id bigint generated always as identity primary key,
 question_id uuid not null references public.lesson_help_questions(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('submitted','status','group','reply')),
 from_status text,to_status text,
 created_at timestamptz not null default now()
);

create table if not exists public.lesson_faq_entries(
 id uuid primary key default gen_random_uuid(),
 create_request_id uuid not null unique,
 last_request_id uuid not null,
 lesson_id text not null,
 pose_index integer,
 pose_count integer,
 question text not null,
 answer text not null,
 source_url text,
 source_label text,
 credit text not null,
 status text not null default 'draft',
 version integer not null default 1,
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz,
 constraint lesson_faq_lesson check(private.lesson_pose_count(lesson_id) is not null),
 constraint lesson_faq_question check(char_length(btrim(question)) between 10 and 300),
 constraint lesson_faq_answer check(char_length(btrim(answer)) between 20 and 4000),
 constraint lesson_faq_source check((source_url is null and source_label is null) or (source_url is not null and char_length(source_url)<=500 and source_url ~ '^https://[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:[0-9]{1,5})?(/[^[:space:]<>"''`\\]*)?$' and (source_label is null or char_length(btrim(source_label)) between 2 and 120))),
 constraint lesson_faq_credit check(char_length(credit) between 2 and 80),
 constraint lesson_faq_status check(status in ('draft','published','unpublished')),
 constraint lesson_faq_published check(status<>'published' or published_at is not null)
);
alter table public.lesson_faq_entries drop constraint if exists lesson_faq_pose;
alter table public.lesson_faq_entries add constraint lesson_faq_pose check((pose_index is null and pose_count is null)
 or (pose_index is not null and pose_count is not null and pose_count=private.lesson_pose_count(lesson_id) and pose_index>=0 and pose_index<pose_count));
create index if not exists lesson_faq_public on public.lesson_faq_entries(lesson_id,status,pose_index);

-- Every FAQ create/edit/publish/unpublish keeps a snapshot of the public fields.
create table if not exists public.lesson_faq_revisions(
 id bigint generated always as identity primary key,
 faq_id uuid not null references public.lesson_faq_entries(id) on delete cascade,
 version integer not null,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('created','edited','published','unpublished')),
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists lesson_faq_revisions_entry on public.lesson_faq_revisions(faq_id,id desc);

alter table public.lesson_help_questions enable row level security;
alter table public.lesson_help_replies enable row level security;
alter table public.lesson_help_events enable row level security;
alter table public.lesson_faq_entries enable row level security;
alter table public.lesson_faq_revisions enable row level security;
revoke all on public.lesson_help_questions,public.lesson_help_replies,public.lesson_help_events,public.lesson_faq_entries,public.lesson_faq_revisions from public,anon,authenticated;

-- Text checks shared by the functions: trimmed, bounded, no control characters
-- other than tab/newline. Text is always rendered as plain text by the client.
create or replace function private.help_text(value text,min_len integer,max_len integer,label text) returns text
language plpgsql immutable set search_path='' as $$
declare clean text:=btrim(coalesce(value,''));
begin
 if clean ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]' then raise exception '% contains unsupported characters',label using errcode='22023';end if;
 if char_length(clean)<min_len or char_length(clean)>max_len then raise exception 'Use % to % characters for the %',min_len,max_len,lower(label) using errcode='22023';end if;
 return clean;
end$$;
revoke all on function private.help_text(text,integer,integer,text) from public,anon,authenticated;

create or replace function private.help_pose(lesson text,pose integer) returns integer
language plpgsql immutable set search_path='' as $$
declare total integer:=private.lesson_pose_count(lesson);
begin
 if total is null then raise exception 'Unknown lesson' using errcode='22023';end if;
 if pose is not null and (pose<0 or pose>=total) then raise exception 'Invalid pose' using errcode='22023';end if;
 return case when pose is null then null else total end;
end$$;
revoke all on function private.help_pose(text,integer) from public,anon,authenticated;

-- Why a signed-in account can or cannot ask. Never raises.
create or replace function private.lesson_help_block(who uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare item record;
begin
 if who is null then return 'sign-in';end if;
 if not exists(select 1 from auth.users u where u.id=who and u.email_confirmed_at is not null) then return 'confirm-email';end if;
 select p.age,p.full_name,p.belt_level into item from public.profiles p where p.id=who;
 if not found or coalesce(btrim(item.full_name),'')='' or item.belt_level is null then return 'complete-profile';end if;
 if item.age is not null and item.age<13 then return 'under-13';end if;
 if not (coalesce(item.age,0)>=13 or exists(select 1 from private.account_eligibility e where e.user_id=who)) then return 'age-unconfirmed';end if;
 return null;
end$$;
revoke all on function private.lesson_help_block(uuid) from public,anon,authenticated;

create or replace function private.lesson_help_member(account_id uuid) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare who uuid:=auth.uid();blocked text;
begin
 if who is null or account_id is distinct from who then raise exception 'Your sign-in changed. Reload this page before sending.' using errcode='42501';end if;
 blocked:=private.lesson_help_block(who);
 if blocked='confirm-email' then raise exception 'Confirm your email first.' using errcode='42501';end if;
 if blocked='complete-profile' then raise exception 'Complete your profile first.' using errcode='42501';end if;
 if blocked is not null then raise exception 'Lesson questions are for confirmed members aged 13 and over.' using errcode='42501';end if;
 return who;
end$$;
revoke all on function private.lesson_help_member(uuid) from public,anon,authenticated;

-- Moderator calls name the account the page loaded with, so a request started
-- before a sign-in switch can never act as the newly signed-in account.
drop function if exists private.lesson_help_moderator();
create or replace function private.lesson_help_moderator(account_id uuid) returns uuid
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or account_id is distinct from auth.uid() then raise exception 'Your sign-in changed. Reload this page before continuing.' using errcode='42501';end if;
 if not exists(select 1 from private.community_moderators m where m.user_id=auth.uid()) then raise exception 'Moderator only' using errcode='42501';end if;
 return auth.uid();
end$$;
revoke all on function private.lesson_help_moderator(uuid) from public,anon,authenticated;

-- A stable pseudonym lets moderators notice repeat askers without seeing who they are.
create or replace function private.lesson_help_member_label(who uuid) returns text
language sql immutable set search_path='' as $$
 select 'Member '||upper(left(encode(sha256(convert_to('tkdflow-help:'||who::text,'UTF8')),'hex'),6))
$$;
revoke all on function private.lesson_help_member_label(uuid) from public,anon,authenticated;

create or replace function private.lesson_help_replies_json(question uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'body',r.body,'created_at',r.created_at) order by r.created_at,r.id),'[]'::jsonb)
 from public.lesson_help_replies r where r.question_id=question
$$;
revoke all on function private.lesson_help_replies_json(uuid) from public,anon,authenticated;

create or replace function private.lesson_help_question_json(q public.lesson_help_questions) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',q.id,'lesson_id',q.lesson_id,'pose_index',q.pose_index,'pose_count',q.pose_count,'body',q.body,
  'status',q.status,'created_at',q.created_at,'updated_at',q.updated_at,'replies',private.lesson_help_replies_json(q.id))
$$;
revoke all on function private.lesson_help_question_json(public.lesson_help_questions) from public,anon,authenticated;

/* ── member functions ── */
create or replace function public.lesson_help_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare blocked text:=private.lesson_help_block(auth.uid());
begin
 return jsonb_build_object('version',1,'member',blocked is null,'reason',blocked,
  'moderator',auth.uid() is not null and exists(select 1 from private.community_moderators m where m.user_id=auth.uid()));
end$$;

create or replace function public.submit_lesson_question(account_id uuid,lesson_id text,pose_index integer,question_body text,request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare who uuid:=private.lesson_help_member(account_id);clean text;total integer;item public.lesson_help_questions;
begin
 if request_id is null then raise exception 'Missing request ID' using errcode='22023';end if;
 total:=private.help_pose(lesson_id,pose_index);
 clean:=private.help_text(question_body,10,1000,'Question');
 perform pg_advisory_xact_lock(hashtextextended('tkdflow-help:'||who::text,0));
 -- A retried request returns the original question instead of a second copy.
 select * into item from public.lesson_help_questions q where q.author_id=who and q.request_id=submit_lesson_question.request_id;
 if found then
  if item.lesson_id<>submit_lesson_question.lesson_id or item.body<>clean or item.pose_index is distinct from submit_lesson_question.pose_index then raise exception 'This request was already used for a different question' using errcode='22023';end if;
  return jsonb_build_object('version',1,'duplicate',true,'question',private.lesson_help_question_json(item));
 end if;
 -- The same open question about the same lesson pose within a week is not stored twice.
 select * into item from public.lesson_help_questions q where q.author_id=who and q.lesson_id=submit_lesson_question.lesson_id and q.status<>'closed'
  and q.pose_index is not distinct from submit_lesson_question.pose_index and q.created_at>now()-interval '7 days' and lower(regexp_replace(q.body,'\s+',' ','g'))=lower(regexp_replace(clean,'\s+',' ','g')) order by q.created_at desc limit 1;
 if found then return jsonb_build_object('version',1,'duplicate',true,'question',private.lesson_help_question_json(item));end if;
 if exists(select 1 from public.lesson_help_questions q where q.author_id=who and q.created_at>now()-interval '15 seconds')
  or (select count(*) from public.lesson_help_questions q where q.author_id=who and q.created_at>now()-interval '1 hour')>=5
  or (select count(*) from public.lesson_help_questions q where q.author_id=who and q.created_at>now()-interval '1 day')>=20 then
  raise exception 'You have sent several questions recently. Please wait before asking another.' using errcode='P0001';
 end if;
 insert into public.lesson_help_questions(author_id,request_id,lesson_id,pose_index,pose_count,body)
  values(who,submit_lesson_question.request_id,submit_lesson_question.lesson_id,submit_lesson_question.pose_index,total,clean) returning * into item;
 insert into public.lesson_help_events(question_id,actor_id,action,to_status) values(item.id,who,'submitted','submitted');
 return jsonb_build_object('version',1,'duplicate',false,'question',private.lesson_help_question_json(item));
end$$;

create or replace function public.my_lesson_questions(account_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare who uuid:=private.lesson_help_member(account_id);
begin
 return jsonb_build_object('version',1,'questions',(select coalesce(jsonb_agg(private.lesson_help_question_json(q) order by q.created_at desc,q.id),'[]'::jsonb)
  from public.lesson_help_questions q where q.id in (select x.id from public.lesson_help_questions x where x.author_id=who order by x.created_at desc,x.id limit 100)));
end$$;

/* ── moderator review ── */
create or replace function public.lesson_help_queue(account_id uuid,lesson_filter text default null,status_filter text default 'open') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare moderator uuid:=private.lesson_help_moderator(account_id);
begin
 if lesson_filter is not null and private.lesson_pose_count(lesson_filter) is null then raise exception 'Unknown lesson' using errcode='22023';end if;
 if status_filter is null or status_filter not in ('open','all','submitted','reviewed','resolved','closed') then raise exception 'Invalid status filter' using errcode='22023';end if;
 return jsonb_build_object('version',1,
  'totals',(select jsonb_build_object(
    'submitted',count(*) filter(where status='submitted'),'reviewed',count(*) filter(where status='reviewed'),
    'resolved',count(*) filter(where status='resolved'),'closed',count(*) filter(where status='closed'))
   from public.lesson_help_questions q where lesson_filter is null or q.lesson_id=lesson_filter),
  'groups',(select coalesce(jsonb_agg(g order by g.count desc,g.lesson_id),'[]'::jsonb) from (
    select q.lesson_id,coalesce(q.topic_key,'pose-'||coalesce((q.pose_index+1)::text,'all')) as key,
     min(q.pose_index) filter(where q.topic_key is null) as pose_index,count(*) as count
    from public.lesson_help_questions q where q.status in ('submitted','reviewed') and (lesson_filter is null or q.lesson_id=lesson_filter)
    group by q.lesson_id,coalesce(q.topic_key,'pose-'||coalesce((q.pose_index+1)::text,'all')) having count(*)>1)g),
  'questions',(select coalesce(jsonb_agg(private.lesson_help_question_json(q)||jsonb_build_object('topic_key',q.topic_key,'member',private.lesson_help_member_label(q.author_id)) order by q.created_at,q.id),'[]'::jsonb)
   from public.lesson_help_questions q where q.id in (select x.id from public.lesson_help_questions x
    where (lesson_filter is null or x.lesson_id=lesson_filter)
     and (status_filter='all' or (status_filter='open' and x.status in ('submitted','reviewed')) or x.status=status_filter)
    order by x.created_at,x.id limit 200)));
end$$;

create or replace function public.set_lesson_question_status(account_id uuid,question_id uuid,new_status text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare moderator uuid:=private.lesson_help_moderator(account_id);item public.lesson_help_questions;
begin
 select * into item from public.lesson_help_questions q where q.id=question_id for update;
 if not found then raise exception 'Question unavailable' using errcode='P0002';end if;
 if new_status is null or new_status not in ('reviewed','resolved','closed') then raise exception 'Invalid status' using errcode='22023';end if;
 if item.status=new_status then return jsonb_build_object('version',1,'changed',false,'status',item.status);end if;
 if not ((item.status='submitted') or (item.status='reviewed') or (item.status='resolved' and new_status in ('reviewed','closed')) or (item.status='closed' and new_status='reviewed')) then
  raise exception 'A % question cannot move to %',item.status,new_status using errcode='22023';
 end if;
 update public.lesson_help_questions q set status=new_status,updated_at=now() where q.id=item.id;
 insert into public.lesson_help_events(question_id,actor_id,action,from_status,to_status) values(item.id,moderator,'status',item.status,new_status);
 return jsonb_build_object('version',1,'changed',true,'status',new_status);
end$$;

create or replace function public.reply_lesson_question(account_id uuid,question_id uuid,reply_body text,request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare moderator uuid:=private.lesson_help_moderator(account_id);item public.lesson_help_questions;clean text;existing public.lesson_help_replies;
begin
 if request_id is null then raise exception 'Missing request ID' using errcode='22023';end if;
 clean:=private.help_text(reply_body,2,2000,'Reply');
 select * into item from public.lesson_help_questions q where q.id=question_id for update;
 if not found then raise exception 'Question unavailable' using errcode='P0002';end if;
 select * into existing from public.lesson_help_replies r where r.question_id=item.id and r.request_id=reply_lesson_question.request_id;
 if found then
  if existing.body<>clean then raise exception 'This request was already used for a different reply' using errcode='22023';end if;
  return jsonb_build_object('version',1,'duplicate',true,'status',item.status);
 end if;
 if item.status='closed' then raise exception 'Reopen this question before replying' using errcode='22023';end if;
 insert into public.lesson_help_replies(question_id,moderator_id,request_id,body) values(item.id,moderator,reply_lesson_question.request_id,clean);
 insert into public.lesson_help_events(question_id,actor_id,action) values(item.id,moderator,'reply');
 if item.status='submitted' then
  update public.lesson_help_questions q set status='reviewed',updated_at=now() where q.id=item.id;
  insert into public.lesson_help_events(question_id,actor_id,action,from_status,to_status) values(item.id,moderator,'status','submitted','reviewed');
  return jsonb_build_object('version',1,'duplicate',false,'status','reviewed');
 end if;
 update public.lesson_help_questions q set updated_at=now() where q.id=item.id;
 return jsonb_build_object('version',1,'duplicate',false,'status',item.status);
end$$;

create or replace function public.group_lesson_question(account_id uuid,question_id uuid,group_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare moderator uuid:=private.lesson_help_moderator(account_id);clean text:=nullif(lower(btrim(coalesce(group_key,''))),'');item public.lesson_help_questions;
begin
 if clean is not null and clean !~ '^[a-z0-9][a-z0-9-]{1,39}$' then raise exception 'Use 2–40 lowercase letters, numbers or hyphens for the group' using errcode='22023';end if;
 update public.lesson_help_questions q set topic_key=clean,updated_at=now() where q.id=question_id and q.topic_key is distinct from clean returning * into item;
 if found then insert into public.lesson_help_events(question_id,actor_id,action) values(item.id,moderator,'group');
 elsif not exists(select 1 from public.lesson_help_questions q where q.id=question_id) then raise exception 'Question unavailable' using errcode='P0002';end if;
 return jsonb_build_object('version',1,'topic_key',clean);
end$$;

/* ── curated public FAQ ── */
create or replace function private.lesson_faq_public_json(f public.lesson_faq_entries) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',f.id,'lesson_id',f.lesson_id,'pose_index',f.pose_index,'pose_count',f.pose_count,'question',f.question,
  'answer',f.answer,'source_url',f.source_url,'source_label',f.source_label,'credit',f.credit,'published_at',f.published_at,'updated_at',f.updated_at)
$$;
revoke all on function private.lesson_faq_public_json(public.lesson_faq_entries) from public,anon,authenticated;

create or replace function private.lesson_faq_matches(f public.lesson_faq_entries,lesson text,pose integer,q text,a text,url text,label text,credit_text text) returns boolean
language sql immutable set search_path='' as $$
 select f.lesson_id=lesson and f.pose_index is not distinct from pose and f.question=q and f.answer=a and f.source_url is not distinct from url
  and f.source_label is not distinct from label and f.credit=credit_text
$$;
revoke all on function private.lesson_faq_matches(public.lesson_faq_entries,text,integer,text,text,text,text,text) from public,anon,authenticated;

create or replace function private.lesson_faq_revision(f public.lesson_faq_entries,actor uuid,act text) returns void
language sql security definer set search_path='' as $$
 insert into public.lesson_faq_revisions(faq_id,version,actor_id,action,snapshot) values(f.id,f.version,actor,act,private.lesson_faq_public_json(f)||jsonb_build_object('status',f.status))
$$;
revoke all on function private.lesson_faq_revision(public.lesson_faq_entries,uuid,text) from public,anon,authenticated;

create or replace function public.save_lesson_faq(account_id uuid,entry_id uuid,lesson_id text,pose_index integer,question_text text,answer_text text,reference_url text,reference_label text,credit_mode text,expected_version integer,request_id uuid,update_public boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare moderator uuid:=private.lesson_help_moderator(account_id);total integer;q text;a text;url text:=nullif(btrim(coalesce(reference_url,'')),'');label text:=nullif(btrim(coalesce(reference_label,'')),'');credit_text text;handle text;item public.lesson_faq_entries;
begin
 if request_id is null then raise exception 'Missing request ID' using errcode='22023';end if;
 total:=private.help_pose(lesson_id,pose_index);
 q:=private.help_text(question_text,10,300,'Question');
 a:=private.help_text(answer_text,20,4000,'Answer');
 if url is null and label is not null then raise exception 'Add the reference link for this label' using errcode='22023';end if;
 if url is not null and (char_length(url)>500 or url !~ '^https://[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:[0-9]{1,5})?(/[^[:space:]<>"''`\\]*)?$') then raise exception 'Use a full https:// reference link' using errcode='22023';end if;
 if label is not null then label:=private.help_text(label,2,120,'Reference label');end if;
 -- Credit is always derived on the server. 'keep' preserves an existing answer's
 -- public credit on edit, so a small correction never re-attributes someone else's answer.
 if credit_mode='keep' then
  if entry_id is null then raise exception 'Choose how to credit this answer' using errcode='22023';end if;
 elsif credit_mode='team' then credit_text:='TKDflow moderators';
 elsif credit_mode='handle' then
  select p.username into handle from public.profiles p where p.id=moderator;
  if handle is null then raise exception 'Complete your profile to be credited by username' using errcode='42501';end if;
  credit_text:='@'||handle;
 else raise exception 'Choose how to credit this answer' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('tkdflow-faq:'||coalesce(entry_id::text,request_id::text),0));
 if entry_id is null then
  select * into item from public.lesson_faq_entries f where f.create_request_id=save_lesson_faq.request_id;
  if found then
   if not private.lesson_faq_matches(item,save_lesson_faq.lesson_id,save_lesson_faq.pose_index,q,a,url,label,credit_text) then raise exception 'This request was already used for a different answer' using errcode='22023';end if;
   return jsonb_build_object('version',1,'duplicate',true,'entry',private.lesson_faq_public_json(item)||jsonb_build_object('status',item.status,'version',item.version));end if;
  insert into public.lesson_faq_entries(create_request_id,last_request_id,lesson_id,pose_index,pose_count,question,answer,source_url,source_label,credit,created_by,updated_by)
   values(save_lesson_faq.request_id,save_lesson_faq.request_id,save_lesson_faq.lesson_id,save_lesson_faq.pose_index,total,q,a,url,label,credit_text,moderator,moderator) returning * into item;
  perform private.lesson_faq_revision(item,moderator,'created');
  return jsonb_build_object('version',1,'duplicate',false,'entry',private.lesson_faq_public_json(item)||jsonb_build_object('status',item.status,'version',item.version));
 end if;
 select * into item from public.lesson_faq_entries f where f.id=entry_id for update;
 if not found then raise exception 'FAQ entry unavailable' using errcode='P0002';end if;
 if credit_mode='keep' then credit_text:=item.credit;end if;
 if item.last_request_id=save_lesson_faq.request_id then
  if not private.lesson_faq_matches(item,save_lesson_faq.lesson_id,save_lesson_faq.pose_index,q,a,url,label,credit_text) then raise exception 'This request was already used for a different answer' using errcode='22023';end if;
  return jsonb_build_object('version',1,'duplicate',true,'entry',private.lesson_faq_public_json(item)||jsonb_build_object('status',item.status,'version',item.version));end if;
 if expected_version is distinct from item.version then raise exception 'This answer changed since you opened it. Reload before saving.' using errcode='40001';end if;
 -- Edits to a published answer change the live page, so the caller must say so.
 if item.status='published' and update_public is not true then raise exception 'This answer is public. Confirm that you want to update the public answer.' using errcode='22023';end if;
 update public.lesson_faq_entries f set lesson_id=save_lesson_faq.lesson_id,pose_index=save_lesson_faq.pose_index,pose_count=total,question=q,answer=a,source_url=url,source_label=label,
  credit=credit_text,version=f.version+1,last_request_id=save_lesson_faq.request_id,updated_by=moderator,updated_at=now() where f.id=item.id returning * into item;
 perform private.lesson_faq_revision(item,moderator,'edited');
 return jsonb_build_object('version',1,'duplicate',false,'entry',private.lesson_faq_public_json(item)||jsonb_build_object('status',item.status,'version',item.version));
end$$;

create or replace function public.set_lesson_faq_published(account_id uuid,entry_id uuid,publish boolean,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare moderator uuid:=private.lesson_help_moderator(account_id);item public.lesson_faq_entries;target text;
begin
 if publish is null then raise exception 'Choose publish or unpublish' using errcode='22023';end if;
 select * into item from public.lesson_faq_entries f where f.id=entry_id for update;
 if not found then raise exception 'FAQ entry unavailable' using errcode='P0002';end if;
 target:=case when publish then 'published' else 'unpublished' end;
 if item.status=target or (not publish and item.status='draft') then return jsonb_build_object('version',1,'changed',false,'status',item.status,'entry_version',item.version);end if;
 if expected_version is distinct from item.version then raise exception 'This answer changed since you opened it. Reload before saving.' using errcode='40001';end if;
 update public.lesson_faq_entries f set status=target,version=f.version+1,updated_by=moderator,updated_at=now(),published_at=case when publish then now() else f.published_at end
  where f.id=item.id returning * into item;
 perform private.lesson_faq_revision(item,moderator,target);
 return jsonb_build_object('version',1,'changed',true,'status',item.status,'entry_version',item.version);
end$$;

create or replace function public.lesson_faq_admin(account_id uuid,lesson_filter text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare moderator uuid:=private.lesson_help_moderator(account_id);
begin
 if lesson_filter is not null and private.lesson_pose_count(lesson_filter) is null then raise exception 'Unknown lesson' using errcode='22023';end if;
 return jsonb_build_object('version',1,'entries',(select coalesce(jsonb_agg(private.lesson_faq_public_json(f)||jsonb_build_object('status',f.status,'version',f.version,
   'revisions',(select coalesce(jsonb_agg(jsonb_build_object('version',r.version,'action',r.action,'created_at',r.created_at,'by_you',r.actor_id=moderator) order by r.id desc),'[]'::jsonb)
    from (select x.version,x.action,x.created_at,x.actor_id,x.id from public.lesson_faq_revisions x where x.faq_id=f.id order by x.id desc limit 10)r)) order by f.updated_at desc,f.id),'[]'::jsonb)
  from public.lesson_faq_entries f where f.id in (select x.id from public.lesson_faq_entries x where lesson_filter is null or x.lesson_id=lesson_filter order by x.updated_at desc,x.id limit 200)));
end$$;

-- Public, read-only: published curated entries and their public fields only.
create or replace function public.public_lesson_faq(lesson_filter text default null,search_text text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare needle text:=nullif(btrim(coalesce(search_text,'')),'');
begin
 if lesson_filter is not null and private.lesson_pose_count(lesson_filter) is null then raise exception 'Unknown lesson' using errcode='22023';end if;
 if needle is not null then needle:=left(needle,100);needle:='%'||replace(replace(replace(needle,'\','\\'),'%','\%'),'_','\_')||'%';end if;
 return jsonb_build_object('version',1,'entries',(select coalesce(jsonb_agg(private.lesson_faq_public_json(f) order by f.lesson_id,f.pose_index nulls first,f.published_at desc,f.id),'[]'::jsonb)
  from public.lesson_faq_entries f where f.id in (select x.id from public.lesson_faq_entries x where x.status='published' and (lesson_filter is null or x.lesson_id=lesson_filter)
   and (needle is null or x.question ilike needle or x.answer ilike needle) order by x.published_at desc,x.id limit 200)));
end$$;

revoke all on function public.lesson_help_access(),public.submit_lesson_question(uuid,text,integer,text,uuid),public.my_lesson_questions(uuid),
 public.lesson_help_queue(uuid,text,text),public.set_lesson_question_status(uuid,uuid,text),public.reply_lesson_question(uuid,uuid,text,uuid),public.group_lesson_question(uuid,uuid,text),
 public.save_lesson_faq(uuid,uuid,text,integer,text,text,text,text,text,integer,uuid,boolean),public.set_lesson_faq_published(uuid,uuid,boolean,integer),public.lesson_faq_admin(uuid,text),
 public.public_lesson_faq(text,text) from public,anon,authenticated;
grant execute on function public.lesson_help_access(),public.submit_lesson_question(uuid,text,integer,text,uuid),public.my_lesson_questions(uuid),
 public.lesson_help_queue(uuid,text,text),public.set_lesson_question_status(uuid,uuid,text),public.reply_lesson_question(uuid,uuid,text,uuid),public.group_lesson_question(uuid,uuid,text),
 public.save_lesson_faq(uuid,uuid,text,integer,text,text,text,text,text,integer,uuid,boolean),public.set_lesson_faq_published(uuid,uuid,boolean,integer),public.lesson_faq_admin(uuid,text) to authenticated;
grant execute on function public.public_lesson_faq(text,text) to anon,authenticated;
commit;
