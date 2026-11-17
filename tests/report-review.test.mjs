import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b',M='00000000-0000-4000-8000-00000000000d';
let db,legacy;
async function as(id,sql,args=[]){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);await tx.exec('set local role '+(id?'authenticated':'anon'));return tx.query(sql,args);});}
async function content(){const topic=randomUUID(),reply=randomUUID();await db.query("insert into public.discussion_topics(id,category,title,body,author_id,author_handle,status) values($1,'training','A focused practice question','How can a student study this specific transition?',$2,'member','published')",[topic,A]);await db.query("insert into public.discussion_replies(id,topic_id,body,author_id,author_handle,status) values($1,$2,'Practise slowly and bring the question to class.',$3,'member','published')",[reply,topic,A]);return {topic,reply};}
async function report(kind,id,reporter=B){return (await db.query("insert into public.discussion_reports(kind,content_id,reason,reporter_id) values($1,$2,'Please review this content against the guidelines.',$3) returning id",[kind,id,reporter])).rows[0].id;}
const queue=async id=>(await as(id,'select public.discussion_queue() as data')).rows[0].data;
const resolve=async(id,decision,who=M)=>(await as(who,'select public.resolve_discussion_report($1,$2) as data',[id,decision])).rows[0].data;
before(async()=>{db=new PGlite();await db.exec(read('supabase/tests/auth-shim.sql'));await db.exec('alter table auth.users add column email_confirmed_at timestamptz default now()');await db.exec(read('supabase-setup.sql'));await db.exec(read('supabase/community.sql'));
 for(const [id,name,age]of [[A,'member',23],[B,'teen',16],[M,'moderator',40]]){await db.query('insert into auth.users(id,email) values($1,$2)',[id,name+'@example.test']);await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,$2,$2,$3,'White Belt (10th Gup)')",[id,name,age]);await db.query('insert into private.account_eligibility values($1,$2,now())',[id,age<18?'teen':'adult']);}
 await db.query('insert into private.community_moderators values($1)',[M]);const c=await content();legacy=await report('topic',c.topic);
 await db.exec(read('supabase/discussion-report-review.sql'));
});
after(async()=>{await db?.close();});
test('report migration is additive, repeatable and preserves existing member/report records',async()=>{
 await db.exec(read('supabase/discussion-report-review.sql'));
 const row=(await db.query('select resolved_at,resolution,resolved_by from public.discussion_reports where id=$1',[legacy])).rows[0];assert.deepEqual(row,{resolved_at:null,resolution:null,resolved_by:null});
 assert.equal(Number((await db.query('select count(*) from public.profiles')).rows[0].count),3);
});
test('moderator context includes the reported reply and parent, without reporter or author identifiers',async()=>{
 const c=await content(),id=await report('reply',c.reply),data=await queue(M),item=data.reports.find(r=>r.id===id);
 assert.equal(data.report_review_version,1);assert.equal(item.content.topic_id,c.topic);assert.equal(item.content.body,'Practise slowly and bring the question to class.');assert.equal(item.content.available,true);
 const serialized=JSON.stringify(data);for(const key of ['reporter_id','author_id','resolved_by','email','full_name'])assert.ok(!serialized.includes('"'+key+'"'));
 assert.ok(!serialized.includes(B));
});
test('only assigned moderators can resolve reports or retrieve report context; table access remains closed',async()=>{
 for(const who of [null,A,B]){await assert.rejects(queue(who),/permission denied|Moderator only/);await assert.rejects(resolve(legacy,'dismiss',who),/permission denied|Moderator only/);}
 for(const who of [null,A,M])await assert.rejects(as(who,'select * from public.discussion_reports'),/permission denied/);
 await assert.rejects(as(M,"update public.discussion_reports set resolution='dismissed'"),/permission denied/);
});
test('keeping content closes one report, preserves public content and retains the private audit record',async()=>{
 const c=await content(),id=await report('topic',c.topic),other=await report('topic',c.topic,A);
 const result=await resolve(id,'dismiss');assert.equal(result.resolution,'dismissed');assert.equal(result.reports_resolved,1);
 assert.equal((await as(null,'select id from public.discussion_topics where id=$1',[c.topic])).rows.length,1);
 const q=await queue(M);assert.ok(!q.reports.some(r=>r.id===id));assert.ok(q.reports.some(r=>r.id===other));
 const audit=(await db.query('select resolution,resolved_by,resolved_at from public.discussion_reports where id=$1',[id])).rows[0];assert.equal(audit.resolved_by,M);assert.ok(audit.resolved_at);
 const again=await resolve(id,'hide');assert.equal(again.already_reviewed,true);assert.equal((await as(null,'select id from public.discussion_topics where id=$1',[c.topic])).rows.length,1);
 await resolve(other,'hide');assert.equal((await db.query('select resolution from public.discussion_reports where id=$1',[id])).rows[0].resolution,'dismissed','later decisions do not overwrite earlier review records');
});
test('hiding a topic resolves all its open reports and also removes its replies from public reading',async()=>{
 const c=await content(),id=await report('topic',c.topic),second=await report('topic',c.topic,A);
 const result=await resolve(id,'hide');assert.equal(result.reports_resolved,2);assert.equal(result.resolution,'hidden');
 assert.equal((await as(null,'select id from public.discussion_topics where id=$1',[c.topic])).rows.length,0);assert.equal((await as(null,'select id from public.discussion_replies where id=$1',[c.reply])).rows.length,0);
 assert.ok(!(await queue(M)).reports.some(r=>[id,second].includes(r.id)));
});
test('hiding a reply leaves its parent discussion public',async()=>{
 const c=await content(),id=await report('reply',c.reply);await resolve(id,'hide');
 assert.equal((await as(null,'select id from public.discussion_topics where id=$1',[c.topic])).rows.length,1);assert.equal((await as(null,'select id from public.discussion_replies where id=$1',[c.reply])).rows.length,0);
});
test('missing content can be closed honestly without leaving an unresolvable report',async()=>{
 const c=await content(),id=await report('topic',c.topic);await db.query('delete from public.discussion_topics where id=$1',[c.topic]);
 assert.equal((await queue(M)).reports.find(r=>r.id===id).content.available,false);
 assert.equal((await resolve(id,'hide')).content_unavailable,true);
});
test('invalid decisions, unknown reports and incomplete resolution records are rejected',async()=>{
 await assert.rejects(resolve(legacy,'publish'),/Invalid report decision/);await assert.rejects(resolve(legacy,null),/Invalid report decision/);await assert.rejects(resolve(randomUUID(),'dismiss'),/Report unavailable/);
 await assert.rejects(db.query('update public.discussion_reports set resolved_at=now() where id=$1',[legacy]),/discussion_report_resolution/);
});
test('a teen moderator may resolve a report without gaining posting or private-profile rights',async()=>{
 await db.query('insert into private.community_moderators values($1)',[B]);const c=await content(),id=await report('reply',c.reply,A);
 await resolve(id,'dismiss',B);assert.equal((await as(B,'select public.discussion_access() as data')).rows[0].data.adult,false);
 assert.equal((await as(B,'select id from public.profiles where id<>$1',[B])).rows.length,0);
 await assert.rejects(as(B,"select public.submit_discussion('A valid title','Moderation must not grant teen posting permission.','general')"),/Adult enrollment/);
 await db.query('delete from private.community_moderators where user_id=$1',[B]);
});
test('queue batches are bounded while totals count all unresolved reports',async()=>{
 for(let n=0;n<101;n++){const c=await content();await report('topic',c.topic);}
 const data=await queue(M);assert.equal(data.reports.length,100);assert.ok(data.totals.reports>100);
});
test('the cloud smoke probe rolls back every fixture and temporary role change',async()=>{
 const before=(await db.query('select (select count(*) from public.discussion_topics) as topics,(select count(*) from public.discussion_replies) as replies,(select count(*) from public.discussion_reports) as reports,(select count(*) from private.community_moderators) as moderators')).rows[0];
 await db.exec(read('supabase/tests/report-review-probe.sql').replace('__TKDFLOW_QA_OWNER_EMAIL__','teen@example.test'));
 const after=(await db.query('select (select count(*) from public.discussion_topics) as topics,(select count(*) from public.discussion_replies) as replies,(select count(*) from public.discussion_reports) as reports,(select count(*) from private.community_moderators) as moderators')).rows[0];
 assert.deepEqual(after,before);assert.equal((await db.query("select age_band from private.account_eligibility where user_id=$1",[B])).rows[0].age_band,'teen');
});
