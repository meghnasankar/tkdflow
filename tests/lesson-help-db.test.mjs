/* Lesson help questions, moderator review and curated public FAQ, exercised
   in an embedded Postgres with the real migrations and Supabase-like roles. */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createFormMotion} from '../js/animation/form-motion.js';
import {POSES as TAEGEUK_1} from '../js/lessons/taegeuk-1-data.js';
import {FORM_IDS} from '../js/lib/learning-model.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const id=n=>`00000000-0000-4000-8000-0000000000${n}`;
const MOD=id('a1'),TEEN=id('b2'),UNCONFIRMED=id('c3'),CHILD=id('d4'),NOPROFILE=id('e5'),ADULT=id('f6'),UNKNOWN=id('a7');
let db;
async function as(who,sql,args=[]){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[who||'']);await tx.exec('set local role '+(who?'authenticated':'anon'));return tx.query(sql,args);});}
const one=async(who,sql,args)=>(await as(who,sql,args)).rows[0].data;
const access=who=>one(who,'select public.lesson_help_access() as data');
const ask=(who,{lesson='taegeuk-2',pose=4,body='How far apart should my feet be in this stance?',request=randomUUID(),account=who}={})=>one(who,'select public.submit_lesson_question($1,$2,$3,$4,$5) as data',[account,lesson,pose,body,request]);
const mine=(who,account=who)=>one(who,'select public.my_lesson_questions($1) as data',[account]);
const queue=(who,lesson=null,status='open',account=who)=>one(who,'select public.lesson_help_queue($1,$2,$3) as data',[account,lesson,status]);
const setStatus=(who,q,s,account=who)=>one(who,'select public.set_lesson_question_status($1,$2,$3) as data',[account,q,s]);
const reply=(who,q,body,request=randomUUID(),account=who)=>one(who,'select public.reply_lesson_question($1,$2,$3,$4) as data',[account,q,body,request]);
const group=(who,q,key,account=who)=>one(who,'select public.group_lesson_question($1,$2,$3) as data',[account,q,key]);
const admin=(who,lesson=null,account=who)=>one(who,'select public.lesson_faq_admin($1,$2) as data',[account,lesson]);
const saveFaq=(who,{entry=null,lesson='taegeuk-2',pose=4,question='Why does the back foot turn out in a front stance?',answer='Turning the back foot out a little keeps the hips square and the stance stable. Ask your instructor about the angle your school uses.',url=null,label=null,credit='team',version=null,request=randomUUID(),live=false,account=who}={})=>
 one(who,'select public.save_lesson_faq($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as data',[account,entry,lesson,pose,question,answer,url,label,credit,version,request,live]);
const publish=(who,entry,on,version,account=who)=>one(who,'select public.set_lesson_faq_published($1,$2,$3,$4) as data',[account,entry,on,version]);
const publicFaq=(who=null,lesson=null,search=null)=>one(who,'select public.public_lesson_faq($1,$2) as data',[lesson,search]);
const age=async(sql)=>{await db.exec(sql);};

before(async()=>{
 db=new PGlite();
 await db.exec(read('supabase/tests/auth-shim.sql'));
 await db.exec('alter table auth.users add column email_confirmed_at timestamptz default now()');
 for(const f of ['supabase-setup.sql','supabase/community.sql','supabase/learning.sql','supabase/lesson-help.sql'])await db.exec(read(f));
 const people=[[MOD,'moderator',30,'adult'],[TEEN,'teen',16,'teen'],[UNCONFIRMED,'unconfirmed',35,'adult'],[ADULT,'adult',40,null],[UNKNOWN,'unknown',null,null]];
 for(const [who,name,years,band] of people){
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[who,name+'@example.test',who===UNCONFIRMED?null:new Date()]);
  await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,$2,$2,$3,'White Belt (10th Gup)')",[who,name,years]);
  if(band)await db.query('insert into private.account_eligibility(user_id,age_band) values($1,$2)',[who,band]);
 }
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[CHILD,'child@example.test',NOPROFILE,'noprofile@example.test']);
 // A legacy under-13 profile predates the 13–99 rule (NOT VALID still checks new rows).
 const rule=(await db.query("select conname,pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.profiles'::regclass and conname like 'profiles_age%'")).rows;
 for(const r of rule)await db.exec(`alter table public.profiles drop constraint ${r.conname}`);
 await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,'child','child',11,'White Belt (10th Gup)')",[CHILD]);
 for(const r of rule)await db.exec(`alter table public.profiles add constraint ${r.conname} ${r.def.replace(/ NOT VALID$/,'')} not valid`);
 await db.query('insert into private.community_moderators values($1)',[MOD]);
});
after(async()=>{await db?.close();});

