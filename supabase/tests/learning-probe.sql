-- Private copy only: replace the owner email placeholder. No test change persists.
begin;
select set_config('tkdflow.qa_owner_email','__TKDFLOW_QA_OWNER_EMAIL__',true) is not null as owner_selected;
create temporary table tkdflow_learning_qa on commit drop as
 select u.id as owner_id from auth.users u join public.profiles p on p.id=u.id
 where lower(btrim(u.email))=current_setting('tkdflow.qa_owner_email') and u.email_confirmed_at is not null;
do $$begin if (select count(*) from tkdflow_learning_qa)<>1 then raise exception 'Expected one confirmed owner with a profile';end if;end$$;
grant select on tkdflow_learning_qa to authenticated;
select set_config('request.jwt.claim.sub',(select owner_id::text from tkdflow_learning_qa),true) is not null as owner_context;
set local role authenticated;
do $$declare who uuid;r jsonb;denied boolean:=false;begin
 if current_user<>'authenticated' then raise exception 'Expected authenticated role';end if;
 select owner_id into who from pg_temp.tkdflow_learning_qa;
 r:=public.set_learning(who,'taegeuk-1',true,5,20,false,false);
 if r->'record'->>'saved'<>'true' or (r->'record'->>'last_pose')::int<>5 then raise exception 'Save and study check failed';end if;
 r:=public.my_learning(who);
 if not exists(select 1 from jsonb_array_elements(r->'records') x where x->>'form_id'='taegeuk-1' and (x->>'last_pose')::int=5) then raise exception 'Private read check failed';end if;
 if r::text like '%user_id%' then raise exception 'Unexpected owner field';end if;
 begin perform public.my_learning(gen_random_uuid());exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Different-account access was accepted';end if;
 denied:=false;
 begin execute 'select count(*) from public.member_learning';exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Direct table access was accepted';end if;
 r:=public.set_learning(who,'taegeuk-1',null,null,null,true,false);
 if r->'record'->>'practised'<>'true' then raise exception 'Practice mark check failed';end if;
 r:=public.set_learning(who,'taegeuk-1',null,null,null,null,true);
 if r->'record'->>'saved'<>'true' or r->'record'->>'last_pose' is not null or r->'record'->>'practised'<>'false' then raise exception 'Reset check failed';end if;
end$$;
reset role;
rollback;
select 'Passed: all temporary learning changes rolled back' as learning_test;
