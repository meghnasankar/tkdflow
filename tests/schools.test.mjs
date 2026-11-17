import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { filterSchools, schoolChoices, loadSchoolDirectory, reviewSchool } from '../js/lib/school-directory.js';
import { validateProfileInput, diffProfile, pendingProfileFrom } from '../js/lib/profile-model.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const A='00000000-0000-4000-8000-00000000000a', B='00000000-0000-4000-8000-00000000000b',M='00000000-0000-4000-8000-00000000000c';
const schools=[{id:'osm/node/1',name:'Élan Taekwondo',country:'FR',region:'Île-de-France',city:'Paris'}, {id:'osm/node/2',name:'Harbor Taekwondo',country:'US',region:'New Jersey',city:'Somerset'}, {id:'osm/node/3',name:'Harbor Taekwondo',country:'US',region:'California',city:'San Jose'}];
let db;
before(async()=>{
 db=new PGlite();await db.exec(read('supabase/tests/auth-shim.sql'));await db.exec(read('supabase-setup.sql'));await db.exec(read('supabase/community.sql'));
 for(const [id,name]of [[A,'member_a'],[B,'member_b'],[M,'reviewer']])await db.query('insert into auth.users(id,email)values($1,$2)',[id,name+'@example.test']);
 // Legacy private names are queued on upgrade, without publication.
 await db.query("insert into public.profiles(id,full_name,username,belt_level,school_name)values($1,'Member A','member_a','White Belt (10th Gup)','Legacy School')",[A]);
 // Prove the new migration also removes old column-level insertion permission.
 await db.exec('grant insert(name) on public.schools to authenticated;');
 await db.exec(read('supabase/school-directory.sql'));await db.exec(read('supabase/school-directory.sql'));
 await db.query('insert into private.school_reviewers values($1)',[M]);
});
after(async()=>{await db?.close();});
async function as(role,id,fn){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);await tx.exec(`set local role ${role}`);return fn(tx);});}
const user=(id,fn)=>as('authenticated',id,fn),anon=fn=>as('anon',null,fn);