test('canonical pose counts in SQL match every lesson animation',async()=>{
 for(const lesson of FORM_IDS){
  const expected=lesson==='taegeuk-1'?TAEGEUK_1.length:createFormMotion(JSON.parse(read(`data/lessons/${lesson}.json`))).POSES.length;
  assert.equal((await db.query('select private.lesson_pose_count($1) as n',[lesson])).rows[0].n,expected,lesson);
 }
 assert.equal(FORM_IDS.length,23);
 assert.equal((await db.query("select private.lesson_pose_count('not-a-form') as n")).rows[0].n,null);
});

test('access explains each account state without exposing private details',async()=>{
 assert.deepEqual(await access(MOD),{version:1,member:true,reason:null,moderator:true});
 assert.deepEqual(await access(TEEN),{version:1,member:true,reason:null,moderator:false});
 assert.equal((await access(ADULT)).member,true,'a recorded profile age of 13+ is enough');
 assert.equal((await access(UNCONFIRMED)).reason,'confirm-email');
 assert.equal((await access(NOPROFILE)).reason,'complete-profile');
 assert.equal((await access(CHILD)).reason,'under-13');
 assert.equal((await access(UNKNOWN)).reason,'age-unconfirmed');
 await assert.rejects(access(null),/permission denied/);
});

test('guests, unconfirmed, incomplete, under-13 and unconfirmed-age accounts cannot ask',async()=>{
 await assert.rejects(ask(null,{account:TEEN}),/permission denied/);
 await assert.rejects(ask(UNCONFIRMED),/Confirm your email/);
 await assert.rejects(ask(NOPROFILE),/Complete your profile/);
 await assert.rejects(ask(CHILD),/aged 13 and over/);
 await assert.rejects(ask(UNKNOWN),/aged 13 and over/);
 await assert.rejects(mine(CHILD),/aged 13 and over/);
 assert.equal(Number((await db.query('select count(*) from public.lesson_help_questions')).rows[0].count),0);
});

test('a teen can ask privately without gaining public posting rights',async()=>{
 const result=await ask(TEEN,{body:'Should my fist turn over at the very end of the low block?',pose:3});
 assert.equal(result.duplicate,false);
 assert.equal(result.question.status,'submitted');
 assert.equal(result.question.pose_count,25);
 assert.equal((await one(TEEN,'select public.discussion_access() as data')).adult,false);
 await assert.rejects(as(TEEN,"select public.submit_discussion('A public teen topic','This should never become a public post.','general')"),/Adult enrollment required/);
 assert.equal(Number((await db.query('select count(*) from public.discussion_topics')).rows[0].count),0);
 assert.equal(Number((await db.query('select count(*) from public.lesson_faq_entries')).rows[0].count),0,'nothing is published automatically');
});

