/* Community keyboard continuity, run against the real js/pages/forum.js in a
   minimal DOM where removing a focused element drops focus to <body>.
   Public mode uses the real stateless reader with a fake fetch; account mode
   substitutes account-service.js (this test process only) with a fake whose
   client answers from synthetic rows. No network, no real session. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseQuery,toPredicate} from './helpers/postgrest-filter.mjs';

const FAKE_ACCOUNT=`export const UNAVAILABLE_REASON='Test: unavailable.';
export const accountsConfigured=()=>true;export const sessionStorageKey=()=>'test-session';
export const hasStoredSession=()=>Boolean(globalThis.__testAccount?.session);export const withTimeout=p=>p;
export const friendlyError=(e,f='Test error')=>f;
export function getAccountService(){return globalThis.__testAccount?.service()??Promise.resolve({status:'unavailable',reason:'Test'});}
export const initAccountService=getAccountService;
export const retryAccountService=()=>(globalThis.__testAccount?.retry??getAccountService)();`;
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(specifier,context,next){
 if(/(^|\\/)account-service\\.js$/.test(specifier))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(FAKE_ACCOUNT)}),shortCircuit:true};
 return next(specifier,context);}`));

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const forumData=JSON.parse(read('data/forum.json'));
const T1='abcdef12-3456-4abc-8def-0123456789ab',T2='fedcba98-7654-4cba-8fed-ba9876543210',R1='aaaaaaaa-1111-4111-8111-111111111111';
const topic=(id,title)=>({id,category:'technique-qa',title,body:'Synthetic test topic body that is long enough.',author_handle:'tester',editorial:false,status:'published',created_at:'2026-11-17T10:00:00Z'});
const reply=(id,topicId)=>({id,topic_id:topicId,body:'Synthetic reply body text.',author_handle:'helper',status:'published',created_at:'2026-11-17T11:00:00Z'});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
let run=0;

async function community({search='',mode='public',reducedMotion=false,serviceGate=null,firstService='ready',topics=[topic(T1,'First synthetic topic title'),topic(T2,'Second synthetic topic title')]}={}){
 const state={topics,replies:[reply(R1,T1)],replyGate:null,pageGate:null,pending:[],user:'adult-1',authListeners:[]};
 // Answers the client's real query: equality filters, the keyset or=(…), order and limit.
 const cmp=(a,b)=>a<b?-1:a>b?1:0;
 const rest=async url=>{
  const q=parseQuery(url),table=q.table,keep=toPredicate(q,(col,a,b)=>cmp(String(a),String(b)));
  if(q.logic&&state.pageGate)await state.pageGate;
  let rows=(table==='discussion_topics'?state.topics:state.replies).filter(keep);
  for(const o of [...q.order].reverse())rows=[...rows].sort((x,y)=>cmp(String(x[o.col]),String(y[o.col]))*(o.dir==='desc'?-1:1));
  if(q.limit)rows=rows.slice(0,q.limit);
  if(table==='discussion_replies'&&state.replyGate)await state.replyGate.promise;
  return {ok:true,status:200,json:async()=>rows,text:async()=>JSON.stringify(rows)};
 };
 const env=installDom({url:`https://tkdflow.com/community.html${search}`,reducedMotion,session:mode==='public'?{'tkdflow.ageScreen.v1':'ineligible'}:{},
  fetch:async url=>String(url).includes('/data/forum.json')?{ok:true,status:200,text:async()=>JSON.stringify(forumData),json:async()=>forumData}:rest(url)});
 const {doc,el}=env;
 doc.body.append(el('main',{},el('p',{id:'forum-service'}),el('button',{type:'button',id:'refresh-discussions'},'Refresh discussions'),
  el('a',{id:'start-topic-link',href:'#topic-composer',hidden:''}),el('a',{id:'my-submissions-link',href:'#my-submissions',hidden:''}),el('a',{id:'moderation-link',href:'#moderation',hidden:''}),el('a',{id:'forum-sign-in',href:'/auth.html',hidden:''}),
  el('div',{id:'category-nav'}),el('form',{id:'forum-search'},el('input',{type:'search',id:'forum-q'})),
  el('p',{id:'forum-summary','aria-live':'polite'}),el('p',{id:'discussion-message'}),
  el('section',{id:'topic-detail',hidden:''}),el('div',{id:'forum-content'}),el('div',{id:'forum-more'}),el('section',{id:'topic-composer',hidden:''}),
  el('section',{id:'my-submissions',hidden:''},el('button',{type:'button',id:'refresh-submissions'}),el('div',{id:'my-submissions-list'})),
  el('section',{id:'moderation',hidden:''},el('button',{type:'button',id:'load-moderation'}),el('div',{id:'moderation-queue'}))));
 if(mode==='account'){
  const query=table=>{const filters=[];const run=async()=>{
   if(filters.some(f=>f[0]==='neq'))return {data:table==='discussion_replies'?state.pending:(state.pendingTopics||[]),error:null};
   if(table==='discussion_replies'&&state.replyGate)await state.replyGate.promise;
   const list=table==='discussion_topics'?state.topics:state.replies;
   const rows=list.filter(r=>filters.every(([,k,v])=>String(r[k])===String(v)));
   return {data:rows,error:null};};
   const q={select:()=>q,order:()=>q,limit:()=>q,or:()=>q,eq:(k,v)=>{filters.push(['eq',k,v]);return q;},neq:(k,v)=>{filters.push(['neq',k,v]);return q;},maybeSingle:()=>run().then(r=>({data:r.data[0]||null,error:null})),then:(a,b)=>run().then(a,b)};return q;};
  const client={auth:{getSession:async()=>({data:{session:state.user?{user:{id:state.user}}:null},error:null}),onAuthStateChange:fn=>{state.authListeners.push(fn);return {data:{subscription:{unsubscribe(){}}}};},stopAutoRefresh:async()=>{}},
   from:query,rpc:async name=>{if(name==='discussion_access')return {data:{adult:true,moderator:false},error:null};
    // state.submitGate holds a reply or topic submission in flight until the test resolves it.
    if(name==='reply_discussion'||name==='submit_discussion')state.submits=(state.submits||0)+1;
    // state.submitGates (one per call, in order) or state.submitGate (shared) hold submissions in flight.
    if(name==='reply_discussion'||name==='submit_discussion'){const gate=state.submitGates?.shift()||state.submitGate;if(gate)await gate.promise;}
    return (name==='reply_discussion'&&state.replyOk)||(name==='submit_discussion'&&state.topicOk)?{data:'new-id',error:null}:{data:null,error:{message:'test'}};}};
  // firstService:'unavailable' makes the first start fail; retries (Refresh) then succeed.
  const calls={service:0,retry:0};state.calls=calls;
  globalThis.__testAccount={session:true,service:async()=>{calls.service++;if(serviceGate)await serviceGate.promise;return firstService==='unavailable'?{status:'unavailable',reason:'test'}:{status:'ready',client};},
   retry:async()=>{calls.retry++;return {status:'ready',client};}};
 }else globalThis.__testAccount=null;
 await import(`../js/pages/forum.js?run=${++run}`);
 await settle(40);
 const $=id=>doc.getElementById(id),key=(root,k)=>root.querySelectorAll('[data-fk]').find(n=>n.dataset.fk===k);
 return {...env,state,$,key,refresh:async()=>{$('refresh-discussions').click();await settle(40);}};
}
/* Drain the page's scheduled work BEFORE restoring globals, so a late timer
   from this test's page can never run against the next test's document. */
