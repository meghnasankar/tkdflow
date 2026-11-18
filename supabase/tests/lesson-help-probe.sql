-- Staging smoke probe for supabase/lesson-help.sql.
-- PRIVATE COPY ONLY. Replace the owner email placeholder with ONE confirmed
-- staging account that has a completed 13+ profile. Running this against any
-- cloud project needs the owner's explicit approval first; it has not been run.
--
-- The staging owner may hold no community moderator role (production has its
-- own separate moderators). Inside this transaction the probe temporarily adds
-- the moderator role for that one identified owner only, if it is missing,
-- checks every other role is untouched, and ROLLS BACK everything, including
-- that role, at the end. No other account's role is read, added or removed.
begin;
select set_config('tkdflow.qa_owner_email','__TKDFLOW_QA_OWNER_EMAIL__',true) is not null as owner_selected;
create temporary table tkdflow_help_qa on commit drop as
 select u.id as owner_id,exists(select 1 from private.community_moderators m where m.user_id=u.id) as had_moderator_role,
  (select count(*) from private.community_moderators) as baseline_roles
 from auth.users u join public.profiles p on p.id=u.id
 where lower(btrim(u.email))=lower(current_setting('tkdflow.qa_owner_email')) and u.email_confirmed_at is not null;
do $$begin if (select count(*) from tkdflow_help_qa)<>1 then raise exception 'Expected one confirmed owner with a profile';end if;end$$;
-- Temporary, owner-only moderator role (reverted by the final rollback).
insert into private.community_moderators(user_id) select owner_id from tkdflow_help_qa where not had_moderator_role;
do $$begin
 if (select count(*) from private.community_moderators)<>(select baseline_roles+case when had_moderator_role then 0 else 1 end from tkdflow_help_qa) then raise exception 'Unexpected moderator role change';end if;
end$$;
grant select on tkdflow_help_qa to authenticated;
select set_config('request.jwt.claim.sub',(select owner_id::text from tkdflow_help_qa),true) is not null as owner_context;
set local role authenticated;
do $$declare who uuid;r jsonb;qrow jsonb;question uuid;entry uuid;denied boolean;begin
 if current_user<>'authenticated' then raise exception 'Expected authenticated role';end if;
 select owner_id into who from pg_temp.tkdflow_help_qa;
 r:=public.lesson_help_access();
 if r->>'member'<>'true' or r->>'moderator'<>'true' then raise exception 'Access check failed: %',r->>'reason';end if;
 r:=public.submit_lesson_question(who,'taegeuk-1',3,'Probe question: is this pose link attached correctly?',gen_random_uuid());
 question:=(r->'question'->>'id')::uuid;
 if r->'question'->>'status'<>'submitted' or (r->'question'->>'pose_count')::int<>20 then raise exception 'Submit check failed';end if;
 r:=public.my_lesson_questions(who);
 if not exists(select 1 from jsonb_array_elements(r->'questions') x where (x->>'id')::uuid=question) then raise exception 'Own question missing';end if;
 if r::text like '%author_id%' then raise exception 'Unexpected owner field';end if;
 r:=public.lesson_help_queue(who,'taegeuk-1','open');
 -- Inspect the synthetic row itself: only the allowed review fields, a pseudonymous member label.
 select x into qrow from jsonb_array_elements(r->'questions') x where (x->>'id')::uuid=question;
 if qrow is null or qrow->>'member' !~ '^Member [0-9A-F]{6}$' or qrow->>'body'<>'Probe question: is this pose link attached correctly?' then raise exception 'Queue check failed';end if;
 if exists(select 1 from jsonb_object_keys(qrow) k where k not in ('id','lesson_id','pose_index','pose_count','body','status','created_at','updated_at','replies','topic_key','member')) then raise exception 'Queue row exposes an unexpected field';end if;
 r:=public.reply_lesson_question(who,question,'Probe reply',gen_random_uuid());
 if r->>'status'<>'reviewed' then raise exception 'Reply check failed';end if;
 r:=public.set_lesson_question_status(who,question,'resolved');
 if r->>'status'<>'resolved' then raise exception 'Status check failed';end if;
 denied:=false;
 begin perform public.lesson_help_queue(gen_random_uuid(),null,'open');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'A moderator call from a different account was accepted';end if;
 denied:=false;
 begin perform public.my_lesson_questions(gen_random_uuid());exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Different-account access was accepted';end if;
 denied:=false;
 begin execute 'select count(*) from public.lesson_help_questions';exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Direct table access was accepted';end if;
 r:=public.save_lesson_faq(who,null,'taegeuk-1',3,'Probe FAQ question for staging?','Probe answer used only inside this rolled-back staging check.',null,null,'team',null,gen_random_uuid(),false);
 entry:=(r->'entry'->>'id')::uuid;
 r:=public.set_lesson_faq_published(who,entry,true,1);
 if r->>'status'<>'published' then raise exception 'Publish check failed';end if;
 perform set_config('tkdflow.qa_entry',entry::text,true);
end$$;
reset role;
select set_config('request.jwt.claim.sub','',true) is not null as anonymous_context;
set local role anon;
do $$declare r jsonb;denied boolean;begin
 r:=public.public_lesson_faq('taegeuk-1',null);
 if not exists(select 1 from jsonb_array_elements(r->'entries') x where x->>'id'=current_setting('tkdflow.qa_entry')) then raise exception 'Anonymous FAQ read failed';end if;
 if r::text like '%Probe question:%' or r::text like '%created_by%' then raise exception 'Public FAQ exposes private fields';end if;
 denied:=false;
 begin perform public.lesson_help_access();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous member access was accepted';end if;
end$$;
reset role;
rollback;
select 'Passed: all temporary lesson help changes, including any temporary moderator role, rolled back' as lesson_help_test;