test('members see only their own questions; switching accounts mid-request is refused',async()=>{
 await ask(ADULT,{lesson:'koryo',pose:0,body:'Is the ready stance for Koryo different from the Taegeuk ready stance?'});
 const teen=await mine(TEEN),adult=await mine(ADULT);
 assert.equal(teen.questions.length,1);assert.equal(adult.questions.length,1);
 assert.notEqual(teen.questions[0].id,adult.questions[0].id);
 for(const row of [...teen.questions,...adult.questions])assert.deepEqual(Object.keys(row).sort(),['body','created_at','id','lesson_id','pose_count','pose_index','replies','status','updated_at']);
 await assert.rejects(mine(TEEN,ADULT),/sign-in changed/);
 await assert.rejects(ask(TEEN,{account:ADULT}),/sign-in changed/);
 for(const who of [null,TEEN,MOD])for(const table of ['lesson_help_questions','lesson_help_replies','lesson_help_events','lesson_faq_entries','lesson_faq_revisions'])
  await assert.rejects(as(who,`select * from public.${table}`),/permission denied/,`${table} must not be readable directly`);
 await assert.rejects(as(TEEN,"insert into public.lesson_help_questions(author_id,request_id,lesson_id,body) values($1,gen_random_uuid(),'koryo','direct insert attempt')",[TEEN]),/permission denied/);
});

test('lesson, pose and text are validated on the server',async()=>{
 const bad=[
  [{lesson:'unknown-form'},/Unknown lesson/],[{lesson:'taegeuk-1',pose:20},/Invalid pose/],[{pose:-1},/Invalid pose/],
  [{body:'too short'},/10 to 1000 characters/],[{body:'x'.repeat(1001)},/10 to 1000 characters/],
  [{body:'Bell character \u0007 in the question text'},/unsupported characters/],[{request:null},/Missing request ID/],
 ];
 for(const [input,error] of bad)await assert.rejects(ask(ADULT,input),error,JSON.stringify(input).slice(0,60));
 await db.exec("update public.lesson_help_questions set created_at=now()-interval '1 minute'");
 const whole=await ask(ADULT,{lesson:'chon-ji',pose:null,body:'   Where does Chon-Ji start on the floor?   '});
 assert.equal(whole.question.pose_index,null);assert.equal(whole.question.pose_count,null);
 assert.equal(whole.question.body,'Where does Chon-Ji start on the floor?','text is trimmed');
 const markup=await (async()=>{await db.exec("update public.lesson_help_questions set created_at=now()-interval '1 minute'");return ask(ADULT,{lesson:'chon-ji',pose:2,body:'<img src=x onerror=alert(1)> is this <b>the</b> right block?'});})();
 assert.equal(markup.question.body,'<img src=x onerror=alert(1)> is this <b>the</b> right block?','stored verbatim; rendered as plain text by the client');
});

test('retries and repeated questions are not stored twice; bursts are limited',async()=>{
 await db.exec("update public.lesson_help_questions set created_at=now()-interval '2 hours'");
 const request=randomUUID(),body='Which hand is on top when the arms cross in the chamber?';
 const first=await ask(ADULT,{lesson:'taegeuk-3',pose:6,body,request}),retry=await ask(ADULT,{lesson:'taegeuk-3',pose:6,body,request});
 assert.equal(first.duplicate,false);assert.equal(retry.duplicate,true);assert.equal(retry.question.id,first.question.id);
 await assert.rejects(ask(ADULT,{lesson:'taegeuk-3',pose:6,body:'A different question with a reused request.',request}),/already used/);
 const repeated=await ask(ADULT,{lesson:'taegeuk-3',pose:6,body:'which hand is on top when the arms  cross in the chamber?'});
 assert.equal(repeated.duplicate,true);assert.equal(repeated.question.id,first.question.id);
 await db.exec("update public.lesson_help_questions set created_at=created_at-interval '1 minute'");
 const otherPose=await ask(ADULT,{lesson:'taegeuk-3',pose:7,body});
 assert.equal(otherPose.duplicate,false,'the same wording at another pose is a separate question');
 assert.equal(otherPose.question.pose_index,7);assert.notEqual(otherPose.question.id,first.question.id);
 const wholeForm=await (async()=>{await db.exec("update public.lesson_help_questions set created_at=created_at-interval '1 minute'");return ask(ADULT,{lesson:'taegeuk-3',pose:null,body});})();
 assert.equal(wholeForm.duplicate,false);assert.equal(wholeForm.question.pose_index,null);
 await assert.rejects(ask(ADULT,{lesson:'taegeuk-3',body:'A second, different question sent immediately afterwards.'}),/Please wait/);
 await db.exec("update public.lesson_help_questions set created_at=now()-interval '2 hours'");
 for(let i=0;i<5;i++){await ask(ADULT,{lesson:'taegeuk-4',body:`Different question number ${i} about this lesson.`});await db.exec("update public.lesson_help_questions set created_at=created_at-interval '20 seconds' where created_at>now()-interval '1 minute'");}
 await assert.rejects(ask(ADULT,{lesson:'taegeuk-4',body:'One more question beyond the hourly limit.'}),/Please wait/);
});