test('school search handles accents, country names, multiple terms and separate campuses',()=>{
 assert.equal(filterSchools(schools,{query:'elan france'})[0].id,'osm/node/1');
 assert.equal(filterSchools(schools,{country:'US',region:'New Jersey',city:'Somerset'}).length,1);
 assert.equal(filterSchools(schools,{query:'harbor'}).length,2);
 const many=Array.from({length:150},(_,i)=>({...schools[0],id:'osm/node/'+i,name:'School '+String(i).padStart(3,'0')}));
 const page=schoolChoices(many,{},'osm/node/149');assert.equal(page.total,150);assert.equal(page.rows.length,101);assert.equal(page.rows[0].id,'osm/node/149');
 assert.equal(schoolChoices(schools,{country:'FR'},'osm/node/2').rows[0].id,'osm/node/2');
});
test('directory uses the database after review and a labelled first-party snapshot on network failure',async()=>{
 const snapshot={ok:true,json:async()=>({schools,countries:['FR','US'],importedAt:'2026-11-17'})};
 const offline=await loadSchoolDirectory({from(){throw new Error('offline');}},async()=>snapshot);assert.equal(offline.offline,true);assert.equal(offline.rows.length,3);
 const client={from:()=>({select:()=>({order:()=>({range:()=>({data:[],error:null})})})})};
 const empty=await loadSchoolDirectory(client,async()=>snapshot);assert.equal(empty.offline,false);assert.deepEqual(empty.rows,[]);
});
test('structured school selections survive confirmation and profile differences',()=>{
 const raw={full_name:'Member A',username:'member_a',belt_level:'White Belt (10th Gup)',school_choice:'School One',school_directory_id:'osm/node/4',school_country:'US',school_region:'NJ',school_city:'Somerset',school_website:'https://school.example'};
 const {values,errors}=validateProfileInput(raw);assert.deepEqual(errors,{});
 assert.equal(pendingProfileFrom({user_metadata:{pending_profile:values}}).values.school_directory_id,'osm/node/4');
 assert.deepEqual(diffProfile(values,{...values,school_directory_id:'osm/node/5'}),{school_directory_id:'osm/node/5'});
 assert.ok(validateProfileInput({...raw,school_choice:'__new__',school_new:'New School',school_country:'',school_city:'',school_website:'javascript:bad'}).errors.school_country);
 assert.ok(validateProfileInput({...raw,school_choice:'__new__',school_new:'New School',school_website:'javascript:bad'}).errors.school_website);
});
test('legacy suggestions migrate once, stay private and cannot be read or approved by ordinary members',async()=>{
 assert.equal((await db.query('select count(*) from private.school_suggestions')).rows[0].count,1);
 assert.equal((await anon(tx=>tx.query('select count(*) from public.school_directory'))).rows[0].count,0);
 await assert.rejects(anon(tx=>tx.query('select * from private.school_suggestions')),/permission denied/);
 await assert.rejects(user(B,tx=>tx.query('select public.school_review_queue()')),/Moderator only/);
 await assert.rejects(anon(tx=>tx.query('select public.school_review_queue()')),/permission denied/);
 await assert.rejects(user(B,tx=>tx.query("insert into public.schools(name)values('Injected School')")),/permission denied/);
 const result=(await user(A,tx=>tx.query('select public.school_submission_status() as value'))).rows[0].value;
 assert.equal(result.name,'Legacy School');assert.equal(result.status,'pending');assert.equal('submitted_by' in result,false);
 const queue=(await user(M,tx=>tx.query('select public.school_review_queue() as value'))).rows[0].value;
 assert.equal('submitted_by' in queue[0],false);
});
test('saving a custom school atomically queues business details and preserves a private membership',async()=>{
 await user(B,tx=>tx.query("insert into public.profiles(id,full_name,username,belt_level,school_name,school_country,school_city,school_website)values($1,'Member B','member_b','White Belt (10th Gup)','New Dojang','US','Somerset','https://dojang.example')",[B]));
 await user(B,tx=>tx.query("update public.profiles set full_name='Member Bee' where id=$1",[B]));
 assert.equal((await db.query('select count(*) from private.school_suggestions where submitted_by=$1',[B])).rows[0].count,1);
 assert.equal((await anon(tx=>tx.query("select name from public.school_directory where name='New Dojang'"))).rows.length,0);
 assert.equal((await user(A,tx=>tx.query('select school_name from public.profiles where id=$1',[B]))).rows.length,0);
 await assert.rejects(user(B,tx=>tx.query("insert into public.school_directory(id,name,source_url,source)values('bad','Injected','https://bad.example','user')")),/permission denied/);
});
test('review approval checks a public reference, publishes only business details and links the unchanged private profile',async()=>{
 const suggestion=(await db.query('select id from private.school_suggestions where submitted_by=$1',[B])).rows[0].id;
 const details={name:'New Dojang',country:'US',region:'New Jersey',city:'Somerset',website:'https://dojang.example',source_url:'https://dojang.example'};
 await assert.rejects(user(B,tx=>tx.query("select public.review_school($1,'approved',$2::jsonb)",[suggestion,JSON.stringify(details)])),/Moderator only/);
 await assert.rejects(user(M,tx=>tx.query("select public.review_school($1,'approved',$2::jsonb)",[suggestion,JSON.stringify({...details,source_url:'javascript:bad'})])),/public reference/);
 const id=(await user(M,tx=>tx.query("select public.review_school($1,'approved',$2::jsonb) as id",[suggestion,JSON.stringify(details)]))).rows[0].id;
 const rows=(await anon(tx=>tx.query('select * from public.school_directory'))).rows;assert.equal(rows.length,1);assert.equal(rows[0].id,id);assert.equal('submitted_by' in rows[0],false);
 assert.equal((await user(B,tx=>tx.query('select school_directory_id,school_region from public.profiles'))).rows[0].school_directory_id,id);
 await assert.rejects(user(M,tx=>tx.query("select public.review_school($1,'approved',$2::jsonb)",[suggestion,JSON.stringify(details)])),/already reviewed/);
 // A member cannot relabel a canonical campus through profile fields.
 await user(B,tx=>tx.query("update public.profiles set school_name='Forged',school_city='Fake' where id=$1",[B]));
 const profile=(await user(B,tx=>tx.query('select school_name,school_city from public.profiles'))).rows[0];assert.deepEqual(profile,{school_name:'New Dojang',school_city:'Somerset'});
});
test('rejection preserves the private profile, and approval does not overwrite a later selection',async()=>{
 const legacy=(await db.query('select id from private.school_suggestions where submitted_by=$1',[A])).rows[0].id;
 await user(A,tx=>tx.query("update public.profiles set school_name='Different School',school_country='FR',school_city='Paris' where id=$1",[A]));
 const existing=(await db.query('select id from public.school_directory limit 1')).rows[0].id;
 await user(M,tx=>tx.query("select public.review_school($1,'approved',$2::jsonb)",[legacy,JSON.stringify({existing_id:existing})]));
 assert.equal((await user(A,tx=>tx.query('select school_name from public.profiles'))).rows[0].school_name,'Different School');
 const latest=(await db.query("select id from private.school_suggestions where submitted_by=$1 and status='pending'",[A])).rows[0].id;
 await user(M,tx=>tx.query("select public.review_school($1,'rejected','{}'::jsonb)",[latest]));
 assert.equal((await user(A,tx=>tx.query('select school_name from public.profiles'))).rows[0].school_name,'Different School');
});
test('school submissions are rate-limited and direct suggestion-table writes are denied',async()=>{
 await assert.rejects(user(A,tx=>tx.query("insert into private.school_suggestions(submitted_by,name)values($1,'Injected')",[A])),/permission denied/);
 for(let i=0;i<3;i++)await user(A,tx=>tx.query('update public.profiles set school_name=$1 where id=$2',['Other School '+i,A]));
 await assert.rejects(user(A,tx=>tx.query("update public.profiles set school_name='Too many schools' where id=$1",[A])),/wait a day/);
 assert.notEqual((await user(A,tx=>tx.query('select school_name from public.profiles'))).rows[0].school_name,'Too many schools');
});
test('review client sends only the review arguments; authorship remains server-controlled',async()=>{
 let call;await reviewSchool({rpc:(...args)=>{call=args;return {data:'ok',error:null};}},'id','approved',{name:'School'});
 assert.deepEqual(call,['review_school',{suggestion_id:'id',decision:'approved',details:{name:'School'}}]);
});

