import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b',C='00000000-0000-4000-8000-00000000000c';let db;
async function as(id,sql,args=[]){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);await tx.exec('set local role '+(id?'authenticated':'anon'));return tx.query(sql,args);});}
const get=async(who,expected=who)=>(await as(who,'select public.my_learning($1) as data',[expected])).rows[0].data;
const set=async(who,{form='taegeuk-1',saved=null,pose=null,count=null,practise=null,reset=false,expected=who}={})=>(await as(who,'select public.set_learning($1,$2,$3,$4,$5,$6,$7) as data',[expected,form,saved,pose,count,practise,reset])).rows[0].data;
before(async()=>{db=new PGlite();await db.exec(read('supabase/tests/auth-shim.sql'));await db.exec('alter table auth.users add column email_confirmed_at timestamptz default now()');await db.exec(read('supabase-setup.sql'));await db.exec(read('supabase/community.sql'));await db.exec(read('supabase/learning.sql'));
 for(const [id,name,age]of [[A,'adult',30],[B,'teen',16],[C,'unconfirmed',35]]){await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,name+'@example.test',id===C?null:new Date()]);await db.query("insert into public.profiles(id,full_name,username,age,belt_level) values($1,$2,$2,$3,'White Belt (10th Gup)')",[id,name,age]);}
 await db.query('insert into private.community_moderators values($1)',[A]);
});after(async()=>{await db?.close();});
test('migration reruns preserve private saved forms and profiles',async()=>{await set(A,{saved:true,pose:4,count:20});await db.exec(read('supabase/learning.sql'));assert.equal((await get(A)).records[0].last_pose,4);assert.equal(Number((await db.query('select count(*) from public.profiles')).rows[0].count),3);});
test('anonymous callers, unconfirmed accounts and a different account ID cannot access or change learning',async()=>{
 for(const action of [()=>get(null,A),()=>get(A,B),()=>set(A,{expected:B,saved:true}),()=>get(C),()=>set(C,{saved:true})])await assert.rejects(action(),/permission denied|sign-in changed|Confirm your email/);
});
test('teen members can save private learning and moderators have no access to their study records',async()=>{
 await set(B,{saved:true,pose:7,count:20});assert.equal((await get(B)).records[0].last_pose,7);assert.equal((await get(A)).records[0].last_pose,4);
 await assert.rejects(get(A,B),/sign-in changed/);for(const who of [null,A,B])await assert.rejects(as(who,'select * from public.member_learning'),/permission denied/);
 assert.equal((await as(B,'select public.discussion_access() as data')).rows[0].data.adult,false);
});
test('patch writes keep bookmarks and practice independent, and no end-position write certifies practice',async()=>{
 await set(B,{pose:19,count:20});let record=(await get(B)).records[0];assert.equal(record.saved,true);assert.equal(record.practised,false);
 await set(B,{practise:true});await set(B,{saved:false});record=(await get(B)).records[0];assert.equal(record.practised,true);assert.equal(record.last_pose,19);
});
test('invalid lessons, invalid pose bounds and missing pose counts are denied',async()=>{
 for(const input of [{form:'unknown',saved:true},{pose:-1,count:20},{pose:20,count:20},{pose:2},{count:20},{pose:1,count:201}])await assert.rejects(set(B,input),/Unknown lesson|Invalid pose/);
});
test('clearing progress preserves a saved form and deleting an auth user cascades only their learning',async()=>{
 await set(B,{saved:true});await set(B,{reset:true});let record=(await get(B)).records[0];assert.equal(record.saved,true);assert.equal(record.last_pose,null);assert.equal(record.practised,false);
 await set(B,{saved:false});assert.equal((await get(B)).records.length,0);
 await set(B,{saved:true});await db.query('delete from auth.users where id=$1',[B]);assert.equal(Number((await db.query('select count(*) from public.member_learning where user_id=$1',[B])).rows[0].count),0);assert.equal((await get(A)).records.length,1);
});
test('a reset coalesced with a new study position clears prior practise while retaining the new pose',async()=>{
 await set(A,{practise:true});await set(A,{reset:true,pose:2,count:20});const record=(await get(A)).records[0];assert.equal(record.last_pose,2);assert.equal(record.practised,false);assert.equal(record.saved,true);
});


test('the cloud smoke probe uses the confirmed owner and rolls back every study change',async()=>{
 const before=JSON.stringify((await db.query('select * from public.member_learning order by user_id,form_id')).rows);
 await db.exec(read('supabase/tests/learning-probe.sql').replace('__TKDFLOW_QA_OWNER_EMAIL__','adult@example.test'));
 assert.equal(JSON.stringify((await db.query('select * from public.member_learning order by user_id,form_id')).rows),before);
});
