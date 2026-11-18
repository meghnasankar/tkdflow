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

const FAKE_ACCOUNT=`export const UNAVAILABLE_REASON='Test: unavailable.';
export const accountsConfigured=()=>true;export const sessionStorageKey=()=>'test-session';
export const hasStoredSession=()=>Boolean(globalThis.__testAccount?.session);export const withTimeout=p=>p;
export const friendlyError=(e,f='Test error')=>f;
export function getAccountService(){return globalThis.__testAccount?.service()??Promise.resolve({status:'unavailable',reason:'Test'});}
export const initAccountService=getAccountService;`;
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

async function community({search='',mode='public',reducedMotion=false,topics=[topic(T1,'First synthetic topic title'),topic(T2,'Second synthetic topic title')]}={}){
 const state={topics,replies:[reply(R1,T1)],replyGate:null};
 const rest=async url=>{
  const u=new URL(url),table=u.pathname.split('/').pop();
  const rows=table==='discussion_topics'?state.topics.filter(t=>!u.searchParams.get('id')||u.searchParams.get('id')===`eq.${t.id}`):state.replies.filter(r=>u.searchParams.get('topic_id')===`eq.${r.topic_id}`);
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
  el('section',{id:'topic-detail',hidden:''}),el('div',{id:'forum-content'}),el('section',{id:'topic-composer',hidden:''}),
  el('section',{id:'my-submissions',hidden:''},el('button',{type:'button',id:'refresh-submissions'}),el('div',{id:'my-submissions-list'})),
  el('section',{id:'moderation',hidden:''},el('button',{type:'button',id:'load-moderation'}),el('div',{id:'moderation-queue'}))));
 if(mode==='account'){
  const query=table=>{const filters=[];const run=async()=>{
   if(filters.some(f=>f[0]==='neq'))return {data:[],error:null};
   if(table==='discussion_replies'&&state.replyGate)await state.replyGate.promise;
   const list=table==='discussion_topics'?state.topics:state.replies;
   const rows=list.filter(r=>filters.every(([,k,v])=>String(r[k])===String(v)));
   return {data:rows,error:null};};
   const q={select:()=>q,order:()=>q,limit:()=>q,eq:(k,v)=>{filters.push(['eq',k,v]);return q;},neq:(k,v)=>{filters.push(['neq',k,v]);return q;},maybeSingle:()=>run().then(r=>({data:r.data[0]||null,error:null})),then:(a,b)=>run().then(a,b)};return q;};
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'adult-1'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),stopAutoRefresh:async()=>{}},
   from:query,rpc:async name=>name==='discussion_access'?{data:{adult:true,moderator:false},error:null}:{data:null,error:{message:'test'}}};
  globalThis.__testAccount={session:true,service:async()=>({status:'ready',client})};
 }else globalThis.__testAccount=null;
 await import(`../js/pages/forum.js?run=${++run}`);
 await settle(40);
 const $=id=>doc.getElementById(id),key=(root,k)=>root.querySelectorAll('[data-fk]').find(n=>n.dataset.fk===k);
 return {...env,state,$,key,refresh:async()=>{$('refresh-discussions').click();await settle(40);}};
}
const done=env=>{env.restore();globalThis.__testAccount=null;};
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
  }finally{done(env);}
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
  }finally{done(env);}
 }
});

test('choosing a category keeps focus on the category button after the list is rebuilt',async()=>{
 const env=await community();
 try{
  const button=env.key(env.$('category-nav'),'cat:technique-qa');button.focus();button.click();
  assert.equal(fk(env.doc.activeElement),'cat:technique-qa');
  assert.equal(env.doc.activeElement.getAttribute('aria-pressed'),'true');
 }finally{done(env);}
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
 }finally{done(env);}
});

test('a focused topic removed by a refresh hands focus to the results summary',async()=>{
 const env=await community();
 try{
  env.key(env.$('forum-content'),`topic:${T2}:read`).focus();
  env.state.topics=env.state.topics.filter(t=>t.id!==T2);
  await env.refresh();
  is(env.doc.activeElement,env.$('forum-summary'));
 }finally{done(env);}
});

test('a deep link opens the discussion without moving focus or scrolling',async()=>{
 const env=await community({search:`?topic=${T1.toUpperCase()}`});
 try{
  assert.equal(env.$('topic-detail').hidden,false);
  assert.ok(env.$('topic-detail-title'));
  is(env.doc.activeElement,env.doc.body);
  assert.equal(env.doc.scrolls.length,0);
 }finally{done(env);}
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
 }finally{done(env);}
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
 }finally{done(env);}
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
 }finally{done(env);}
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
 }finally{done(env);}
});