test('only community moderators can open the review queue, which hides member identity',async()=>{
 for(const who of [TEEN,ADULT])await assert.rejects(queue(who),/Moderator only/);
 await assert.rejects(queue(null),/permission denied/);
 const all=await queue(MOD,null,'all');
 assert.ok(all.questions.length>=5);
 const text=JSON.stringify(all);
 for(const secret of [TEEN,ADULT,'@example.test','White Belt','teen','adult'])assert.ok(!text.includes(secret),`queue leaks ${secret}`);
 for(const row of all.questions){assert.match(row.member,/^Member [0-9A-F]{6}$/);assert.ok(!('author_id' in row));}
 const teenLabel=all.questions.find(q=>q.lesson_id==='taegeuk-2').member;
 assert.ok(all.questions.filter(q=>q.lesson_id==='taegeuk-4').every(q=>q.member!==teenLabel),'different members get different labels');
 assert.ok((await queue(MOD,'taegeuk-2')).questions.every(q=>q.lesson_id==='taegeuk-2'));
 await assert.rejects(queue(MOD,'bogus'),/Unknown lesson/);
 await assert.rejects(queue(MOD,null,'deleted'),/Invalid status filter/);
 // Two open questions on the same lesson pose form a recurring group.
 await db.exec("update public.lesson_help_questions set created_at=now()-interval '2 hours'");
 await ask(TEEN,{lesson:'taegeuk-2',pose:3,body:'Is the low block finished above the front knee or the thigh?'});
 const groups=(await queue(MOD,'taegeuk-2')).groups;
 assert.deepEqual(groups.map(g=>[g.key,Number(g.count)]),[['pose-4',2]]);
});

test('moderators reply privately and move questions through allowed states, with an audit trail',async()=>{
 const target=(await mine(TEEN)).questions.find(q=>q.pose_index===3);
 await assert.rejects(reply(ADULT,target.id,'Not a moderator'),/Moderator only/);
 await assert.rejects(setStatus(TEEN,target.id,'resolved'),/Moderator only/);
 const request=randomUUID(),sent=await reply(MOD,target.id,'Finish it about a fist above the front thigh; check with your instructor.',request);
 assert.equal(sent.status,'reviewed');
 assert.equal((await reply(MOD,target.id,'Finish it about a fist above the front thigh; check with your instructor.',request)).duplicate,true);
 await assert.rejects(reply(MOD,target.id,'A different reply that reuses the request ID.',request),/already used for a different reply/);
 const seen=(await mine(TEEN)).questions.find(q=>q.id===target.id);
 assert.equal(seen.status,'reviewed');assert.equal(seen.replies.length,1);
 assert.deepEqual(Object.keys(seen.replies[0]).sort(),['body','created_at','id'],'no moderator identity reaches the member');
 assert.equal((await mine(ADULT)).questions.some(q=>q.id===target.id),false);
 assert.equal((await setStatus(MOD,target.id,'resolved')).changed,true);
 assert.equal((await setStatus(MOD,target.id,'resolved')).changed,false);
 await assert.rejects(setStatus(MOD,target.id,'submitted'),/Invalid status/);
 assert.equal((await setStatus(MOD,target.id,'closed')).status,'closed');
 await assert.rejects(setStatus(MOD,target.id,'resolved'),/cannot move/);
 await assert.rejects(reply(MOD,target.id,'Replying to a closed question'),/Reopen/);
 assert.equal((await setStatus(MOD,target.id,'reviewed')).status,'reviewed');
 await assert.rejects(group(MOD,target.id,'Bad Key!'),/lowercase/);
 assert.equal((await group(MOD,target.id,'low-block-height')).topic_key,'low-block-height');
 const events=(await db.query('select action,from_status,to_status,actor_id from public.lesson_help_events where question_id=$1 order by id',[target.id])).rows;
 assert.deepEqual(events.map(e=>[e.action,e.from_status,e.to_status]),[['submitted',null,'submitted'],['reply',null,null],['status','submitted','reviewed'],['status','reviewed','resolved'],['status','resolved','closed'],['status','closed','reviewed'],['group',null,null]]);
 assert.ok(events.slice(1).every(e=>e.actor_id===MOD));
});