test('the sourced snapshot imports cleanly and reruns preserve administrator corrections',async()=>{
 const snapshot=JSON.parse(read('data/schools.json'));assert.equal(snapshot.schools.length,334);assert.equal(new Set(snapshot.schools.map(s=>s.id)).size,334);assert.equal(new Set(snapshot.schools.map(s=>s.country)).size,63);
 assert.equal(snapshot.license,'ODbL-1.0');assert.match(snapshot.coverage,/Not a complete registry/);
 for(const s of snapshot.schools){assert.ok(snapshot.countries.includes(s.country));assert.match(s.source_url,/^https:\/\//);assert.equal(s.license,'ODbL-1.0');assert.equal('submitted_by' in s,false);assert.equal('email' in s,false);}
 await db.exec(read('supabase/school-directory-seed.sql'));
 const sample=snapshot.schools[0].id;
 await db.query('update public.school_directory set active=false where id=$1',[sample]);
 await db.exec(read('supabase/school-directory-seed.sql'));
 assert.equal((await db.query('select active from public.school_directory where id=$1',[sample])).rows[0].active,false);
 assert.equal((await anon(tx=>tx.query('select id from public.school_directory where id=$1',[sample]))).rows.length,0);
});

test('school-review permission grants no forum moderation or private-profile access',async()=>{
 assert.equal((await user(M,tx=>tx.query('select public.school_review_access() as allowed'))).rows[0].allowed,true);
 assert.equal((await user(A,tx=>tx.query('select public.school_review_access() as allowed'))).rows[0].allowed,false);
 assert.equal((await user(M,tx=>tx.query('select public.discussion_access() as access'))).rows[0].access.moderator,false);
 await assert.rejects(user(M,tx=>tx.query('select public.discussion_queue()')),/Moderator only/);
 assert.equal((await user(M,tx=>tx.query('select id from public.profiles where id=$1',[B]))).rows.length,0);
 await assert.rejects(user(A,tx=>tx.query('insert into private.school_reviewers values($1)',[A])),/permission denied/);
 await assert.rejects(anon(tx=>tx.query('select public.school_review_access()')),/permission denied/);
});
