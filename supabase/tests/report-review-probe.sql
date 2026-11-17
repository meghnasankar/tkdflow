-- Replace the placeholder with the confirmed test owner's email in a private copy.
-- All fixture data and temporary moderator access are rolled back, including on failure.
begin;
select set_config('tkdflow.qa_owner_email','__TKDFLOW_QA_OWNER_EMAIL__',true) is not null as test_owner_selected;
do $$begin
 if (select count(*) from auth.users u join public.profiles p on p.id=u.id
  where lower(btrim(u.email))=current_setting('tkdflow.qa_owner_email') and u.email_confirmed_at is not null)<>1
 then raise exception 'Expected one confirmed test owner with a profile';end if;
end $$;
create temporary table tkdflow_report_qa_context on commit drop as
 select u.id as owner_id,gen_random_uuid() as topic_id,gen_random_uuid() as reply_id,
  gen_random_uuid() as topic_report,gen_random_uuid() as reply_report
 from auth.users u join public.profiles p on p.id=u.id
 where lower(btrim(u.email))=current_setting('tkdflow.qa_owner_email') and u.email_confirmed_at is not null;
grant select on tkdflow_report_qa_context to authenticated;
insert into private.community_moderators(user_id) select owner_id from tkdflow_report_qa_context on conflict do nothing;
insert into public.discussion_topics(id,category,title,body,author_handle,editorial,status)
 select topic_id,'general','Transaction-only review test','This synthetic topic is rolled back and never published to other sessions.','qa_transaction',true,'published' from tkdflow_report_qa_context;
insert into public.discussion_replies(id,topic_id,body,author_handle,status)
 select reply_id,topic_id,'This synthetic reply is rolled back.','qa_transaction','published' from tkdflow_report_qa_context;
insert into public.discussion_reports(id,kind,content_id,reason,reporter_id,created_at)
 select topic_report,'topic',topic_id,'Transaction-only test report.',owner_id,'2000-01-01T00:00:00Z'::timestamptz from tkdflow_report_qa_context
 union all select reply_report,'reply',reply_id,'Transaction-only test report.',owner_id,'2000-01-01T00:00:00Z'::timestamptz from tkdflow_report_qa_context;
select set_config('request.jwt.claim.sub',(select owner_id::text from tkdflow_report_qa_context),true) is not null as member_context_selected;
set local role authenticated;
do $$declare c record;q jsonb;r jsonb;begin
 if current_user<>'authenticated' then raise exception 'Expected authenticated member role';end if;
 select * into c from pg_temp.tkdflow_report_qa_context;
 q:=public.discussion_queue();
 if (q->>'report_review_version')::integer<>1 then raise exception 'Report review version mismatch';end if;
 if not exists(select 1 from jsonb_array_elements(q->'reports') x where x->>'id'=c.topic_report::text
  and x->'content'->>'body'='This synthetic topic is rolled back and never published to other sessions.') then raise exception 'Report context unavailable';end if;
 r:=public.resolve_discussion_report(c.topic_report,'dismiss');
 if r->>'resolution'<>'dismissed' or not exists(select 1 from public.discussion_topics where id=c.topic_id) then raise exception 'Keep content check failed';end if;
 r:=public.resolve_discussion_report(c.reply_report,'hide');
 if r->>'resolution'<>'hidden' or exists(select 1 from public.discussion_replies where id=c.reply_id) then raise exception 'Hide reply check failed';end if;
 r:=public.resolve_discussion_report(c.topic_report,'hide');
 if not (r->>'already_reviewed')::boolean or not exists(select 1 from public.discussion_topics where id=c.topic_id) then raise exception 'Repeated review changed content';end if;
 q:=public.discussion_queue();
 if exists(select 1 from jsonb_array_elements(q->'reports') x where x->>'id' in(c.topic_report::text,c.reply_report::text)) then raise exception 'Resolved reports remain open';end if;
end $$;
reset role;
rollback;
select 'Passed; all temporary records and moderator access rolled back' as report_review_test;
