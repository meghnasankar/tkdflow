/* Community paging by the full (created_at, id) keyset.
   - Cursor and syntax: exact cursor strings (microseconds and offset kept,
     never via Date), validation, and the exact emitted PostgREST query.
   - Oracle: the real client walks every page against PGlite with the real
     schema and row security, as anonymous; a test-only reader parses the
     client's actual URL into SQL. The walk must equal a plain ordered SELECT:
     every published row once, in order, including more than a page of identical
     timestamps and rows a microsecond apart. Unpublished rows never appear.
   - Controller: later pages append, a deep-linked topic is not duplicated and
     doesn't move the cursor, failures keep what is shown, and late answers
     after a refresh or an account switch are discarded. */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {PAGE,cursorOf,keysetFilter,pageOf,appendPage,listTopics,listReplies,TOPIC_COLUMNS,REPLY_COLUMNS} from '../js/lib/discussions.js';
import {publicTopics,publicReplies,publicTopicRow} from '../js/lib/public-discussions.js';
import {createCommunityConnection} from '../js/lib/community-connection.js';
import {SessionGuard} from '../js/lib/auth-flows.js';
import {INELIGIBLE,ELIGIBLE} from '../js/lib/age-gate.js';
import {parseQuery,toSql} from './helpers/postgrest-filter.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cfg={enabled:true,supabaseUrl:'https://exampleproject.supabase.co',supabaseAnonKey:'sb_publishable_TESTONLYexampleKEY123456'};
const ID='0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

/* ── cursor and syntax ─────────────────────────────────────────────── */

test('cursors keep the server’s exact timestamp and refuse unsafe values',()=>{
 const at='2026-11-18T12:00:00.123456+00:00';
 assert.deepEqual(cursorOf({created_at:at,id:ID.toUpperCase()}),{created_at:at,id:ID},'microseconds and offset verbatim; id lower-cased');
 for(const ok of ['2026-11-18T12:00:00+00:00','2026-11-18T12:00:00.1Z','2026-11-18T17:30:00.000001+05:30','2026-11-18T07:00:00.5-05:00'])assert.ok(cursorOf({created_at:ok,id:ID}),ok);
 for(const bad of ['2026-11-18T12:00:00','2026-11-18 12:00:00+00:00','2026-11-18T12:00:00.1234567+00:00','2026-11-18T12:00:00+0000','2026-11-18T12:00:00Z",id.gt.x','2026-11-18T12:00:00Z)',1700000000000,null])
  assert.equal(cursorOf({created_at:bad,id:ID}),null,String(bad));
 for(const bad of ['not-a-uuid',`${ID},x`,'',null])assert.equal(cursorOf({created_at:at,id:bad}),null,String(bad));
});

test('the keyset filter is exact in both directions, with the timestamp quoted',()=>{
 const c={created_at:'2026-11-18T12:00:00.000001+00:00',id:ID};
 assert.equal(keysetFilter(c,'desc'),`created_at.lt."2026-11-18T12:00:00.000001+00:00",and(created_at.eq."2026-11-18T12:00:00.000001+00:00",id.lt.${ID})`);
 assert.equal(keysetFilter(c,'asc'),`created_at.gt."2026-11-18T12:00:00.000001+00:00",and(created_at.eq."2026-11-18T12:00:00.000001+00:00",id.gt.${ID})`);
 assert.equal(keysetFilter({created_at:'2026-11-18T12:00:00',id:ID},'desc'),null);
});