const done=async env=>{await settle(10);env.restore();globalThis.__testAccount=null;};
/* Identity checks: never let assert format whole (cyclic) DOM trees. */
const is=(a,b,msg='not the expected element')=>assert.ok(a===b,`${msg} (got ${a?.dataset?.fk||a?.id||a?.tagName||a})`);
const isnt=(a,b,msg='unexpectedly the same element')=>assert.ok(a!==b,msg);
const same=(a,b,msg='not the same nodes')=>assert.ok(a.length===b.length&&a.every((n,i)=>n===b[i]),msg);
const fk=el=>el?.dataset?.fk||el?.id||el?.tagName;

test('opening a topic focuses its heading and scrolls the panel, honouring reduced motion',async()=>{
 for(const reducedMotion of [false,true]){
  const env=await community({reducedMotion});
  try{
   env.key(env.$('forum-content'),`topic:${T1}:link`).click();
   const heading=env.$('topic-detail-title');
   is(env.doc.activeElement,heading,'the heading of the opened discussion has focus');
   assert.equal(heading.getAttribute('tabindex'),'-1');
   assert.equal(env.$('topic-detail').getAttribute('aria-labelledby'),'topic-detail-title');
   const scroll=env.doc.scrolls.at(-1);
   is(scroll.element,env.$('topic-detail'));assert.equal(scroll.options.behavior,reducedMotion?'auto':'smooth');
  }finally{await done(env);}
 }
});

test('All topics returns focus to the link or button that opened the discussion',async()=>{
 for(const part of ['link','read']){
  const env=await community();
  try{
   env.key(env.$('forum-content'),`topic:${T2}:${part}`).click();
   env.key(env.$('topic-detail'),'detail:back').click();
   assert.equal(fk(env.doc.activeElement),`topic:${T2}:${part}`);
   assert.ok(env.$('forum-content').contains(env.doc.activeElement));
  }finally{await done(env);}
 }
});

test('choosing a category keeps focus on the category button after the list is rebuilt',async()=>{
 const env=await community();
 try{
  const button=env.key(env.$('category-nav'),'cat:technique-qa');button.focus();button.click();
  assert.equal(fk(env.doc.activeElement),'cat:technique-qa');
  assert.equal(env.doc.activeElement.getAttribute('aria-pressed'),'true');
 }finally{await done(env);}
});

test('a background refresh keeps focus on a listed topic and never moves focus from elsewhere',async()=>{
 const env=await community();
 try{
  env.key(env.$('forum-content'),`topic:${T1}:link`).focus();
  await env.refresh();
  assert.equal(fk(env.doc.activeElement),`topic:${T1}:link`);
  const search=env.$('forum-q');search.focus();
  await env.refresh();
  is(env.doc.activeElement,search);
  assert.equal(env.doc.scrolls.length,0,'no scrolling');
 }finally{await done(env);}
});

test('a focused topic removed by a refresh hands focus to the results summary',async()=>{
 const env=await community();
 try{
  env.key(env.$('forum-content'),`topic:${T2}:read`).focus();
  env.state.topics=env.state.topics.filter(t=>t.id!==T2);
  await env.refresh();
  is(env.doc.activeElement,env.$('forum-summary'));
 }finally{await done(env);}
});

test('a deep link opens the discussion without moving focus or scrolling',async()=>{
 const env=await community({search:`?topic=${T1.toUpperCase()}`});
 try{
  assert.equal(env.$('topic-detail').hidden,false);
  assert.ok(env.$('topic-detail-title'));
  is(env.doc.activeElement,env.doc.body);
  assert.equal(env.doc.scrolls.length,0);
 }finally{await done(env);}
});

