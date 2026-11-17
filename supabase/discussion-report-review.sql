-- Additive report review. Apply after community.sql; no member/profile policy changes.
begin;
alter table public.discussion_reports add column if not exists resolved_at timestamptz;
alter table public.discussion_reports add column if not exists resolution text;
alter table public.discussion_reports add column if not exists resolved_by uuid references auth.users(id) on delete set null;
do $$begin
 if not exists(select 1 from pg_constraint where conrelid='public.discussion_reports'::regclass and conname='discussion_report_resolution') then
  alter table public.discussion_reports add constraint discussion_report_resolution check(
   (resolved_at is null and resolution is null and resolved_by is null)
   or (resolved_at is not null and resolution is not null and resolution in ('dismissed','hidden')));
 end if;
end $$;
create index if not exists discussion_reports_open on public.discussion_reports(created_at) where resolved_at is null;
revoke all on public.discussion_reports from public,anon,authenticated;

create or replace function public.discussion_queue() returns jsonb
language plpgsql security definer set search_path='' as $$begin
 if not public.is_community_moderator() then raise exception 'Moderator only' using errcode='42501';end if;
 return jsonb_build_object(
  'report_review_version',1,
  'totals',jsonb_build_object(
   'topics',(select count(*) from public.discussion_topics where status='pending'),
   'replies',(select count(*) from public.discussion_replies where status='pending'),
   'reports',(select count(*) from public.discussion_reports where resolved_at is null)),
  'topics',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (
   select id,category,title,body,author_handle,editorial,status,created_at from public.discussion_topics where status='pending' order by created_at,id limit 100)t),
  'replies',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (
   select id,topic_id,body,author_handle,status,created_at from public.discussion_replies where status='pending' order by created_at,id limit 100)r),
  'reports',(select coalesce(jsonb_agg(to_jsonb(report)),'[]') from (
   select d.id,d.kind,d.content_id,d.reason,d.created_at,
    jsonb_build_object('available',t.id is not null or r.id is not null,
     'title',coalesce(t.title,parent.title,'Content no longer available'),
     'body',coalesce(t.body,r.body),
     'author_handle',coalesce(t.author_handle,r.author_handle),
     'topic_id',coalesce(t.id,r.topic_id),
     'status',coalesce(t.status,r.status),
     'parent_status',coalesce(t.status,parent.status)) as content
   from public.discussion_reports d
   left join public.discussion_topics t on d.kind='topic' and t.id=d.content_id
   left join public.discussion_replies r on d.kind='reply' and r.id=d.content_id
   left join public.discussion_topics parent on parent.id=r.topic_id
   where d.resolved_at is null order by d.created_at,d.id limit 100)report));
end $$;
revoke all on function public.discussion_queue() from public,anon;
grant execute on function public.discussion_queue() to authenticated;

create or replace function public.resolve_discussion_report(report_id uuid,report_decision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item public.discussion_reports; unavailable boolean; result text; affected integer;
begin
 if not public.is_community_moderator() then raise exception 'Moderator only' using errcode='42501';end if;
 if report_decision not in ('dismiss','hide') or report_decision is null then raise exception 'Invalid report decision';end if;
 select * into item from public.discussion_reports where id=report_id;
 if not found then raise exception 'Report unavailable' using errcode='P0002';end if;
 -- Serialize decisions on the same content, including separate reports of it.
 perform pg_advisory_xact_lock(hashtextextended('tkdflow-report:'||item.kind||':'||item.content_id::text,0));
 select * into item from public.discussion_reports where id=report_id for update;
 if not found then raise exception 'Report unavailable' using errcode='P0002';end if;
 if item.resolved_at is not null then return jsonb_build_object('already_reviewed',true,'resolution',item.resolution);end if;
 unavailable:=not ((item.kind='topic' and exists(select 1 from public.discussion_topics where id=item.content_id))
  or (item.kind='reply' and exists(select 1 from public.discussion_replies where id=item.content_id)));
 result:=case when report_decision='hide' then 'hidden' else 'dismissed' end;
 if report_decision='hide' then
  perform public.moderate_discussion(item.kind,item.content_id,'rejected');
 end if;
 update public.discussion_reports d set resolved_at=now(),resolution=result,resolved_by=auth.uid()
 where d.resolved_at is null and (d.id=report_id or
  (report_decision='hide' and d.kind=item.kind and d.content_id=item.content_id));
 get diagnostics affected=row_count;
 return jsonb_build_object('already_reviewed',false,'resolution',result,'content_unavailable',unavailable,'reports_resolved',affected);
end $$;
revoke all on function public.resolve_discussion_report(uuid,text) from public,anon;
grant execute on function public.resolve_discussion_report(uuid,text) to authenticated;
commit;
