/* Community reading for a known under-13 tab: published discussions are read
   statelessly, the account service never starts (not even from a page
   restored by Back), and no member control is offered. Adult, teen and
   moderator flows keep the account path. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {publicTopics,publicGuides,publicTopic,publicReplies,publicUrl,publicTopicRow,CATEGORIES} from '../js/lib/public-discussions.js';
import {publicRequest} from '../js/lib/public-read.js';
import {createCommunityConnection,communityControls,NOTICES} from '../js/lib/community-connection.js';
import {TOPIC_COLUMNS,REPLY_COLUMNS} from '../js/lib/discussions.js';
import {SessionGuard} from '../js/lib/auth-flows.js';
import {INELIGIBLE,ELIGIBLE} from '../js/lib/age-gate.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cfg={enabled:true,supabaseUrl:'https://exampleproject.supabase.co',supabaseAnonKey:'sb_publishable_TESTONLYexampleKEY123456'};
const T1='11111111-2222-4333-8444-555555555555',T2='22222222-2222-4333-8444-555555555555',T3='33333333-2222-4333-8444-555555555555',R1='44444444-2222-4333-8444-555555555555';
const topic=(id,over={})=>({id,category:'technique-qa',title:'How do I chamber a side kick?',body:'Looking for tips on the chamber position before the kick.',author_handle:'kicker',editorial:false,status:'published',created_at:'2026-11-17T10:00:00Z',...over});
const reply=(id,topicId,over={})=>({id,topic_id:topicId,body:'Lift the knee higher first.',author_handle:'coachless',status:'published',created_at:'2026-11-17T11:00:00Z',...over});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const fakeFetch=(answer)=>{const calls=[];const f=async(url,init)=>{calls.push({url,init});return typeof answer==='function'?answer(url,init):{ok:true,json:async()=>answer};};f.calls=calls;return f;};
const sqlGrant=(table)=>read('supabase/community.sql').match(new RegExp(`grant select\\(([^)]+)\\) on public\\.${table} to anon`))[1];

/* ── stateless reader ─────────────────────────────────────────────── */

