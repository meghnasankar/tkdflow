import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {safeHref} from '../js/lib/dom.js';
import {discussionProblem,submitTopic,submitReply} from '../js/lib/discussions.js';
import {enrollmentBand,readSmallJson} from '../supabase/functions/enroll/logic.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b',M='00000000-0000-4000-8000-00000000000d',E='00000000-0000-4000-8000-00000000000e';
let db,topicId,replyId;
before(async()=>{db=new PGlite();await db.exec(read('supabase/tests/auth-shim.sql'));await db.exec('create role supabase_auth_admin nologin;');await db.exec(read('supabase-setup.sql'));await db.exec(read('supabase/community.sql'));await db.exec(read('supabase/enrollment.sql'));await db.exec(read('supabase/discussion-guides.sql'));
 for(const [id,name,age]of [[A,'adult',22],[B,'teen',16],[M,'moderator',40]])await db.query("insert into auth.users(id,email)values($1,$2);",[id,name+'@example.test']);
 for(const [id,name,age]of [[A,'adult',22],[B,'teen',16],[M,'moderator',40]])await db.query("insert into public.profiles(id,full_name,username,age,belt_level)values($1,$2,$2,$3,'White Belt (10th Gup)')",[id,name,age]);
 await db.query("insert into private.account_eligibility(user_id,age_band) values($1,'adult'),($2,'teen'),($3,'adult')",[A,B,M]);await db.query('insert into private.community_moderators values($1)',[M]);
});
after(async()=>{await db?.close();});
async function as(role,id,fn){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);await tx.exec(`set local role ${role}`);return fn(tx);});}
const user=(id,fn)=>as('authenticated',id,fn),anon=fn=>as('anon',null,fn);

test('community resource links are safe and retain their category filters',()=>{
 const data=JSON.parse(read('data/community.json'));for(const p of data.posts)assert.ok(safeHref(p.url),p.id);
 assert.equal(safeHref('forum.html?category=technique-qa'),'forum.html?category=technique-qa');
 for(const url of ['javascript:alert(1)','//other.example/page','data:text/html,bad'])assert.equal(safeHref(url),null);
});

test('discussion validation and RPC calls cannot supply author or publication privileges',async()=>{
 assert.ok(discussionProblem({title:'x',body:'x',category:'bad'},['general']));
 assert.equal(discussionProblem({title:'A focused question',body:'Which direction should this movement face?',category:'general'},['general']),null);
 const calls=[],client={rpc:(name,args)=>{calls.push([name,args]);return {data:'ok',error:null};}};
 await submitTopic(client,{title:'  Clear question  ',body:'  A long enough question about a particular form.  ',category:'general',status:'published',author_id:M});
 await submitReply(client,A,'  A meaningful reply.  ');
 assert.deepEqual(Object.keys(calls[0][1]).sort(),['topic_body','topic_category','topic_title']);assert.equal(calls[1][1].parent_topic,A);
});

test('email enrollment requires a single-use unexpired server ticket; new Google creation is denied',async()=>{
 const token='fake-enrollment-ticket-for-permission-test',hash=createHash('sha256').update(token).digest('hex');
 await as('service_role',null,tx=>tx.query("select public.issue_enrollment($1,'teen')",[hash]));
 const payload={user:{id:E,app_metadata:{provider:'email'},user_metadata:{enrollment_ticket:token}}};
 const result=await as('supabase_auth_admin',null,tx=>tx.query('select public.check_tkdflow_enrollment($1::jsonb) as result',[JSON.stringify(payload)]));assert.deepEqual(result.rows[0].result,{});
 assert.equal((await db.query('select age_band from private.account_eligibility where user_id=$1',[E])).rows[0].age_band,'teen');
 const replay=await as('supabase_auth_admin',null,tx=>tx.query('select public.check_tkdflow_enrollment($1::jsonb) as result',[JSON.stringify(payload)]));assert.equal(replay.rows[0].result.error.http_code,403);
 const expired=token+'-expired',expiredHash=createHash('sha256').update(expired).digest('hex');
 await as('service_role',null,tx=>tx.query("select public.issue_enrollment($1,'adult')",[expiredHash]));
 await db.query("update private.enrollment_tickets set expires_at=now()-interval '1 minute' where ticket_hash=$1",[expiredHash]);
 const expiredResult=await as('supabase_auth_admin',null,tx=>tx.query('select public.check_tkdflow_enrollment($1::jsonb) as result',[JSON.stringify({...payload,user:{...payload.user,user_metadata:{enrollment_ticket:expired}}})]));
 assert.equal(expiredResult.rows[0].result.error.http_code,403);
 const google=await as('supabase_auth_admin',null,tx=>tx.query('select public.check_tkdflow_enrollment($1::jsonb) as result',[JSON.stringify({user:{id:E,app_metadata:{provider:'google'},user_metadata:{}}})]));assert.equal(google.rows[0].result.error.http_code,403);
 await assert.rejects(anon(tx=>tx.query("select public.issue_enrollment('forged','adult')")),/permission denied/);
 await assert.rejects(user(B,tx=>tx.query("update private.account_eligibility set age_band='adult'")),/permission denied/);
});