test('public requests emit the exact PostgREST query, percent-encoded, and refuse a bad cursor before fetching',async()=>{
 const calls=[],fetchImpl=async url=>{calls.push(url);return {ok:true,json:async()=>[]};};
 const after={created_at:'2026-11-18T12:00:00.000001+00:00',id:ID};
 await publicTopics({cfg,fetchImpl});
 await publicTopics({cfg,fetchImpl,after});
 await publicReplies(ID,{cfg,fetchImpl,after});
 const q=u=>new URL(u).search;
 assert.equal(q(calls[0]),`?select=${encodeURIComponent(TOPIC_COLUMNS)}&status=eq.published&order=created_at.desc%2Cid.desc&limit=51`);
 assert.equal(q(calls[1]),`?select=${encodeURIComponent(TOPIC_COLUMNS)}&status=eq.published&or=%28created_at.lt.%222026-11-18T12%3A00%3A00.000001%2B00%3A00%22%2Cand%28created_at.eq.%222026-11-18T12%3A00%3A00.000001%2B00%3A00%22%2Cid.lt.${ID}%29%29&order=created_at.desc%2Cid.desc&limit=51`);
 assert.equal(q(calls[2]),`?select=${encodeURIComponent(REPLY_COLUMNS)}&topic_id=eq.${ID}&status=eq.published&or=%28created_at.gt.%222026-11-18T12%3A00%3A00.000001%2B00%3A00%22%2Cand%28created_at.eq.%222026-11-18T12%3A00%3A00.000001%2B00%3A00%22%2Cid.gt.${ID}%29%29&order=created_at.asc%2Cid.asc&limit=51`);
 assert.equal(parseQuery(calls[1]).logic.items[0].value,'2026-11-18T12:00:00.000001+00:00','the + survives (not decoded as a space)');
 const r=await publicTopics({cfg,fetchImpl,after:{created_at:new Date('2026-11-18T12:00:00Z'),id:ID}});
 assert.equal(r.error.code,'cursor');assert.equal(calls.length,3,'a Date or other unsafe cursor is never sent');
});

test('account reads use the same keyset through the SDK',async()=>{
 const log=[];
 const q={select:()=>q,eq:(k,v)=>(log.push(['eq',k,v]),q),or:f=>(log.push(['or',f]),q),order:(c,o)=>(log.push(['order',c,o.ascending]),q),limit:n=>(log.push(['limit',n]),q),then:(a,b)=>Promise.resolve({data:[],error:null}).then(a,b)};
 const client={from:t=>(log.push(['from',t]),q)};
 const after={created_at:'2026-11-18T12:00:00.5+00:00',id:ID};
 await listTopics(client,{after});
 assert.deepEqual(log,[['from','discussion_topics'],['eq','status','published'],['or',keysetFilter(after,'desc')],['order','created_at',false],['order','id',false],['limit',PAGE+1]]);
 log.length=0;await listReplies(client,ID,{after});
 assert.deepEqual(log,[['from','discussion_replies'],['eq','topic_id',ID],['eq','status','published'],['or',keysetFilter(after,'asc')],['order','created_at',true],['order','id',true],['limit',PAGE+1]]);
});

test('a page’s cursor comes from the raw rows consumed, so an invalid row never causes a skip',()=>{
 const rows=Array.from({length:PAGE+1},(_,i)=>({id:uuid(i+1),created_at:'2026-11-18T12:00:00+00:00',ok:i!==PAGE-1}));
 const page=pageOf(rows,r=>r.ok?r:null);
 assert.equal(page.data.length,PAGE-1,'the invalid row is dropped');
 assert.equal(page.hasMore,true);
 assert.deepEqual(page.cursor,{created_at:'2026-11-18T12:00:00+00:00',id:uuid(PAGE)},'cursor is the last consumed row, valid or not');
 assert.deepEqual(pageOf(rows.slice(0,3)).hasMore,false);
 assert.deepEqual(appendPage([{id:'A'},{id:'b'}],[{id:'a'},{id:'c'}]).map(r=>r.id),['A','b','c']);
});

/* ── PGlite oracle: the real client, the real schema and row security ── */

let db;
before(async()=>{
 db=new PGlite();
 await db.exec(read('supabase/tests/auth-shim.sql'));await db.exec('create role supabase_auth_admin nologin;');
 await db.exec(read('supabase-setup.sql'));await db.exec(read('supabase/community.sql'));
 await db.exec("set timezone='UTC'");
 const at=['2026-11-18 12:00:00+00','2026-11-18 12:00:00.000001+00','2026-11-18 12:00:00.000002+00','2026-11-18 17:30:00.000003+05:30','2026-11-18 07:00:00.000004-05:00'];
 const topics=[];
 // 70 published topics share one exact timestamp (more than a page); others are a microsecond apart.
 for(let i=1;i<=130;i++)topics.push([uuid(i),i<=70?at[0]:at[1+(i%4)],i%13===0?'pending':i%17===0?'rejected':'published']);
 for(const [id,created,status] of topics)await db.query("insert into public.discussion_topics(id,category,title,body,author_handle,status,created_at) values($1,'general','Synthetic paging topic','Synthetic body long enough for the check.','pager',$2,$3::timestamptz)",[id,status,created]);
 for(let i=1;i<=130;i++)await db.query("insert into public.discussion_replies(id,topic_id,body,author_handle,status,created_at) values($1,$2,'Synthetic reply body.','helper',$3,$4::timestamptz)",[uuid(1000+i),uuid(1),i%11===0?'pending':'published',i<=60?at[0]:at[1+(i%4)]]);
});
after(()=>db?.close());