test('FAQ answers are curated separately, credited accurately and public only when published',async()=>{
 await assert.rejects(saveFaq(TEEN),/Moderator only/);
 await assert.rejects(saveFaq(ADULT),/Moderator only/);
 const created=await saveFaq(MOD,{credit:'handle',url:'https://www.kukkiwon.or.kr/eng/main',label:'Kukkiwon'});
 assert.equal(created.entry.status,'draft');assert.equal(created.entry.credit,'@moderator');
 assert.equal((await publicFaq()).entries.length,0,'drafts are not public');
 await assert.rejects(publish(MOD,created.entry.id,true,99),/changed since you opened it/);
 const published=await publish(MOD,created.entry.id,true,1);
 assert.equal(published.status,'published');
 const visible=(await publicFaq()).entries;
 assert.equal(visible.length,1);
 assert.deepEqual(Object.keys(visible[0]).sort(),['answer','credit','id','lesson_id','pose_count','pose_index','published_at','question','source_label','source_url','updated_at']);
 const text=JSON.stringify(visible);
 for(const secret of [MOD,'moderator@','draft','Which hand is on top','Member '])assert.ok(!text.includes(secret),`public FAQ leaks ${secret}`);
 assert.equal((await publicFaq(TEEN,'taegeuk-2')).entries.length,1,'signed-in members read the same public fields');
 assert.equal((await publicFaq(null,'koryo')).entries.length,0);
 assert.equal((await publicFaq(null,null,'BACK FOOT')).entries.length,1,'search is case-insensitive');
 assert.equal((await publicFaq(null,null,'%')).entries.length,0,'wildcards are literal');
 await assert.rejects(publicFaq(null,'nope'),/Unknown lesson/);
});

test('FAQ edits are versioned and audited; unpublishing hides an entry',async()=>{
 const entry=(await admin(MOD)).entries[0];
 assert.equal(entry.version,2);
 await assert.rejects(saveFaq(MOD,{entry:entry.id,version:1,question:'A stale edit from an old tab should fail.'}),/changed since you opened it/);
 const request=randomUUID();
 await assert.rejects(saveFaq(MOD,{entry:entry.id,version:2,question:'Why does the back foot turn outward in a front stance?'}),/This answer is public/,'a live edit must be confirmed');
 assert.equal((await publicFaq()).entries[0].question,'Why does the back foot turn out in a front stance?','an unconfirmed edit changes nothing');
 const edited=await saveFaq(MOD,{entry:entry.id,version:2,question:'Why does the back foot turn outward in a front stance?',request,live:true});
 assert.equal(edited.entry.version,3);assert.equal(edited.entry.status,'published','a confirmed edit updates the public answer');
 assert.equal((await saveFaq(MOD,{entry:entry.id,version:2,question:'Why does the back foot turn outward in a front stance?',request,live:true})).duplicate,true,'a retried save is not applied twice');
 await assert.rejects(saveFaq(MOD,{entry:entry.id,version:2,question:'A changed payload reusing the same request ID.',request,live:true}),/already used for a different answer/);
 assert.equal((await publicFaq()).entries[0].question,'Why does the back foot turn outward in a front stance?');
 assert.equal((await publish(MOD,entry.id,false,3)).status,'unpublished');
 assert.equal((await publicFaq()).entries.length,0);
 const listed=(await admin(MOD,'taegeuk-2')).entries[0];
 assert.deepEqual(listed.revisions.map(r=>[r.version,r.action,r.by_you]),[[4,'unpublished',true],[3,'edited',true],[2,'published',true],[1,'created',true]]);
 const snapshots=(await db.query('select snapshot from public.lesson_faq_revisions where faq_id=$1 order by id',[entry.id])).rows;
 assert.equal(snapshots[0].snapshot.question,'Why does the back foot turn out in a front stance?','the original wording is kept in the audit trail');
 await assert.rejects(admin(ADULT),/Moderator only/);
 await assert.rejects(publish(ADULT,entry.id,true,4),/Moderator only/);
});

