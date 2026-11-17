-- Private saved forms and study position. Install on staging before production.
begin;
create table if not exists public.member_learning(
 user_id uuid not null references auth.users(id) on delete cascade,
 form_id text not null,
 saved boolean not null default false,last_pose integer,pose_count integer,
 practised boolean not null default false,studied_at timestamptz,updated_at timestamptz not null default now(),
 primary key(user_id,form_id),
 constraint member_learning_pose check((last_pose is null and pose_count is null) or (last_pose is not null and pose_count is not null and pose_count between 1 and 200 and last_pose>=0 and last_pose<pose_count))
);
alter table public.member_learning enable row level security;
revoke all on public.member_learning from public,anon,authenticated;
create or replace function private.learning_owner(account_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or account_id is distinct from auth.uid() then raise exception 'Your sign-in changed. Reload your learning list.' using errcode='42501';end if;
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=account_id and (p.age is null or p.age>=13) and u.email_confirmed_at is not null) then raise exception 'Confirm your email and complete your profile first.' using errcode='42501';end if;
 return account_id;
end$$;
revoke all on function private.learning_owner(uuid) from public,anon,authenticated;
create or replace function public.my_learning(account_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare who uuid:=private.learning_owner(account_id);begin
 return jsonb_build_object('version',1,'records',(select coalesce(jsonb_agg(to_jsonb(l)-'user_id' order by l.updated_at desc),'[]'::jsonb) from public.member_learning l where l.user_id=who));
end$$;
create or replace function public.set_learning(account_id uuid,lesson_id text,save_form boolean default null,pose_index integer default null,pose_total integer default null,practise boolean default null,reset_progress boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare who uuid:=private.learning_owner(account_id);item public.member_learning;
begin
 if lesson_id is null or lesson_id not in ('taegeuk-1','taegeuk-2','taegeuk-3','taegeuk-4','taegeuk-5','taegeuk-6','taegeuk-7','taegeuk-8','koryo','keumgang','taebaek','pyongwon','sipjin','jitae','chon-ji','dan-gun','do-san','won-hyo','yul-gok','joong-gun','songahm-1','songahm-2','songahm-3') then raise exception 'Unknown lesson';end if;
 if (pose_index is null)<>(pose_total is null) or (pose_total is not null and (pose_total<1 or pose_total>200 or pose_index<0 or pose_index>=pose_total)) then raise exception 'Invalid pose';end if;
 if reset_progress is null then raise exception 'Invalid reset';end if;
 if save_form is null and pose_index is null and practise is null and not reset_progress then raise exception 'No learning change';end if;
 perform pg_advisory_xact_lock(hashtextextended('tkdflow-learning:'||who::text||':'||lesson_id,0));
 insert into public.member_learning(user_id,form_id) values(who,lesson_id) on conflict do nothing;
 select * into item from public.member_learning where user_id=who and form_id=lesson_id for update;
 update public.member_learning set saved=coalesce(save_form,saved),
  last_pose=case when pose_index is not null then pose_index when reset_progress then null else last_pose end,
  pose_count=case when pose_total is not null then pose_total when reset_progress then null else pose_count end,
  practised=coalesce(practise,case when reset_progress then false else practised end),
  studied_at=case when pose_index is not null or practise is not null then now() when reset_progress then null else studied_at end,updated_at=now()
 where user_id=who and form_id=lesson_id returning * into item;
 if not item.saved and item.last_pose is null and not item.practised then
  delete from public.member_learning where user_id=who and form_id=lesson_id;return jsonb_build_object('version',1,'record',null);
 end if;
 return jsonb_build_object('version',1,'record',to_jsonb(item)-'user_id');
end$$;
revoke all on function public.my_learning(uuid),public.set_learning(uuid,text,boolean,integer,integer,boolean,boolean) from public,anon;
grant execute on function public.my_learning(uuid),public.set_learning(uuid,text,boolean,integer,integer,boolean,boolean) to authenticated;
commit;