/** A REST endpoint backed by PGlite, answering as the anonymous role. */
const restFetch=calls=>async url=>{
 calls.push(url);const q=parseQuery(url),{text,params}=toSql(q,q.select);
 const rows=await db.transaction(async tx=>{await tx.exec('set local role anon');return (await tx.query(text,params)).rows;});
 return {ok:true,json:async()=>rows};
};
async function walk(fetchPage){
 const ids=[];let r=await fetchPage(null),pages=1;
 assert.equal(r.error,null);ids.push(...r.data.map(x=>x.id));
 while(r.hasMore){r=await fetchPage(r.cursor);pages++;assert.equal(r.error,null);ids.push(...r.data.map(x=>x.id));assert.ok(pages<20,'terminates');}
 return {ids,pages};
}
const oracle=async(sql,params=[])=>(await db.transaction(async tx=>{await tx.exec('set local role anon');return (await tx.query(sql,params)).rows;})).map(r=>r.id);

test('walking every topic page as anonymous gives each published topic once, newest first, across identical timestamps',async()=>{
 const calls=[];
 const {ids,pages}=await walk(after=>publicTopics({cfg,fetchImpl:restFetch(calls),...(after?{after}:{})}));
 const expected=await oracle("select id from public.discussion_topics order by created_at desc, id desc");
 assert.ok(expected.length>2*PAGE,'enough published topics for three pages');
 assert.deepEqual(ids,expected);assert.equal(new Set(ids).size,ids.length);assert.equal(pages,Math.ceil(expected.length/PAGE));
 const hidden=(await db.query("select id from public.discussion_topics where status<>'published'")).rows.map(r=>r.id);
 assert.ok(hidden.length>0);for(const id of hidden)assert.ok(!ids.includes(id),'unpublished topics never appear');
 assert.ok(calls.some(u=>/created_at\.eq\.%2220\d\d/.test(u)),'a later page continued inside the tie');
});

test('walking every reply page ascending gives each published reply once, oldest first',async()=>{
 const {ids}=await walk(after=>publicReplies(uuid(1),{cfg,fetchImpl:restFetch([]),...(after?{after}:{})}));
 assert.deepEqual(ids,await oracle("select id from public.discussion_replies where topic_id=$1 order by created_at asc, id asc",[uuid(1)]));
 assert.ok(ids.length>2*PAGE);
});

test('the same instant written with another offset, or a microsecond away, continues correctly',async()=>{
 const first=await publicTopics({cfg,fetchImpl:restFetch([])});
 const m=first.cursor.created_at.match(/^(\d{4}-\d\d-\d\d)T12:00:(\d\d\.\d{6})\+00:00$/);
 assert.ok(m,`the server’s own string with microseconds (${first.cursor.created_at})`);
 const shifted={created_at:`${m[1]}T17:30:${m[2]}+05:30`,id:first.cursor.id};
 const a=await publicTopics({cfg,fetchImpl:restFetch([]),after:first.cursor}),b=await publicTopics({cfg,fetchImpl:restFetch([]),after:shifted});
 assert.deepEqual(b.data.map(r=>r.id),a.data.map(r=>r.id),'an equal instant in another offset is the same position');
 const micro=await oracle("select id from public.discussion_topics where created_at='2026-11-18 12:00:00.000001+00' order by id desc");
 const after1=await publicTopics({cfg,fetchImpl:restFetch([]),after:{created_at:'2026-11-18T12:00:00.000002+00:00',id:uuid(1)}});
 assert.deepEqual(after1.data.map(r=>r.id).slice(0,micro.length),micro,'rows one microsecond older follow, none skipped');
});

/* ── controller ────────────────────────────────────────────────────── */