test('FAQ references must be safe https links and fields are bounded',async()=>{
 const bad=[
  [{url:'javascript:alert(1)'},/https:\/\//],[{url:'http://example.com/page'},/https:\/\//],[{url:'https://user:pass@example.com/'},/https:\/\//],
  [{url:'https://example.com/a b'},/https:\/\//],[{url:'https://localhost/'},/https:\/\//],[{url:'https://example.com/"onmouseover="x'},/https:\/\//],
  [{url:'https://example.com/'+'a'.repeat(500)},/https:\/\//],[{label:'Label without a link'},/reference link/],
  [{question:'short'},/10 to 300/],[{answer:'Too short.'},/20 to 4000/],[{credit:'instructor'},/credit/],
  [{lesson:'taegeuk-9'},/Unknown lesson/],[{pose:40},/Invalid pose/],[{request:null},/Missing request ID/],
 ];
 for(const [input,error] of bad)await assert.rejects(saveFaq(MOD,input),error,JSON.stringify(input).slice(0,60));
 const ok=await saveFaq(MOD,{url:'https://en.wikipedia.org/wiki/Taegeuk_(taekwondo)#Poomsae',label:'Background reading',pose:null,lesson:'taegeuk-1'});
 assert.equal(ok.entry.source_url,'https://en.wikipedia.org/wiki/Taegeuk_(taekwondo)#Poomsae');
 assert.equal(ok.entry.pose_index,null);
});

test('deleting accounts removes private questions and keeps public FAQ credit accurate',async()=>{
 const teenQuestions=Number((await db.query('select count(*) from public.lesson_help_questions where author_id=$1',[TEEN])).rows[0].count);
 assert.ok(teenQuestions>0);
 await db.query('delete from auth.users where id=$1',[TEEN]);
 assert.equal(Number((await db.query('select count(*) from public.lesson_help_questions where author_id=$1',[TEEN])).rows[0].count),0);
 assert.equal(Number((await db.query("select count(*) from public.lesson_help_replies r where not exists(select 1 from public.lesson_help_questions q where q.id=r.question_id)")).rows[0].count),0);
 const before=(await db.query('select count(*) from public.lesson_faq_entries')).rows[0].count;
 await db.query('delete from auth.users where id=$1',[MOD]);
 assert.equal((await db.query('select count(*) from public.lesson_faq_entries')).rows[0].count,before,'FAQ entries survive; their creator becomes null');
 assert.equal(Number((await db.query('select count(*) from public.lesson_faq_entries where created_by is not null')).rows[0].count),0);
});

test('reapplying the migration keeps questions, replies and FAQ history',async()=>{
 const counts=async()=>(await db.query('select (select count(*) from public.lesson_help_questions) q,(select count(*) from public.lesson_help_events) e,(select count(*) from public.lesson_faq_entries) f,(select count(*) from public.lesson_faq_revisions) r')).rows[0];
 const beforeCounts=await counts();
 await db.exec(read('supabase/lesson-help.sql'));
 assert.deepEqual(await counts(),beforeCounts);
 await assert.rejects(as(ADULT,'select * from public.lesson_help_questions'),/permission denied/);
});

test('the staging probe uses the confirmed owner placeholder and rolls back every change, including a temporary moderator role',async()=>{
 const owner=id('b8'),prodOwner=id('b9');
 for(const [who,name] of [[owner,'owner'],[prodOwner,'prodowner']]){
  await db.query("insert into auth.users(id,email) values($1,$2)",[who,name+'@example.test']);
  await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,$2,$2,35,'White Belt (10th Gup)')",[who,name]);
  await db.query('insert into private.account_eligibility values($1,$2)',[who,'adult']);
 }
 await db.query('insert into private.community_moderators values($1)',[prodOwner]);
 const snapshot=async()=>JSON.stringify((await db.query("select (select json_agg(q order by id) from public.lesson_help_questions q) a,(select json_agg(f order by id) from public.lesson_faq_entries f) b,(select count(*) from public.lesson_help_events) c,(select count(*) from public.lesson_faq_revisions) d,(select json_agg(user_id order by user_id) from private.community_moderators) e")).rows);
 const beforeProbe=await snapshot();
 const probe=read('supabase/tests/lesson-help-probe.sql');
 assert.match(probe,/__TKDFLOW_QA_OWNER_EMAIL__/);
 assert.match(probe,/explicit approval/);
 assert.equal(Number((await db.query('select count(*) from private.community_moderators where user_id=$1',[owner])).rows[0].count),0,'staging-like owner starts without a moderator role');
 await db.exec(probe.replace('__TKDFLOW_QA_OWNER_EMAIL__','owner@example.test'));
 assert.equal(await snapshot(),beforeProbe,'temporary role and probe data are gone; other roles unchanged');
 await db.exec(probe.replace('__TKDFLOW_QA_OWNER_EMAIL__','prodowner@example.test'));
 assert.equal(await snapshot(),beforeProbe,'an owner who already moderates keeps exactly that role');
 await assert.rejects(db.exec(probe),/Expected one confirmed owner/,'the unedited placeholder matches nobody');
 await db.exec('rollback');
 assert.equal(await snapshot(),beforeProbe);
});

test('pose checks reject half-filled pose context even for privileged writes',async()=>{
 const base="insert into public.lesson_help_questions(author_id,request_id,lesson_id,pose_index,pose_count,body) values($1,gen_random_uuid(),'taegeuk-2',$2,$3,'Direct table write that bypasses the functions.')";
 for(const [index,count] of [[null,25],[3,null],[3,24],[25,25]])await assert.rejects(db.query(base,[ADULT,index,count]),/lesson_help_pose/,`${index}/${count}`);
 const faq="insert into public.lesson_faq_entries(create_request_id,last_request_id,lesson_id,pose_index,pose_count,question,answer,credit) values(gen_random_uuid(),gen_random_uuid(),'taegeuk-2',$1,$2,'A direct question that bypasses checks?','A direct answer that bypasses the save function checks.','TKDflow moderators')";
 for(const [index,count] of [[null,25],[3,null]])await assert.rejects(db.query(faq,[index,count]),/lesson_faq_pose/,`faq ${index}/${count}`);
 const defs=(await db.query("select conname,pg_get_constraintdef(oid) d from pg_constraint where conname in ('lesson_help_pose','lesson_faq_pose')")).rows;
 assert.equal(defs.length,2);for(const r of defs)assert.match(r.d,/pose_index IS NOT NULL\) AND \(pose_count IS NOT NULL/);
});

test('moderator calls are bound to the account the page loaded with',async()=>{
 const mod2=id('c9');
 await db.query("insert into auth.users(id,email) values($1,'mod2@example.test')",[mod2]);
 await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,'mod2','mod2',45,'White Belt (10th Gup)')",[mod2]);
 await db.query('insert into private.community_moderators values($1)',[mod2]);
 const q=(await queue(mod2,null,'all')).questions[0];
 const stale=ADULT;
 for(const call of [()=>queue(mod2,null,'all',stale),()=>setStatus(mod2,q.id,'resolved',stale),()=>reply(mod2,q.id,'A reply from a switched session',randomUUID(),stale),
  ()=>group(mod2,q.id,'switched',stale),()=>admin(mod2,null,stale),()=>saveFaq(mod2,{account:stale}),()=>publish(mod2,randomUUID(),true,1,stale)])
  await assert.rejects(call(),/sign-in changed/);
 await assert.rejects(queue(null,null,'all',mod2),/permission denied/);
 const audit=(await db.query("select count(*) from public.lesson_help_events where actor_id=$1",[mod2])).rows[0].count;
 assert.equal(Number(audit),0,'no switched-session write was recorded');
});

test('FAQ create retries return the original entry and refuse a changed payload',async()=>{
 const mod3=id('d1');
 await db.query("insert into auth.users(id,email) values($1,'mod3@example.test')",[mod3]);
 await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,'mod3','mod3',45,'White Belt (10th Gup)')",[mod3]);
 await db.query('insert into private.community_moderators values($1)',[mod3]);
 const request=randomUUID(),payload={lesson:'koryo',pose:1,request,question:'What does the opening hand position in Koryo mean?',answer:'The opening hand position is a ready posture; schools explain its meaning differently, so ask your instructor.'};
 const first=await saveFaq(mod3,payload),retry=await saveFaq(mod3,payload);
 assert.equal(first.duplicate,false);assert.equal(retry.duplicate,true);assert.equal(retry.entry.id,first.entry.id);
 for(const change of [{question:'A different question with the same request?'},{pose:2},{url:'https://example.com/ref'},{credit:'handle'}])
  await assert.rejects(saveFaq(mod3,{...payload,...change}),/already used for a different answer/,JSON.stringify(change));
 assert.equal(Number((await db.query('select count(*) from public.lesson_faq_entries where create_request_id=$1',[request])).rows[0].count),1);
});