test('the focused discussion heading survives a background refresh that rebuilds the panel',async()=>{
 const env=await community();
 try{
  env.key(env.$('forum-content'),`topic:${T1}:link`).click();
  const before=env.$('topic-detail-title');
  await env.refresh();
  const after=env.$('topic-detail-title');
  isnt(after,before,'the panel was rebuilt');
  is(env.doc.activeElement,after,'focus is on the rebuilt heading');
 }finally{await done(env);}
});

test('a reply’s Report button that is rebuilt hands focus to the heading at once, and replies loading later never take it back',async()=>{
 const env=await community({mode:'account'});
 try{
  env.key(env.$('forum-content'),`topic:${T1}:link`).click();await settle(20);
  const report=env.key(env.$('topic-detail'),`reply:${R1}:report`);assert.ok(report,'replies with Report buttons are shown');
  report.focus();
  env.state.replyGate=deferred();
  env.$('refresh-discussions').click();await settle(40);
  is(env.doc.activeElement,env.$('topic-detail-title'),'synchronous fallback while replies reload');
  const search=env.$('forum-q');search.focus();
  env.state.replyGate.resolve();await settle(40);
  assert.ok(env.key(env.$('topic-detail'),`reply:${R1}:report`),'replies are back');
  is(env.doc.activeElement,search,'the replies arriving later do not move focus');
 }finally{await done(env);}
});

test('a reply draft keeps its text, focus and caret through a refresh, restored before replies load',async()=>{
 const env=await community({mode:'account'});
 try{
  env.key(env.$('forum-content'),`topic:${T1}:link`).click();await settle(20);
  const box=env.$('reply-body');assert.ok(box,'adults see the reply form');
  box.focus();box.value='Partial reply text';box.setSelectionRange(3,7);
  env.state.replyGate=deferred();
  env.$('refresh-discussions').click();await settle(40);
  is(env.$('reply-body'),box,'the same draft form is kept');
  is(env.doc.activeElement,box,'focus restored while replies are still loading');
  assert.deepEqual([box.value,box.selectionStart,box.selectionEnd],['Partial reply text',3,7]);
  env.$('forum-q').focus();
  env.state.replyGate.resolve();await settle(40);
  is(env.doc.activeElement,env.$('forum-q'),'no delayed jump back to the draft');
  assert.equal(box.value,'Partial reply text');
 }finally{await done(env);}
});

test('Community points to public lesson answers and private 13+ lesson help without offering posting',()=>{
 const html=read('community.html');
 const route=html.slice(html.indexOf('<p class="community-help-route">'),html.indexOf('</p>',html.indexOf('<p class="community-help-route">'))).replace(/<[^>]+>/g,'');
 assert.match(route,/Read public lesson answers/);
 assert.match(route,/Members aged 13 and over with a confirmed account and completed profile can also ask TKDflow community moderators a private question/);
 assert.match(route,/Private questions are not published/);
 assert.doesNotMatch(route,/post|publish your|teens can/i);
 assert.match(html,/href="\/lesson-faq\.html">Read public lesson answers<\/a>/);
});

test('an unkeyed control inside the preserved draft (its consent checkbox) keeps focus through a refresh',async()=>{
 const env=await community({mode:'account'});
 try{
  env.key(env.$('forum-content'),`topic:${T1}:link`).click();await settle(20);
  const consent=env.$('reply-body').closest('form').querySelector('input');
  assert.ok(consent&&!consent.hasAttribute('data-fk'),'the checkbox has no focus key of its own');
  consent.focus();
  await env.refresh();
  is(env.doc.activeElement,consent,'the same re-attached checkbox has focus');
 }finally{await done(env);}
});

/* ── a signed-in visitor opens a public guide before their session arrives ── */
const GUIDE=forumData.topics[0];
const liveGuide={id:GUIDE.id,category:GUIDE.category,title:GUIDE.title,body:GUIDE.body,author_handle:'tkdflow',editorial:true,status:'published',created_at:'2026-11-01T09:00:00Z'};

test('opening a guide while the account service is still starting keeps focus on its heading when the session arrives',async()=>{
 const gate=deferred();
 const env=await community({mode:'account',serviceGate:gate,topics:[liveGuide,topic(T1,'First synthetic topic title')]});
 try{
  const link=env.key(env.$('forum-content'),`topic:${GUIDE.id}:link`);assert.ok(link,'the bundled guide is listed before the account service answers');
  link.click();
  const first=env.$('topic-detail-title');is(env.doc.activeElement,first,'the heading has focus');
  gate.resolve();await settle(60);
  const heading=env.$('topic-detail-title');
  assert.ok(heading&&heading.textContent===GUIDE.title,'the same discussion is still open');
  is(env.doc.activeElement,heading,'focus is on the (rebuilt) heading after the session arrives');
  assert.ok(env.$('reply-body'),'the signed-in adult now sees the reply form');
  assert.ok(env.$('reply-body')!==env.doc.activeElement,'focus was not moved into a private control');
 }finally{await done(env);}
});

test('if the visitor moves to search while the session is starting, its arrival does not pull focus back',async()=>{
 const gate=deferred();
 const env=await community({mode:'account',serviceGate:gate,topics:[liveGuide]});
 try{
  env.key(env.$('forum-content'),`topic:${GUIDE.id}:link`).click();
  const search=env.$('forum-q');search.focus();
  gate.resolve();await settle(60);
  is(env.doc.activeElement,search);
 }finally{await done(env);}
});