const topic=(n,over={})=>({id:uuid(n),category:'general',title:`Synthetic topic ${n} title`,body:'Synthetic body long enough for checks.',author_handle:'pager',editorial:false,status:'published',created_at:'2026-11-18T12:00:00+00:00',...over});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
/** Pages of topics newest-id first; `gate` holds a later page until released. */
function reader(total,{gate=null,fail=0}={}){
 const all=Array.from({length:total},(_,i)=>topic(total-i)),calls=[];let failures=fail;
 const topics=async({after}={})=>{
  calls.push(after);
  if(after&&gate)await gate.promise;
  if(after&&failures>0){failures--;return {data:null,error:{code:'failed'},hasMore:false,cursor:null};}
  const start=after?all.findIndex(t=>t.id===after.id)+1:0;
  return pageOf(all.slice(start,start+PAGE+1));
 };
 return {topics,topic:async id=>({data:all.find(t=>t.id===id)||null,error:null}),replies:async()=>({data:[],error:null}),calls,all};
}
const publicConnection=(publicReader,{selected=null}={})=>{
 const states=[];const account={getService:()=>{throw new Error('the account service must not start for an under-13 tab');}};
 const c=createCommunityConnection({eligibility:{read:()=>INELIGIBLE},account,publicReader,selected:()=>selected,onState:(s,e)=>states.push([s,e]),schedule:fn=>fn()});
 return {c,states};
};

test('Load more appends the next page; a deep-linked older topic is listed once and never moves the cursor',async()=>{
 const r=reader(120),old=uuid(5);                       // topic 5 is on the third page
 const {c,states}=publicConnection(r,{selected:old});
 await c.connect();
 let s=c.state;
 assert.equal(s.topics.length,PAGE+1,'first page plus the deep-linked topic');
 assert.equal(s.topics.at(-1).id,old);assert.equal(s.loaded,PAGE+1,'loaded counts every distinct topic shown');
 assert.deepEqual(s.more.cursor,cursorOf(r.all[PAGE-1]),'cursor from the feed page, not the deep-linked topic');
 await c.loadMore();await c.loadMore();
 s=c.state;
 const ids=s.topics.map(t=>t.id);
 assert.deepEqual(ids,r.all.map(t=>t.id),'every topic once, in feed order, the deep-linked one in its own place');
 assert.equal(s.more.hasMore,false);
 const added=states.filter(([,e])=>e.moreDone).map(([,e])=>e.added.length);
 assert.deepEqual(added,[PAGE,120-2*PAGE-1],'the second page adds 19 new topics; the already shown deep link is not re-added');
});

test('a failed page keeps every topic, says so and can be retried; two clicks make one request',async()=>{
 const r=reader(80,{fail:1});const {c}=publicConnection(r);
 await c.connect();const shown=c.state.topics.map(t=>t.id);
 const [first,second]=[c.loadMore(),c.loadMore()];
 assert.equal(await second,null,'ignored while a page is loading');
 await first;
 assert.deepEqual(c.state.topics.map(t=>t.id),shown,'nothing shown is dropped');
 assert.equal(c.state.more.status,'error');assert.equal(c.state.more.hasMore,true);
 await c.loadMore();
 assert.equal(c.state.topics.length,80);assert.equal(c.state.more.status,'idle');
 assert.equal(r.calls.filter(Boolean).length,2,'one failed request, one retry');
});

test('a page answered after a refresh is discarded',async()=>{
 const gate=deferred(),r=reader(80,{gate});const {c}=publicConnection(r);
 await c.connect();
 const pending=c.loadMore();
 await c.connect();                                    // Refresh while the page is in flight
 gate.resolve();await pending;
 assert.equal(c.state.topics.length,PAGE,'the late page did not append to the refreshed feed');
 assert.equal(c.state.more.status,'idle');
});

test('a page answered after an account switch is discarded',async()=>{
 const gate=deferred(),r=reader(80,{gate}),guard=new SessionGuard();
 const client={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
 const account={getService:async()=>({status:'ready',client}),currentSession:async()=>({session:{user:{id:'adult-a'}},error:null}),
  discussionAccess:async()=>({data:{adult:true,moderator:false},error:null}),listTopics:(cl,opts)=>r.topics(opts),publishedTopic:async()=>({data:null,error:null})};
 const c=createCommunityConnection({eligibility:{read:()=>ELIGIBLE},account,publicReader:{},guard,schedule:()=>{}});
 await c.connect();assert.equal(c.state.mode,'account');
 const pending=c.loadMore();
 guard.switchTo('adult-b');                            // another account signed in
 gate.resolve();await pending;
 assert.equal(c.state.topics.length,PAGE,'nothing from the old account’s request was appended');
});

test('rows failing the public check are dropped without losing the next page',async()=>{
 const rows=Array.from({length:PAGE+1},(_,i)=>topic(200-i,i===PAGE-1?{title:'short'}:{}));
 const page=pageOf(rows,publicTopicRow);
 assert.equal(page.data.length,PAGE-1);assert.equal(page.cursor.id,uuid(200-(PAGE-1)));
});