test('editing another moderator’s answer keeps its public credit unless the editor explicitly changes it',async()=>{
 const author=id('e1'),editor=id('e2');
 for(const [who,name] of [[author,'author'],[editor,'editor']]){
  await db.query('insert into auth.users(id,email) values($1,$2)',[who,name+'@example.test']);
  await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,$2,$2,40,'White Belt (10th Gup)')",[who,name]);
  await db.query('insert into private.community_moderators values($1)',[who]);
 }
 const created=await saveFaq(author,{lesson:'jitae',pose:null,credit:'handle'});
 assert.equal(created.entry.credit,'@author');
 await assert.rejects(saveFaq(author,{lesson:'jitae',pose:null,credit:'keep'}),/Choose how to credit/,'a new answer has no credit to keep');
 const kept=await saveFaq(editor,{entry:created.entry.id,version:1,lesson:'jitae',pose:null,credit:'keep',answer:'A corrected answer from a second moderator that keeps the original credit.'});
 assert.equal(kept.entry.credit,'@author','a small edit does not re-attribute the answer');
 const changed=await saveFaq(editor,{entry:created.entry.id,version:2,lesson:'jitae',pose:null,credit:'handle'});
 assert.equal(changed.entry.credit,'@editor','changing credit is an explicit choice');
 const team=await saveFaq(editor,{entry:created.entry.id,version:3,lesson:'jitae',pose:null,credit:'team'});
 assert.equal(team.entry.credit,'TKDflow moderators');
 await assert.rejects(saveFaq(editor,{entry:created.entry.id,version:4,lesson:'jitae',pose:null,credit:'@author'}),/Choose how to credit/,'arbitrary credit text is never accepted');
 const actors=(await db.query('select actor_id,action from public.lesson_faq_revisions where faq_id=$1 order by id',[created.entry.id])).rows;
 assert.deepEqual(actors.map(a=>[a.action,a.actor_id]),[['created',author],['edited',editor],['edited',editor],['edited',editor]],'the audit trail records who edited');
});

test('the probe resets each denial flag and inspects its own synthetic row',()=>{
 const probe=read('supabase/tests/lesson-help-probe.sql');
 const lines=probe.split('\n');
 lines.forEach((line,i)=>{if(/exception when insufficient_privilege then denied:=true/.test(line))assert.match(lines[i-1],/denied:=false;/,`line ${i+1} needs its own reset`);});
 assert.doesNotMatch(probe,/like '%@%'/,'no whole-payload @ scan');
 assert.match(probe,/jsonb_object_keys\(qrow\)/);
});