test('a change to a different account removes the previous reply draft and does not restore focus into private controls',async()=>{
 const env=await community({mode:'account'});
 try{
  env.key(env.$('forum-content'),`topic:${T1}:link`).click();await settle(20);
  const box=env.$('reply-body');box.focus();box.value='Draft written by the first account';box.setSelectionRange(2,6);
  env.state.user='adult-2';
  for(const fn of env.state.authListeners)fn('SIGNED_IN',{user:{id:'adult-2'}});
  await settle(60);
  const fresh=env.$('reply-body');
  assert.ok(fresh,'the new adult account sees a reply form');
  assert.ok(fresh!==box,'it is a new form, not the previous account’s draft');
  assert.equal(fresh.value,'','no text from the previous account');
  assert.ok(!env.$('topic-detail').contains(box),'the old draft is gone');
  assert.ok(env.doc.activeElement!==fresh,'focus is not placed into the new account’s form');
  assert.equal(env.$('topic-detail-title').textContent,'First synthetic topic title','the public discussion remains open');
 }finally{await done(env);}
});

test('other public reading controls (All topics) also keep focus when the first session arrives',async()=>{
 const gate=deferred();
 const env=await community({mode:'account',serviceGate:gate,topics:[liveGuide]});
 try{
  env.key(env.$('forum-content'),`topic:${GUIDE.id}:link`).click();
  const back=env.key(env.$('topic-detail'),'detail:back');back.focus();
  gate.resolve();await settle(60);
  const now=env.key(env.$('topic-detail'),'detail:back');
  assert.ok(now&&now!==back,'the panel was rebuilt');
  is(env.doc.activeElement,now,'focus is on the rebuilt All topics button');
 }finally{await done(env);}
});