test('only adults submit, new content is private pending moderation, and profile edits cannot grant posting',async()=>{
 const count=(await anon(tx=>tx.query('select count(*) from public.discussion_topics'))).rows[0].count;assert.equal(Number(count),9);
 await assert.rejects(user(B,tx=>tx.query("select public.submit_discussion('A valid title','A sufficiently long body for the proposed discussion.','general')")),/Adult enrollment/);
 await user(B,tx=>tx.query('update public.profiles set age=20 where id=$1',[B]));
 await assert.rejects(user(B,tx=>tx.query("select public.submit_discussion('A valid title','Changing an editable profile must not grant adult rights.','general')")),/Adult enrollment/);
 topicId=(await user(A,tx=>tx.query("select public.submit_discussion('Compare curriculum versions','How should I identify the reference edition when comparing two sequences?','forms-discussion') as id"))).rows[0].id;
 assert.equal((await anon(tx=>tx.query('select id from public.discussion_topics where id=$1',[topicId]))).rows.length,0);
 assert.equal((await user(A,tx=>tx.query('select id from public.discussion_topics where id=$1',[topicId]))).rows.length,1);
 await assert.rejects(anon(tx=>tx.query('select author_id from public.discussion_topics')),/permission denied/);
 await assert.rejects(user(A,tx=>tx.query("update public.discussion_topics set status='published' where id=$1",[topicId])),/permission denied/);
 await assert.rejects(user(A,tx=>tx.query("select public.submit_discussion('Another title','Rapid duplicate submissions should be limited by the server.','general')")),/wait before posting/);
});

test('moderation publishes topics and replies; minors can report published content privately',async()=>{
 await assert.rejects(user(A,tx=>tx.query('select public.discussion_queue()')),/Moderator only/);
 await user(M,tx=>tx.query("select public.moderate_discussion('topic',$1,'published')",[topicId]));
 assert.equal((await anon(tx=>tx.query('select id from public.discussion_topics where id=$1',[topicId]))).rows.length,1);
 replyId=(await user(A,tx=>tx.query("select public.reply_discussion($1,'Use the specific form name and reference edition.') as id",[topicId]))).rows[0].id;
 assert.equal((await anon(tx=>tx.query('select id from public.discussion_replies where id=$1',[replyId]))).rows.length,0);
 await user(M,tx=>tx.query("select public.moderate_discussion('reply',$1,'published')",[replyId]));
 assert.equal((await anon(tx=>tx.query('select id from public.discussion_replies where id=$1',[replyId]))).rows.length,1);
 await user(B,tx=>tx.query("select public.report_discussion('reply',$1,'Please check this reply for a guideline issue.')",[replyId]));
 await assert.rejects(user(B,tx=>tx.query('select * from public.discussion_reports')),/permission denied/);
 await user(M,tx=>tx.query("select public.moderate_discussion('topic',$1,'rejected')",[topicId]));
 assert.equal((await anon(tx=>tx.query('select id from public.discussion_replies where id=$1',[replyId]))).rows.length,0);
});

test('the age endpoint validates numbers before enrollment and bounds request bodies',async()=>{
 assert.equal(enrollmentBand(12),'ineligible');assert.equal(enrollmentBand(13),'teen');assert.equal(enrollmentBand(18),'adult');
 for(const age of ['18',18.5,0,-1,null,121])assert.equal(enrollmentBand(age),null);
 assert.deepEqual(await readSmallJson(new Request('https://example.test',{method:'POST',body:'{"age":18}'})),{age:18});
 await assert.rejects(()=>readSmallJson(new Request('https://example.test',{method:'POST',body:'x'.repeat(300)})),/too large/);
});