test('public reads request exactly the columns anonymous readers are granted, with no session or cookie',async()=>{
 assert.equal(TOPIC_COLUMNS,sqlGrant('discussion_topics'));assert.equal(REPLY_COLUMNS,sqlGrant('discussion_replies'));
 assert.deepEqual(CATEGORIES,read('supabase/community.sql').match(/category in \(([^)]+)\)/)[1].split(',').map(s=>s.replace(/'/g,'')));
 const f=fakeFetch([topic(T1)]);
 const result=await publicTopics({cfg,fetchImpl:f});
 assert.equal(result.error,null);assert.equal(result.data.length,1);
 const url=new URL(f.calls[0].url);
 assert.equal(url.origin+url.pathname,'https://exampleproject.supabase.co/rest/v1/discussion_topics');
 assert.deepEqual(Object.fromEntries(url.searchParams),{select:TOPIC_COLUMNS,status:'eq.published',order:'created_at.desc',limit:'100'});
 const init=f.calls[0].init;
 assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');assert.equal(init.referrerPolicy,'no-referrer');
 assert.deepEqual(Object.keys(init.headers).sort(),['accept','apikey'],'no Authorization, session or content-type');
 assert.equal(init.body,undefined);
 const guides=fakeFetch([]);await publicGuides({cfg,fetchImpl:guides});
 assert.equal(new URL(guides.calls[0].url).searchParams.get('editorial'),'eq.true');
 const replies=fakeFetch([reply(R1,T1)]);await publicReplies(T1,{cfg,fetchImpl:replies});
 assert.deepEqual(Object.fromEntries(new URL(replies.calls[0].url).searchParams),{select:REPLY_COLUMNS,topic_id:`eq.${T1}`,status:'eq.published',order:'created_at.asc',limit:'100'});
});

test('rows are reduced to the public allowlist and checked against the table’s constraints',async()=>{
 const rows=[
  topic(T1,{author_id:'aaaaaaaa-2222-4333-8444-555555555555',email:'x@example.com'}),
  topic(T2,{status:'pending'}),topic(T3,{category:'secret'}),topic('not-a-uuid'),
  topic(T1,{title:'short'}),topic(T1,{body:'x'.repeat(8001)}),topic(T1,{editorial:'yes'}),topic(T1,{created_at:'never'}),
 ];
 const result=await publicTopics({cfg,fetchImpl:fakeFetch(rows)});
 assert.equal(result.data.length,1);assert.equal(result.dropped,rows.length-1);
 assert.deepEqual(Object.keys(result.data[0]).sort(),TOPIC_COLUMNS.split(',').sort(),'author ids and anything else are stripped');
 const rs=await publicReplies(T1,{cfg,fetchImpl:fakeFetch([reply(R1,T1),reply(R1,T2),reply(R1,T1,{status:'rejected'}),reply(R1,T1,{body:'no'})])});
 assert.equal(rs.data.length,1,'replies for another topic, unpublished or too short are dropped');
 assert.equal(publicTopicRow(null),null);
});

test('topic ids are validated before any request; absent, failing and malformed responses are distinguished',async()=>{
 const none=fakeFetch([]);
 for(const id of ['', 'abc', `${T1}&status=eq.pending`, '../x', null])assert.deepEqual(await publicTopic(id,{cfg,fetchImpl:none}),{data:null,error:null});
 assert.deepEqual(await publicReplies('nope',{cfg,fetchImpl:none}),{data:[],error:null});
 assert.equal(none.calls.length,0,'nothing is requested for an invalid id');
 assert.deepEqual(await publicTopic(T1,{cfg,fetchImpl:fakeFetch([])}),{data:null,error:null},'absent: pending, hidden or deleted');
 assert.equal((await publicTopic(T1,{cfg,fetchImpl:fakeFetch([topic(T1)])})).data.id,T1);
 assert.equal((await publicTopics({cfg,fetchImpl:fakeFetch({not:'an array'})})).error.code,'shape');
 assert.equal((await publicTopics({cfg,fetchImpl:async()=>({ok:false,status:503})})).error.code,'503');
 assert.equal((await publicTopics({cfg,fetchImpl:async()=>{throw new TypeError('Failed to fetch');}})).error.code,'network');
 let aborted=false;
 const slow=await publicTopics({cfg,ms:20,fetchImpl:(url,init)=>new Promise(()=>{init.signal.addEventListener('abort',()=>{aborted=true;});})});
 assert.equal(slow.error.code,'timeout');assert.ok(aborted,'the request is aborted');
 for(const bad of [{...cfg,enabled:false},{...cfg,supabaseUrl:'http://exampleproject.supabase.co'},{...cfg,supabaseUrl:'https://evil.example.com'},{...cfg,supabaseUrl:'https://u:p@exampleproject.supabase.co'},{...cfg,supabaseAnonKey:'sb_secret_x'}])
  assert.equal(publicUrl('discussion_topics',{},bad),null,JSON.stringify(bad));
 assert.equal(publicUrl('discussion_reports',{},cfg),null,'only the two public tables');
 const off=fakeFetch([]);assert.equal((await publicTopics({cfg:{...cfg,enabled:false},fetchImpl:off})).error.code,'unavailable');assert.equal(off.calls.length,0);
});

test('public lesson answers keep their request after the shared transport extraction',async()=>{
 assert.match(read('js/lib/public-faq.js'),/import \{publicBase,publicRequest\} from '\.\/public-read\.js';/);
 const f=fakeFetch({ok:1});
 await publicRequest('https://exampleproject.supabase.co/rest/v1/x',{cfg,fetchImpl:f,method:'POST',body:{a:1}});
 assert.deepEqual(Object.keys(f.calls[0].init.headers).sort(),['accept','apikey','content-type'],'a body adds only content-type');
 assert.equal(f.calls[0].init.body,'{"a":1}');
});

/* ── connection: modes, races and back/forward restore ────────────── */

function harness({eligibility=ELIGIBLE,sessionUser='adult-1',accessData={adult:true,moderator:true},selectedId=null,staticTopics=[]}={}){
 const elig={value:eligibility,read(){return this.value;}};
 const calls=[],states=[],extras=[],scheduled=[];
 const auth={listeners:[],unsubscribed:0,stopped:0,used:[],stopResult:()=>Promise.resolve(),
  onAuthStateChange(fn){auth.used.push('onAuthStateChange');auth.listeners.push(fn);return {data:{subscription:{unsubscribe(){auth.unsubscribed++;}}}};},
  stopAutoRefresh(){auth.used.push('stopAutoRefresh');auth.stopped++;return auth.stopResult();},
  startAutoRefresh(){auth.used.push('startAutoRefresh');},
  signOut(){auth.used.push('signOut');throw new Error('Community must never sign anyone out');}};
 const client={auth};
 const gates={service:null,session:null,topics:null,publicTopics:null};
 const wait=async(name,value)=>{calls.push(name);if(gates[name])await gates[name].promise;return value;};
 const account={
  getService:()=>wait('service',{status:'ready',client}),
  currentSession:()=>wait('session',{session:sessionUser?{user:{id:sessionUser}}:null,error:null}),
  discussionAccess:()=>wait('access',{data:accessData,error:null}),
  listTopics:()=>wait('topics',{data:[topic(T1,{title:'Account feed topic title'})],error:null}),
  publishedTopic:(c,id)=>wait('accountTopic',{data:topic(id),error:null}),
  listReplies:()=>wait('accountReplies',{data:[reply(R1,T1)],error:null}),
 };
 const publicReader={
  topics:()=>wait('publicTopics',{data:[topic(T1,{title:'Public feed topic title'})],error:null}),
  topic:(id)=>wait('publicTopic',{data:null,error:null}),
  replies:()=>wait('publicReplies',{data:[reply(R1,T1)],error:null}),
 };
 const guard=new SessionGuard();
 const connection=createCommunityConnection({eligibility:elig,account,publicReader,staticTopics,guard,selected:()=>selectedId,
  onState:(s,extra)=>{states.push(s);extras.push(extra);},schedule:fn=>scheduled.push(fn)});
 return {connection,elig,calls,states,extras,auth,gates,account,publicReader,guard,scheduled,last:()=>states.at(-1)};
}
const accountCalls=calls=>calls.filter(c=>['service','session','access','topics','accountTopic','accountReplies'].includes(c));

test('a known under-13 tab reads publicly and never starts the account service',async()=>{
 const h=harness({eligibility:INELIGIBLE});
 await h.connection.connect();
 assert.deepEqual(accountCalls(h.calls),[],'no service, session, access or feed call');
 assert.equal(h.auth.listeners.length,0,'no sign-in listener');
 const s=h.last();
 assert.equal(s.mode,'public');assert.equal(s.session,null);assert.deepEqual(s.access,{adult:false,moderator:false});assert.equal(s.client,null);
 assert.equal(s.notice,'public-ready');assert.match(NOTICES[s.notice],/posting and reporting are off/);
 assert.equal(s.topics[0].title,'Public feed topic title');
 assert.deepEqual(communityControls(s),{composer:false,moderation:false,report:false,submissions:false,signIn:false});
 await h.connection.replies(T1);assert.ok(h.calls.includes('publicReplies'));assert.ok(!h.calls.includes('accountReplies'));
});

test('eligible adults, teens and moderators keep the account path in its existing order',async()=>{
 const adult=harness();await adult.connection.connect();
 assert.deepEqual(adult.calls,['service','session','access','topics']);
 assert.equal(adult.auth.listeners.length,1);
 assert.deepEqual(communityControls(adult.last()),{composer:true,moderation:true,report:true,submissions:true,signIn:false});
 const teen=harness({accessData:{adult:false,moderator:false}});await teen.connection.connect();
 assert.deepEqual(communityControls(teen.last()),{composer:false,moderation:false,report:true,submissions:true,signIn:false},'teens read and report privately but do not post');
 const guest=harness({sessionUser:null});await guest.connection.connect();
 assert.deepEqual(guest.calls,['service','session','topics'],'signed-out visitors skip the access check');
 assert.equal(communityControls(guest.last()).signIn,true);
 await adult.connection.replies(T1);assert.ok(adult.calls.includes('accountReplies'));
});

test('Back to a cached page after the age screen recorded under 13 drops account state and reads publicly',async()=>{
 const h=harness();
 await h.connection.connect();
 const oldToken=h.guard.token();
 assert.equal(h.last().mode,'account');assert.equal(communityControls(h.last()).moderation,true);
 h.elig.value=INELIGIBLE;                          // the visitor went to the age screen in this tab
 assert.equal(h.connection.pageShown({persisted:false}),null,'a normal load already chose its mode');
 const before=h.calls.length;
 await h.connection.pageShown({persisted:true});
 assert.ok(h.extras.some(e=>e.privateCleared),'the page is told to clear private controls and data');
 assert.equal(h.auth.unsubscribed,1,'the old sign-in listener is unsubscribed');
 assert.equal(h.guard.isCurrent(oldToken),false,'late report, compose, reply or queue work is discarded');
 const s=h.last();
 assert.equal(s.mode,'public');assert.equal(s.session,null);assert.equal(s.client,null);
 assert.deepEqual(communityControls(s),{composer:false,moderation:false,report:false,submissions:false,signIn:false});
 assert.deepEqual(accountCalls(h.calls.slice(before)),[],'no account call after the switch');
 h.auth.listeners[0]('SIGNED_IN',{user:{id:'someone-else'}});   // an SDK callback that still fires
 assert.equal(h.scheduled.length,0,'a stale sign-in callback cannot restart the account client');
 assert.equal(h.last().mode,'public');
 assert.equal(await h.connection.pageShown({persisted:true}),null,'already public: nothing more to do');
});

test('a pending account connection is abandoned when the tab becomes public',async()=>{
 const h=harness();h.gates.service=deferred();
 const pending=h.connection.connect();             // waiting for the account service
 h.elig.value=INELIGIBLE;
 const restored=h.connection.pageShown({persisted:true});
 h.gates.service.resolve();await pending;await restored;
 assert.ok(!h.calls.includes('session')&&!h.calls.includes('topics'),'the late service is never used');
 assert.equal(h.auth.listeners.length,0,'no listener was ever added');
 assert.equal(h.last().mode,'public');assert.equal(h.last().notice,'public-ready');
 const late=harness();late.gates.service=deferred();
 const work=late.connection.connect();late.elig.value=INELIGIBLE;late.gates.service.resolve();await work;
 assert.ok(!late.calls.includes('session'),'even without a pageshow, an account service that arrives after the age screen is not used');
 assert.equal(late.last().mode,'public');
});

test('a refresh supersedes a slower earlier read; failures keep the guides',async()=>{
 const h=harness({eligibility:INELIGIBLE});
 h.gates.publicTopics=deferred();
 const first=h.connection.connect();
 const firstGate=h.gates.publicTopics;h.gates.publicTopics=null;
 h.publicReader.topics=()=>{h.calls.push('publicTopics');return Promise.resolve({data:[topic(T2,{title:'Newer feed topic title'})],error:null});};
 await h.connection.connect();
 assert.equal(h.last().topics[0].id,T2);
 const count=h.states.length;firstGate.resolve();await first;
 assert.equal(h.states.length,count,'the older response publishes nothing');assert.equal(h.last().topics[0].id,T2);
 const guide={...topic(T3,{editorial:true,title:'Static discussion guide title'})};
 const failing=harness({eligibility:INELIGIBLE,staticTopics:[guide]});
 failing.publicReader.topics=async()=>({data:null,error:{code:'network'}});
 await failing.connection.connect();
 assert.equal(failing.last().feedState,'unavailable');assert.equal(failing.last().notice,'public-unavailable');
 assert.deepEqual(failing.last().topics.map(t=>t.id),[T3],'the static guides remain readable');
});

test('a selected topic outside the feed is fetched; absent and failing topics are told apart',async()=>{
 const absent=harness({eligibility:INELIGIBLE,selectedId:T2});
 await absent.connection.connect();
 assert.ok(absent.calls.includes('publicTopic'));assert.equal(absent.last().topicLoadError,null);
 assert.ok(!absent.last().topics.some(t=>t.id===T2),'absent (pending, hidden or deleted) is simply not shown');
 const found=harness({eligibility:INELIGIBLE,selectedId:T2});
 found.publicReader.topic=async id=>({data:topic(id,{title:'Second page topic title'}),error:null});
 await found.connection.connect();assert.ok(found.last().topics.some(t=>t.id===T2));
 const failed=harness({eligibility:INELIGIBLE,selectedId:T2});
 failed.publicReader.topic=async()=>({data:null,error:{code:'timeout'}});
 await failed.connection.connect();assert.equal(failed.last().topicLoadError,T2);
 const present=harness({eligibility:INELIGIBLE,selectedId:T1});await present.connection.connect();
 assert.ok(!present.calls.includes('publicTopic'),'a topic already in the feed is not fetched again');
});

test('a hidden static guide is not reinserted by public reading',async()=>{
 const guide=topic(T3,{editorial:true,title:'Hidden discussion guide title'});
 const h=harness({eligibility:INELIGIBLE,staticTopics:[guide]});
 await h.connection.connect();
 assert.ok(!h.last().topics.some(t=>t.id===T3),'live published rows win over the static guide list');
});

/* ── pages ─────────────────────────────────────────────────────────── */

test('the Community pages use the connection and public reader; guides never start the account service',()=>{
 const community=read('js/pages/community.js');
 assert.doesNotMatch(community,/account-service|getAccountService|createClient/,'the resources view reads guides publicly');
 assert.match(community,/const result=await publicGuides\(\);/);
 const forum=read('js/pages/forum.js');
 assert.ok(forum.includes('createCommunityConnection({eligibility:createEligibilityStore()'),'the page passes this tab’s age screen');
 assert.ok(forum.includes("window.addEventListener('pageshow',e=>connection.pageShown(e));"),'a back/forward restore is handed to the connection');
 assert.doesNotMatch(forum,/getAccountService\(/,'the page never starts the service itself');
 for(const control of ["controls().report)panel.append","canReport?h('button'","controls().composer)panel.append","!show.composer","!show.moderation","!show.submissions","!show.signIn"])
  assert.ok(forum.includes(control),`member control gated: ${control}`);
 assert.ok(forum.includes("mode==='public'?'Reading is open to everyone.'"),'no sign-in prompt in public mode');
});

test('every module that starts the account service checks the age screen first',()=>{
 const files=['js/pages','js/lib'].flatMap(d=>readdirSync(new URL(`../${d}`,import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>`${d}/${f}`));
 const starters=files.filter(f=>f!=='js/lib/account-service.js'&&/getAccountService\(|\.getService\(\)/.test(read(f)));
 assert.ok(starters.includes('js/lib/community-connection.js'));
 for(const f of starters){
  const src=read(f),start=src.search(/getAccountService\(|\.getService\(\)/),check=src.search(/===\s*INELIGIBLE|ineligible\(\)/);
  assert.ok(check>=0&&check<start,`${f} checks INELIGIBLE before starting the account service`);
 }
});

test('an account refresh while the service is still loading uses only the newest request',async()=>{
 const h=harness();h.gates.service=deferred();
 const first=h.connection.connect();
 const gate=h.gates.service;h.gates.service=null;
 await h.connection.connect();                       // a later refresh finishes first
 const published=h.states.length;
 gate.resolve();await first;
 assert.equal(h.calls.filter(c=>c==='session').length,1,'the superseded request stops after the service arrives');
 assert.equal(h.states.length,published,'and publishes nothing');
 assert.equal(h.auth.listeners.length,1,'one sign-in listener, not two');
});

/* ── loading lifecycle: the refresh button follows every start and end ── */

const loadingTrail=h=>h.states.map(s=>s.loading);

test('a sign-in callback during a pending refresh keeps loading until its own reconnect finishes',async()=>{
 const h=harness();h.gates.topics=deferred();
 const refresh=h.connection.connect();               // explicit refresh, waiting on the feed
 await new Promise(r=>setImmediate(r));
 assert.equal(h.last().loading,true);
 h.account.currentSession=async()=>({session:null,error:null});
 h.auth.listeners[0]('SIGNED_OUT',null);             // the member signs out in another tab
 assert.equal(h.last().loading,true,'still loading: a reconnect is scheduled');
 const gate=h.gates.topics;h.gates.topics=null;gate.resolve();await refresh;
 assert.equal(h.last().loading,true,'the superseded refresh does not re-enable the button');
 assert.equal(h.scheduled.length,1);
 await h.scheduled[0]();
 assert.equal(h.last().loading,false,'the scheduled reconnect ends loading');
 assert.equal(h.last().session,null);
 const trail=loadingTrail(h),callbackAt=h.extras.findIndex(e=>e.privateCleared);
 assert.ok(trail.slice(callbackAt,-1).every(Boolean),'no state between the callback and the reconnect’s end shows “not loading”');
});

test('every way a connection ends clears loading; a restore from the back/forward cache sets it first',async()=>{
 const ends=[
  ['ready',harness()],
  ['service unavailable',(()=>{const h=harness();h.account.getService=async()=>({status:'unavailable'});return h;})()],
  ['session error',(()=>{const h=harness();h.account.currentSession=async()=>({session:null,error:{message:'x'}});return h;})()],
  ['feed failure',(()=>{const h=harness();h.account.listTopics=async()=>({data:null,error:{code:'x'}});return h;})()],
  ['public failure',(()=>{const h=harness({eligibility:INELIGIBLE});h.publicReader.topics=async()=>({data:null,error:{code:'x'}});return h;})()],
 ];
 for(const [name,h] of ends){await h.connection.connect();assert.equal(h.states[0].loading,true,`${name}: starts loading`);assert.equal(h.last().loading,false,`${name}: ends not loading`);}
 const h=harness();await h.connection.connect();h.elig.value=INELIGIBLE;
 h.gates.publicTopics=deferred();
 const restored=h.connection.pageShown({persisted:true});
 assert.equal(h.last().loading,true,'restoring sets loading before the public read');
 h.gates.publicTopics.resolve();await restored;
 assert.equal(h.last().loading,false);
 assert.match(read('js/pages/forum.js'),/\$\('refresh-discussions'\)\.disabled=next\.loading;/,'the page button mirrors the connection');
 assert.equal((read('js/pages/forum.js').match(/refresh-discussions'\)\.disabled/g)||[]).length,1,'and nothing else toggles it');
});

/* ── UUID case and eligibility changes during account waits ── */

test('upper-case topic links work: ids are validated, then compared and requested in lower case',async()=>{
 const TA='abcdef12-3456-4abc-8def-0123456789ab',TB='fedcba98-7654-4cba-8fed-ba9876543210',upper=TA.toUpperCase();
 assert.notEqual(upper,TA,'the test ids contain letters');
 const f=fakeFetch([topic(TA)]);
 const one=await publicTopic(upper,{cfg,fetchImpl:f});
 assert.equal(one.data?.id,TA);assert.equal(new URL(f.calls[0].url).searchParams.get('id'),`eq.${TA}`);
 const rs=await publicReplies(upper,{cfg,fetchImpl:fakeFetch([reply(R1,TA)])});
 assert.equal(rs.data.length,1,'lower-case topic_id rows match an upper-case link');
 assert.equal(new URL((await (async()=>{const g=fakeFetch([]);await publicReplies(upper,{cfg,fetchImpl:g});return g.calls[0].url;})())).searchParams.get('topic_id'),`eq.${TA}`);
 assert.deepEqual(await publicTopic(`${upper}x`,{cfg,fetchImpl:f}),{data:null,error:null});assert.equal(f.calls.length,1,'malformed still sends nothing');
 const h=harness({eligibility:INELIGIBLE,selectedId:upper});
 h.publicReader.topics=async()=>{h.calls.push('publicTopics');return {data:[topic(TA)],error:null};};
 await h.connection.connect();
 assert.ok(!h.calls.includes('publicTopic'),'a topic already in the feed is recognised whatever the case');
 const away=harness({eligibility:INELIGIBLE,selectedId:TB.toUpperCase()});away.publicReader.topic=async()=>({data:null,error:{code:'timeout'}});
 await away.connection.connect();assert.equal(away.last().topicLoadError,TB,'errors are reported against the canonical id the page uses');
 assert.ok(read('js/pages/forum.js').includes("selected=topicParam(params.get('topic'))"));
 assert.ok(read('js/pages/forum.js').includes("selected=topicParam(p.get('topic'))"),'Back/Forward canonicalises too');
});

test('a sign-in change while idle shows loading at once, before its reconnect starts',async()=>{
 const h=harness();await h.connection.connect();
 assert.equal(h.last().loading,false);
 h.account.currentSession=async()=>({session:null,error:null});
 h.auth.listeners[0]('SIGNED_OUT',null);
 assert.equal(h.last().loading,true,'the refresh button is disabled until the scheduled reconnect ends');
 await h.scheduled[0]();assert.equal(h.last().loading,false);
});

test('if the age screen changes during any account wait, the connection switches to public reading',async()=>{
 for(const wait of ['session','access','topics']){
  const h=harness();h.gates[wait]=deferred();
  const work=h.connection.connect();
  await new Promise(r=>setImmediate(r));
  h.elig.value=INELIGIBLE;h.gates[wait].resolve();await work;
  const after=h.calls.slice(h.calls.indexOf(wait)+1);
  assert.deepEqual(accountCalls(after),[],`${wait}: no further account call`);
  assert.equal(h.last().mode,'public',`${wait}: public`);assert.equal(h.last().loading,false);
  assert.deepEqual(communityControls(h.last()),{composer:false,moderation:false,report:false,submissions:false,signIn:false});
  if(h.auth.listeners.length)assert.equal(h.auth.unsubscribed,1,`${wait}: the listener added earlier is removed`);
 }
});

/* ── the existing client's automatic token refresh ── */

test('a known under-13 tab makes no auth call at all; a prior account client is quieted once, never signed out',async()=>{
 const fresh=harness({eligibility:INELIGIBLE});await fresh.connection.connect();
 assert.deepEqual(fresh.auth.used,[],'no client was created, so nothing is called on one');
 const h=harness();await h.connection.connect();
 assert.deepEqual(h.auth.used,['onAuthStateChange']);
 h.elig.value=INELIGIBLE;await h.connection.pageShown({persisted:true});
 assert.equal(h.auth.stopped,1,'auto refresh stopped for the existing client');
 assert.equal(h.auth.unsubscribed,1);
 assert.ok(!h.auth.used.includes('signOut')&&!h.auth.used.includes('startAutoRefresh'),'no sign-out; stored credentials and other tabs are untouched');
 await h.connection.connect();await h.connection.pageShown({persisted:true});
 assert.equal(h.auth.stopped,1,'stopped once only');
});

test('ordinary adult refreshes and sign-in changes never stop the client’s token refresh',async()=>{
 const h=harness();await h.connection.connect();await h.connection.connect();
 h.account.currentSession=async()=>({session:{user:{id:'adult-2'}},error:null});
 h.auth.listeners[0]('SIGNED_IN',{user:{id:'adult-2'}});await h.scheduled[0]();
 assert.equal(h.auth.stopped,0);assert.equal(h.last().mode,'account');
});

test('a client that arrives after the tab turned public is quieted without reading its session',async()=>{
 const h=harness();h.gates.service=deferred();
 const pending=h.connection.connect();
 h.elig.value=INELIGIBLE;const restored=h.connection.pageShown({persisted:true});
 h.gates.service.resolve();await pending;await restored;
 assert.equal(h.auth.stopped,1,'the late client’s refresh is stopped');
 assert.deepEqual(h.auth.used,['stopAutoRefresh'],'no listener, no session read, no sign-out');
 assert.ok(!h.calls.includes('session'));
 const eligible=harness();eligible.gates.service=deferred();
 const first=eligible.connection.connect();const gate=eligible.gates.service;eligible.gates.service=null;
 await eligible.connection.connect();gate.resolve();await first;
 assert.equal(eligible.auth.stopped,0,'a merely superseded eligible request leaves the shared client alone');
});

test('a failing stop is contained and the tab still reads publicly',async()=>{
 const h=harness();await h.connection.connect();
 h.auth.stopResult=()=>Promise.reject(new Error('timer already gone'));
 h.elig.value=INELIGIBLE;await h.connection.pageShown({persisted:true});
 await new Promise(r=>setImmediate(r));
 assert.equal(h.last().mode,'public');assert.equal(h.last().notice,'public-ready');
 const throwing=harness();await throwing.connection.connect();
 throwing.auth.stopAutoRefresh=()=>{throw new Error('sync failure');};
 throwing.elig.value=INELIGIBLE;await throwing.connection.pageShown({persisted:true});
 assert.equal(throwing.last().mode,'public');
});

test('a teen moderator (moderator, not adult) keeps the review queue and reports but gets no public composer',async()=>{
 const h=harness({sessionUser:'teen-moderator',accessData:{adult:false,moderator:true}});
 await h.connection.connect();
 assert.deepEqual(h.calls,['service','session','access','topics'],'the normal account path');
 assert.deepEqual(h.last().access,{adult:false,moderator:true});
 assert.deepEqual(communityControls(h.last()),{composer:false,moderation:true,report:true,submissions:true,signIn:false});
 const forum=read('js/pages/forum.js');
 assert.ok(forum.includes('if(!client||!access.moderator)return;'),'the queue (topics, replies and reports) needs moderator access only');
 assert.ok(forum.includes("$('moderation').hidden=!show.moderation;")&&forum.includes("$('moderation-link').hidden=!show.moderation;"));
 assert.ok(forum.includes("$('topic-composer').hidden=!show.composer;")&&forum.includes("$('start-topic-link').hidden=!show.composer;"),'new-topic composer follows adult access');
 assert.ok(forum.includes('if(controls().composer)panel.append(draft||composer({reply:true,topic}));'),'reply composer follows adult access');
 const restored=harness({sessionUser:'teen-moderator',accessData:{adult:false,moderator:true}});await restored.connection.connect();
 restored.elig.value=INELIGIBLE;await restored.connection.pageShown({persisted:true});
 assert.deepEqual(communityControls(restored.last()),{composer:false,moderation:false,report:false,submissions:false,signIn:false},'an under-13 tab gets none of it, even with this session stored');
});