/* ── Load more (keyset pages of 50) ───────────────────────────────── */
const many=n=>Array.from({length:n},(_,i)=>topic(`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,`Synthetic paged topic ${i+1}`));
test('Load more appends older topics, focuses the first new one, and the summary is honest about what is loaded',async()=>{
 const env=await community({topics:many(60)});
 try{
  assert.equal(env.$('forum-content').querySelectorAll('article').length,50);
  assert.equal(env.$('forum-summary').textContent,'Showing the 50 topics loaded so far. Older discussions can be loaded.');
  env.$('forum-q').value='paged topic 1';env.$('forum-q').dispatchEvent(new Event('input'));
  assert.match(env.$('forum-summary').textContent,/^\d+ of the 50 topics loaded so far match “paged topic 1”\. Load more discussions to search older ones\.$/);
  env.$('forum-q').value='';env.$('forum-q').dispatchEvent(new Event('input'));
  const button=env.key(env.$('forum-more'),'more:topics');button.focus();button.click();await settle(40);
  is(env.doc.activeElement,env.key(env.$('forum-content'),`topic:00000000-0000-4000-8000-000000000010:link`),'focus moves to the first newly listed topic');
  assert.equal(env.$('forum-content').querySelectorAll('article').length,60);
  assert.equal(env.$('forum-summary').textContent,'60 topics.');
  assert.equal(env.key(env.$('forum-more'),'more:topics'),undefined,'no button once everything is loaded');
 }finally{await done(env);}
});

test('a slow page never pulls focus from search the visitor moved to meanwhile',async()=>{
 const env=await community({topics:many(60)});
 try{
  let release;env.state.pageGate=new Promise(r=>{release=r;});
  const button=env.key(env.$('forum-more'),'more:topics');button.focus();button.click();await settle(5);
  assert.equal(env.key(env.$('forum-more'),'more:topics').getAttribute('aria-disabled'),'true','the button stays focusable while loading');
  env.$('forum-q').focus();release();await settle(40);
  is(env.doc.activeElement,env.$('forum-q'),'focus stays in search');
  assert.equal(env.$('forum-content').querySelectorAll('article').length,60);
 }finally{await done(env);}
});

test('a pending reply in Your submissions links to the discussion it belongs to',async()=>{
 const env=await community({mode:'account',topics:[topic(T1,'First synthetic topic title')]});
 try{
  env.state.pending=[{...reply('bbbbbbbb-1111-4111-8111-111111111111',T1),status:'pending'}];
  env.$('refresh-submissions').click();await settle(40);
  const link=env.$('my-submissions-list').querySelectorAll('a').find(a=>/topic=/.test(a.getAttribute('href')));
  assert.ok(link,'reply has a link');assert.match(link.getAttribute('href'),new RegExp(`topic=${T1}`));
  assert.equal(link.textContent,'Open the discussion this reply belongs to');
 }finally{await done(env);}
});

test('a deep-linked older topic counts once in the loaded total, and later pages list it once',async()=>{
 const old='00000000-0000-4000-8000-000000000005';      // beyond the first page of 50
 const env=await community({search:`?topic=${old}`,topics:many(60)});
 try{
  assert.equal(env.$('forum-content').querySelectorAll('article').length,51,'first page plus the deep-linked topic');
  env.$('forum-q').value='Synthetic paged topic';env.$('forum-q').dispatchEvent(new Event('input'));
  assert.equal(env.$('forum-summary').textContent,'51 of the 51 topics loaded so far match “Synthetic paged topic”. Load more discussions to search older ones.');
  env.$('forum-q').value='';env.$('forum-q').dispatchEvent(new Event('input'));
  env.key(env.$('forum-more'),'more:topics').click();await settle(40);
  const links=env.$('forum-content').querySelectorAll('[data-fk]').map(n=>n.dataset.fk).filter(k=>k.endsWith(':link'));
  assert.equal(links.length,60);assert.equal(new Set(links).size,60,'each topic once');
  assert.equal(links.filter(k=>k===`topic:${old}:link`).length,1);
  assert.equal(env.$('forum-summary').textContent,'60 topics.');
 }finally{await done(env);}
});

/* ── search: every word, compared with the catalogue's normalize() ─── */
// Uses the real bundled discussion guides (data/forum.json) as the published feed.
const guides=()=>forumData.topics.map(t=>({...t}));
const titles=env=>env.$('forum-content').querySelectorAll('h3').map(h=>h.textContent);
const search=(env,q)=>{env.$('forum-q').value=q;env.$('forum-q').dispatchEvent(new Event('input'));return titles(env);};
const TRANSITION='How to study a difficult transition with TKDflow',PACKET='A checklist for reading an event information packet',QUESTION='What information makes a technique question useful?',RULES='Keep rules discussions specific to the event';
const set=list=>[...list].sort();
test('Community search matches every word regardless of order, hyphens, spacing, case or accents',async()=>{
 const env=await community({topics:guides()});
 try{
  assert.equal(titles(env).length,forumData.topics.length);
  // Observed on the real guides: before, “pose link” found only QUESTION (which says “pose link”);
  // TRANSITION says “pose-link”, and now both match, with or without the space.
  assert.deepEqual(set(search(env,'pose link')),set([TRANSITION,QUESTION]));
  assert.deepEqual(set(search(env,'poselink')),set([TRANSITION,QUESTION]));
  assert.deepEqual(search(env,'playback slow'),[TRANSITION],'word order does not matter');
  assert.deepEqual(search(env,'packet information'),[PACKET]);
  assert.deepEqual(set(search(env,'ÉVENT PACKET')),set([PACKET,RULES]),'case and accents are ignored (before: no result)');
  assert.deepEqual(search(env,'checklist venue'),[PACKET],'one word in the title, one in the body');
  assert.deepEqual(search(env,'checklist zzzz'),[],'every word must match');
  assert.equal(env.$('forum-summary').textContent,'0 topics matching “checklist zzzz”.');
  assert.equal(env.$('forum-content').textContent,'No topics match. Try another category or search.');
  assert.equal(search(env,'').length,forumData.topics.length,'clearing the search shows every topic again');
 }finally{await done(env);}
});
test('a search in the URL is applied with the same rules, and categories still filter',async()=>{
 const env=await community({search:'?q=playback%20slow',topics:guides()});
 try{
  assert.equal(env.$('forum-q').value,'playback slow');assert.deepEqual(titles(env),[TRANSITION]);
  env.key(env.$('category-nav'),'cat:competitions').click();
  assert.deepEqual(titles(env),[],'the transition guide is not in Competitions');
  env.key(env.$('category-nav'),'cat:forms-discussion').click();
  assert.deepEqual(titles(env),[TRANSITION]);
 }finally{await done(env);}
});

/* ── Refresh recovery and the submissions limit (item 46) ─────────── */
test('Refresh discussions recovers after the account service was unavailable, and never restarts a healthy one',async()=>{
 let env=await community({mode:'account',firstService:'unavailable'});
 try{
  assert.match(env.$('forum-service').textContent,/Use Refresh discussions to try again/);
  assert.equal(env.state.calls.service,1);
  await env.refresh();
  assert.equal(env.state.calls.retry,1,'the explicit Refresh retries the start-up');
  assert.doesNotMatch(env.$('forum-service').textContent,/could not be connected/);
  assert.ok(env.$('forum-content').querySelectorAll('article').length>0,'the member feed loads');
 }finally{await done(env);}
 env=await community({mode:'account'});
 try{await env.refresh();assert.equal(env.state.calls.retry,0,'a healthy service is reused');}finally{await done(env);}
});

test('Your submissions says which list shows only its 30 most recent items, and only that one',async()=>{
 const mk=(n,kind)=>Array.from({length:n},(_,i)=>kind==='reply'?{...reply(`cccccccc-0000-4000-8000-${String(i).padStart(12,'0')}`,T1),status:'pending',created_at:`2026-11-1${i%9}T10:00:00Z`}:{...topic(`dddddddd-0000-4000-8000-${String(i).padStart(12,'0')}`,`Pending synthetic topic ${i}`),status:'pending'});
 for(const [topics,replies,expect] of [[31,2,'Showing your 30 most recent unpublished topics.'],[2,31,'Showing your 30 most recent unpublished replies.'],[31,31,'Showing your 30 most recent unpublished topics and your 30 most recent unpublished replies.'],[30,30,null]]){
  const env=await community({mode:'account',topics:[topic(T1,'First synthetic topic title')]});
  try{
   env.state.pendingTopics=mk(topics,'topic');env.state.pending=mk(replies,'reply');
   env.$('refresh-submissions').click();await settle(40);
   const note=env.$('my-submissions-list').querySelectorAll('p').find(p=>p.classList?.contains('submissions-limit'));
   assert.equal(note?.textContent??null,expect,`${topics} topics, ${replies} replies`);
   assert.equal(env.$('my-submissions-list').querySelectorAll('article').length,Math.min(topics,30)+Math.min(replies,30));
  }finally{await done(env);}
 }
});

/* ── unsent reply drafts, page memory only (item 48) ─────────────── */
test('an unsent reply survives switching topics and Back, without its consent box, and never touches storage',async()=>{
 const env=await community({mode:'account'});
 const writes=[];for(const s of [globalThis.localStorage,globalThis.sessionStorage]){const orig=s.setItem.bind(s);s.setItem=(k,v)=>{writes.push(k);orig(k,v);};}
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const area=()=>env.$('reply-body');
  open(T1);await settle(10);
  area().value='My synthetic unsent reply text';area().dispatchEvent(env.event('input',{bubbles:true}));
  env.$('topic-detail').querySelector('input[type="checkbox"]').checked=true;
  open(T2);await settle(10);
  assert.equal(area().value,'','another topic does not show it');
  open(T1);await settle(10);
  assert.equal(area().value,'My synthetic unsent reply text','restored for the same topic');
  assert.equal(env.$('topic-detail').querySelector('input[type="checkbox"]').checked,false,'consent is asked again');
  assert.match(env.$('topic-detail').textContent,/Your unsent reply is kept while this page stays open/);
  env.history.replaceState(null,'',`/community.html?topic=${T2}`);env.win.dispatchEvent(env.event('popstate',{}));await settle(10);
  env.history.replaceState(null,'',`/community.html?topic=${T1}`);env.win.dispatchEvent(env.event('popstate',{}));await settle(10);
  assert.equal(area().value,'My synthetic unsent reply text','Back and Forward keep it');
  assert.deepEqual(writes.filter(k=>!/age|session/i.test(k)&&k!=='test-session'),[],'no browser storage writes for drafts');
 }finally{await done(env);}
});

test('a sent reply clears its draft; a failed one keeps it; an account change clears every draft',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const area=()=>env.$('reply-body');
  const send=()=>{area().closest('form').dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));};
  open(T1);await settle(10);
  area().value='A synthetic reply that will fail first';area().dispatchEvent(env.event('input',{bubbles:true}));
  send();await settle(20);
  open(T2);await settle(10);open(T1);await settle(10);
  assert.equal(area().value,'A synthetic reply that will fail first','a failed send keeps the draft');
  env.state.replyOk=true;send();await settle(20);
  open(T2);await settle(10);open(T1);await settle(10);
  assert.equal(area().value,'','a successful send clears it');
  area().value='Draft before another account signs in';area().dispatchEvent(env.event('input',{bubbles:true}));
  open(T2);await settle(10);
  for(const fn of env.state.authListeners)fn('SIGNED_IN',{user:{id:'adult-2'}});env.state.user='adult-2';await settle(40);
  open(T1);await settle(10);
  assert.equal(area()?.value??'','','a different account never sees the previous draft');
 }finally{await done(env);}
});

test('signing out and back in as the same account also clears drafts',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  open(T1);await settle(10);
  env.$('reply-body').value='Synthetic draft before signing out';env.$('reply-body').dispatchEvent(env.event('input',{bubbles:true}));
  for(const fn of env.state.authListeners)fn('SIGNED_OUT',null);env.state.user=null;await settle(40);
  for(const fn of env.state.authListeners)fn('SIGNED_IN',{user:{id:'adult-1'}});env.state.user='adult-1';await settle(40);
  open(T2);await settle(10);open(T1);await settle(10);
  assert.ok(env.$('reply-body'),'the composer is back for the same account');
  assert.equal(env.$('reply-body').value,'','the draft did not survive signing out');
 }finally{await done(env);}
});

/* ── typing while a submission is sending ───────────────────────── */
const typeInto=(env,field,text)=>{field.value=text;field.dispatchEvent(env.event('input',{bubbles:true}));};
test('text typed while a reply is sending survives its success, keeps caret and focus, and is restored after switching topics',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const area=()=>env.$('reply-body'),consent=()=>env.$('topic-detail').querySelector('.discussion-consent input');
  const send=()=>{area().closest('form').dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));};
  env.state.replyOk=true;env.state.submitGate=deferred();
  open(T1);await settle(10);
  typeInto(env,area(),'The synthetic reply that is being sent');consent().checked=true;send();await settle(10);
  typeInto(env,area(),'The synthetic reply that is being sent, plus newer words');
  area().focus();area().selectionStart=area().selectionEnd=4;
  env.state.submitGate.resolve();await settle(20);
  assert.equal(area().value,'The synthetic reply that is being sent, plus newer words','newer text is kept');
  is(env.doc.activeElement,area(),'focus stays in the reply');
  assert.equal(area().selectionStart,4,'the caret is not moved');
  assert.equal(consent().checked,false,'consent is asked again');
  assert.match(env.$('discussion-message').textContent,/earlier version was submitted for moderation\. What you typed while it was sending is still here and has not been sent/);
  open(T2);await settle(10);open(T1);await settle(10);
  assert.equal(area().value,'The synthetic reply that is being sent, plus newer words','the unsent newer text is still a draft');
  assert.match(env.$('topic-detail').textContent,/Your unsent reply is kept while this page stays open/);
  // Unchanged while sending: the success clears the field, the draft and the note.
  env.state.submitGate=deferred();consent().checked=true;send();await settle(10);
  env.state.submitGate.resolve();await settle(20);
  assert.equal(area().value,'');assert.equal(consent().checked,false);
  assert.equal(env.$('topic-detail').querySelector('.draft-note'),null);
  assert.match(env.$('discussion-message').textContent,/^Submitted for moderation\./);
  open(T2);await settle(10);open(T1);await settle(10);
  assert.equal(area().value,'','nothing sent comes back as a draft');
 }finally{await done(env);}
});

test('a reply sent before switching topics and back clears the restored copy, not newer text elsewhere',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const area=()=>env.$('reply-body');
  env.state.replyOk=true;env.state.submitGate=deferred();
  open(T1);await settle(10);
  typeInto(env,area(),'Synthetic reply sent before switching');env.$('topic-detail').querySelector('.discussion-consent input').checked=true;
  area().closest('form').dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));await settle(10);
  open(T2);await settle(10);typeInto(env,area(),'An unrelated synthetic draft for topic two');
  open(T1);await settle(10);
  assert.equal(area().value,'Synthetic reply sent before switching','restored while still sending');
  env.state.submitGate.resolve();await settle(20);
  assert.equal(area().value,'','the copy of what was sent is cleared once it is saved');
  open(T2);await settle(10);
  assert.equal(area().value,'An unrelated synthetic draft for topic two','another topic’s draft is untouched');
 }finally{await done(env);}
});

test('a new topic: only the fields still as sent are cleared; newer text and its category stay unsent',async()=>{
 const env=await community({mode:'account'});
 try{
  const title=()=>env.$('topic-title'),body=()=>env.$('topic-body'),select=()=>env.$('topic-category'),consent=()=>env.$('topic-composer').querySelector('.discussion-consent input');
  const send=()=>{env.$('topic-composer').querySelector('form').dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));};
  const other=forumData.categories[1].id;
  env.state.topicOk=true;env.state.submitGate=deferred();
  typeInto(env,title(),'A synthetic topic title');typeInto(env,body(),'A synthetic question body that is long enough');select().value=other;consent().checked=true;
  send();await settle(10);
  typeInto(env,body(),'A synthetic question body that is long enough, now edited');body().focus();
  env.state.submitGate.resolve();await settle(20);
  assert.equal(title().value,'','the title that was sent is cleared');
  assert.equal(body().value,'A synthetic question body that is long enough, now edited','the newer body stays');
  assert.equal(select().value,other,'the category stays with the unsent text');
  assert.equal(consent().checked,false);is(env.doc.activeElement,body());
  assert.match(env.$('discussion-message').textContent,/earlier version was submitted/);
  // Unchanged while sending: everything returns to its default.
  env.state.submitGate=deferred();typeInto(env,title(),'A second synthetic topic title');consent().checked=true;send();await settle(10);
  env.state.submitGate.resolve();await settle(20);
  assert.deepEqual([title().value,body().value,select().value,consent().checked],['','',forumData.categories[0].id,false]);
  assert.match(env.$('discussion-message').textContent,/^Submitted for moderation\./);
 }finally{await done(env);}
});

test('a submission that finishes after an account change touches nothing',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  env.state.replyOk=true;env.state.submitGate=deferred();
  open(T1);await settle(10);
  typeInto(env,env.$('reply-body'),'Synthetic reply in flight during a switch');env.$('topic-detail').querySelector('.discussion-consent input').checked=true;
  env.$('reply-body').closest('form').dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));await settle(10);
  for(const fn of env.state.authListeners)fn('SIGNED_IN',{user:{id:'adult-2'}});env.state.user='adult-2';await settle(40);
  env.state.submitGate.resolve();await settle(20);
  assert.doesNotMatch(env.$('discussion-message').textContent,/Submitted|earlier version/,'no success message for the earlier account');
  open(T1);await settle(10);
  assert.equal(env.$('reply-body')?.value??'','','the new account sees no draft');
 }finally{await done(env);}
});

test('a reply that finishes after moving to another topic names its discussion and keeps newer text as that topic’s draft',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const area=()=>env.$('reply-body'),consent=()=>env.$('topic-detail').querySelector('.discussion-consent input');
  const send=()=>{area().closest('form').dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));};
  env.state.replyOk=true;
  // Newer text typed while sending, then another topic opened before the answer.
  env.state.submitGate=deferred();open(T1);await settle(10);
  typeInto(env,area(),'Synthetic reply sent from topic one');consent().checked=true;send();await settle(10);
  typeInto(env,area(),'Synthetic reply sent from topic one, with more');
  open(T2);await settle(10);typeInto(env,area(),'Topic two text that must stay');
  env.state.submitGate.resolve();await settle(20);
  assert.equal(env.$('discussion-message').textContent,'Your reply to “First synthetic topic title” was submitted for moderation. What you typed while it was sending is kept as an unsent reply for that discussion.');
  assert.equal(area().value,'Topic two text that must stay','the open topic is untouched');
  open(T1);await settle(10);
  assert.equal(area().value,'Synthetic reply sent from topic one, with more','the newer text is that topic’s draft');
  // Unchanged, then another topic opened: named, nothing kept.
  env.state.submitGate=deferred();consent().checked=true;typeInto(env,area(),'A second synthetic reply for topic one');send();await settle(10);
  open(T2);await settle(10);
  env.state.submitGate.resolve();await settle(20);
  assert.equal(env.$('discussion-message').textContent,'Your reply to “First synthetic topic title” was submitted for moderation. Your username will appear with the text after a moderator approves it.');
  open(T1);await settle(10);
  assert.equal(area().value,'','nothing sent comes back as a draft');
 }finally{await done(env);}
});


test('a reply form rebuilt while its earlier reply is sending stays locked: no second request; it unlocks when that one settles',async()=>{
 for(const ok of [true,false]){
  const env=await community({mode:'account'});
  try{
   const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
   const area=()=>env.$('reply-body'),form=()=>area().closest('form'),button=()=>form().querySelector('button[type="submit"]');
   const consent=()=>env.$('topic-detail').querySelector('.discussion-consent input');
   const send=()=>{form().dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));};
   env.state.replyOk=ok;env.state.submitGate=deferred();
   open(T1);await settle(10);typeInto(env,area(),'Synthetic reply that is slow to send');consent().checked=true;send();await settle(10);
   open(T2);await settle(10);
   assert.equal(button().disabled,false,'another topic’s reply is not locked');typeInto(env,area(),'Topic two draft that must stay');
   open(T1);await settle(10);
   assert.equal(button().disabled,true,'the rebuilt form for the same topic is locked');
   assert.match(form().textContent,/Your earlier submission is still sending\./);
   consent().checked=true;send();await settle(10);
   assert.equal(env.state.submits,1,'no duplicate request while the first is in flight');
   env.state.submitGate.resolve();await settle(20);
   assert.equal(button().disabled,false,`unlocked after ${ok?'success':'failure'}`);
   assert.doesNotMatch(form().textContent,/still sending/);
   assert.equal(area().value,ok?'':'Synthetic reply that is slow to send',ok?'the restored copy of what was saved is cleared':'a failed send keeps the text');
   open(T2);await settle(10);assert.equal(area().value,'Topic two draft that must stay','other topics’ drafts are kept');
  }finally{await done(env);}
 }
});

test('a late answer for one account never unlocks another account’s pending reply to the same topic',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const area=()=>env.$('reply-body'),form=()=>area().closest('form'),button=()=>form().querySelector('button[type="submit"]');
  const send=text=>{typeInto(env,area(),text);env.$('topic-detail').querySelector('.discussion-consent input').checked=true;form().dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));};
  const a=deferred(),b=deferred();env.state.submitGates=[a,b];env.state.replyOk=true;
  open(T1);await settle(10);send('Synthetic reply from account one');await settle(10);
  for(const fn of env.state.authListeners)fn('SIGNED_IN',{user:{id:'adult-2'}});env.state.user='adult-2';await settle(40);
  open(T1);await settle(10);
  assert.equal(button().disabled,false,'the other account’s form is not locked by account one');
  send('Synthetic reply from account two');await settle(10);
  assert.equal(button().disabled,true);assert.equal(env.state.submits,2,'one request each');
  a.resolve();await settle(20);
  assert.equal(button().disabled,true,'account one’s late answer leaves account two’s send busy');
  assert.match(form().textContent,/still sending/,'the form says a submission is in flight');
  assert.doesNotMatch(env.$('discussion-message').textContent,/Submitted|earlier version/,'no message from account one');
  assert.equal(area().value,'Synthetic reply from account two','account two’s text is untouched');
  b.resolve();await settle(20);
  assert.equal(button().disabled,false,'released when account two’s own reply settles');
  assert.match(env.$('discussion-message').textContent,/^Submitted for moderation\./);
  assert.equal(env.state.submits,2,'no duplicate request');
 }finally{await done(env);}
});

test('signed out and back in as the same account while a reply is sending: the form stays locked until it settles, and the old text never returns',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const area=()=>env.$('reply-body'),button=()=>area().closest('form').querySelector('button[type="submit"]');
  const gate=deferred();env.state.submitGates=[gate];env.state.replyOk=true;
  open(T1);await settle(10);typeInto(env,area(),'Synthetic reply sent before signing out');
  env.$('topic-detail').querySelector('.discussion-consent input').checked=true;
  area().closest('form').dispatchEvent(env.event('submit',{bubbles:true,cancelable:true}));await settle(10);
  for(const fn of env.state.authListeners)fn('SIGNED_OUT',null);env.state.user=null;await settle(40);
  for(const fn of env.state.authListeners)fn('SIGNED_IN',{user:{id:'adult-1'}});env.state.user='adult-1';await settle(40);
  open(T1);await settle(10);
  assert.equal(area().value,'','the draft was cleared by the sign-out');
  assert.equal(button().disabled,true,'still locked: the earlier request for this account and topic is in flight');
  gate.resolve();await settle(20);
  assert.equal(button().disabled,false,'released when it settles');
  assert.equal(area().value,'','the old text never comes back');
  assert.doesNotMatch(env.$('discussion-message').textContent,/Submitted|earlier version/,'no message for the earlier session');
  assert.equal(env.state.submits,1);
 }finally{await done(env);}
});

/* ── Back/Forward restore rechecks the stored session (item 53) ─────── */
test('a restore by the same account keeps the reply draft; after a sign-out made while cached the private UI is gone',async()=>{
 const env=await community({mode:'account'});
 try{
  const open=id=>{env.key(env.$('forum-content'),`topic:${id}:link`).click();};
  const restore=async()=>{env.win.dispatchEvent(env.event('pageshow',{persisted:true}));await settle(40);};
  open(T1);await settle(10);
  typeInto(env,env.$('reply-body'),'Synthetic draft kept across a restore');
  const field=env.$('reply-body');field.focus();
  assert.equal(env.$('topic-composer').hidden,false);assert.equal(env.$('my-submissions').hidden,false);
  await restore();
  is(env.$('reply-body'),field,'the same field, not rebuilt');
  assert.equal(field.value,'Synthetic draft kept across a restore');is(env.doc.activeElement,field,'focus stays');
  env.state.user=null;                      // signed out in another tab while this page was cached
  await restore();
  assert.equal(env.$('reply-body'),null,'no reply composer');
  for(const id of ['topic-composer','my-submissions','moderation'])assert.equal(env.$(id).hidden,true,`${id} hidden`);
  assert.equal(env.$('my-submissions-list').children.length,0,'loaded private lists are emptied');
  env.state.user='adult-1';for(const fn of env.state.authListeners)fn('SIGNED_IN',{user:{id:'adult-1'}});await settle(40);
  open(T2);await settle(10);open(T1);await settle(10);
  assert.equal(env.$('reply-body').value,'','the draft did not survive the sign-out');
 }finally{await done(env);}
});
