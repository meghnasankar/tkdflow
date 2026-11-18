/* Keyboard focus through saved-learning changes, on the real Library
   (forms.js), My learning (learning.js) and lesson widget (learning-ui.js),
   driven by the REAL LearningState with a fake account client whose server
   replies are released by the test (confirm / fail / retry). Only the
   getLearningService() accessor is substituted, in this test process only.
   Assertions on elements are identity checks (no tree formatting). */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {installDom,settle} from './helpers/mini-dom.mjs';

const REAL=new URL('../js/lib/learning-service.js',import.meta.url).href+'?real';
const FAKE=`import {learningMessage as m} from ${JSON.stringify(REAL)};
export const learningMessage=m;
export function getLearningService(){return globalThis.__learnTest.service;}
export function setupNeeded(){return false;}`;
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(s,c,next){
 if(/(^|\\/)learning-service\\.js$/.test(s))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(FAKE)}),shortCircuit:true};
 return next(s,c);}`));
const {LearningState}=await import(REAL);
const {createBrowserLearningStore,applyLearningPatch}=await import('../js/lib/learning-model.js');

const forms=JSON.parse(readFileSync(new URL('../data/forms.json',import.meta.url),'utf8'));
const is=(a,b,msg='not the expected element')=>assert.ok(a===b,`${msg} (got ${a?.dataset?.fk||a?.id||a?.tagName})`);
const row=(form_id,over={})=>({form_id,saved:true,last_pose:null,pose_count:null,practised:false,studied_at:null,updated_at:'2026-11-10T10:00:00Z',...over});
let run=0;

/** Fake account server: my_learning returns `rows`; each set_learning waits for release(). */
function server(rows){
 const data=new Map(rows.map(r=>[r.form_id,{...r}])),calls=[],waiting=[];
 const client={rpc:(name,args)=>{
  if(name==='my_learning')return Promise.resolve({data:{version:1,records:[...data.values()]},error:null});
  calls.push(args);
  return new Promise(resolve=>waiting.push({args,resolve}));
 }};
 return {client,calls,
  /** Teardown: answer anything still waiting so no timer outlives a failed test. */
  flush(){while(waiting.length)waiting.shift().resolve({data:null,error:{code:'teardown',message:'Test ended'}});},
  async release(outcome='confirm'){
   const next=waiting.shift();assert.ok(next,'a save is waiting');
   if(outcome==='fail'){next.resolve({data:null,error:{code:'test',message:'Test failure'}});return;}
   const a=next.args,patch={};
   if(a.save_form!==null)patch.saved=a.save_form;if(a.practise!==null)patch.practised=a.practise;if(a.reset_progress)patch.reset=true;
   if(a.pose_index!==null){patch.last_pose=a.pose_index;patch.pose_count=a.pose_total;}
   const record=applyLearningPatch(data.get(a.lesson_id),a.lesson_id,patch,'2026-11-18T12:00:00Z');
   if(record)data.set(a.lesson_id,record);else data.delete(a.lesson_id);
   next.resolve({data:{version:1,record},error:null});
  },
  get waiting(){return waiting.length;}};
}
async function service({mode='account',rows=[],owner='owner-1',browserRows=null}={}){
 if(browserRows)localStorage.setItem('tkdflow.learning.browser.v1',JSON.stringify({version:1,records:browserRows}));
 const s=new LearningState({browserStore:createBrowserLearningStore(()=>globalThis.localStorage),ms:60000});
 const srv=server(rows);
 globalThis.__learnTest={service:s};
 if(mode==='account')await s.connect(srv.client,owner);
 else{localStorage.setItem('tkdflow.learning.browser.v1',JSON.stringify({version:1,records:rows}));await s.connect(null,null);}
 return {s,srv};
}
const fetchJson=async url=>({ok:true,status:200,text:async()=>JSON.stringify(forms),json:async()=>forms,url});

async function library(opts={}){
 const env=installDom({url:'https://tkdflow.com/forms.html'+(opts.search||''),fetch:fetchJson});const {doc,el}=env;
 doc.body.append(el('main',{id:'main'},el('p',{id:'hero-summary'}),el('form',{id:'search-form'},el('input',{type:'search',id:'search'})),
  el('div',{id:'org-tabs'}),el('details',{id:'filters'},el('span',{id:'filter-count'}),el('div',{id:'belt-options'}),el('div',{id:'level-options'}),el('input',{type:'checkbox',id:'lesson-only'})),
  el('select',{id:'sort'}),el('button',{type:'button',id:'clear-filters'}),el('div',{id:'forms-active-filters'}),el('p',{id:'results-summary'}),
  el('p',{id:'forms-learning-status'}),el('button',{type:'button',id:'forms-learning-retry'}),el('div',{id:'forms-grid'})));
 const svc=await service(opts);
 await import(`../js/pages/forms.js?run=${++run}`);await settle(10);
 return {...env,...svc,save:id=>doc.querySelector(`[data-fk="save:${id}"]`)};
}
async function myLearning(opts,view='saved'){
 const env=installDom({url:`https://tkdflow.com/learning.html?view=${view}`,fetch:fetchJson});const {doc,el}=env;
 doc.body.append(el('main',{id:'main'},el('p',{id:'learning-status'}),el('button',{type:'button',id:'learning-refresh'}),el('button',{type:'button',id:'learning-retry'}),
  el('a',{id:'learning-sign-in',href:'/auth.html'}),el('div',{id:'learning-import'},el('button',{type:'button',id:'learning-import-button'})),
  el('p',{id:'learning-summary'}),el('div',{id:'learning-tabs'}),el('div',{id:'learning-cards'})));
 const svc=await service(opts);
 await import(`../js/pages/learning.js?run=${++run}`);await settle(10);
 const cards=()=>doc.getElementById('learning-cards').children.filter(n=>n.dataset.form);
 return {...env,...svc,cards,key:k=>doc.querySelector(`[data-fk="${k}"]`)};
}
async function lessonWidget(opts,id='koryo'){
 const env=installDom({url:`https://tkdflow.com/${id}.html`});const {doc,el}=env;
 doc.body.append(el('main',{id:'main'},el('div',{class:'lesson-layout'})));
 const svc=await service(opts);
 const {mountLessonLearning}=await import('../js/lib/learning-ui.js');
 mountLessonLearning({id,title:'Koryo',count:52,player:{subscribe(){},select(){},index:0}});
 return {...svc,...env,key:k=>doc.querySelector(`.lesson-learning [data-fk="${k}"]`)};
}
const done=async env=>{env.srv?.flush();await settle(5);env.restore();globalThis.__learnTest=null;};

test('test model: like browsers, a disabled button cannot take focus; an aria-disabled one can',()=>{
 const env=installDom();
 try{
  const a=env.el('button',{disabled:''}),b=env.el('button',{'aria-disabled':'true'});env.doc.body.append(a,b);
  a.focus();is(env.doc.activeElement,env.doc.body,'disabled refuses focus');
  b.focus();is(env.doc.activeElement,b,'aria-disabled keeps focus');
  // Browser focus fix-up: a focused control that becomes hidden or disabled loses focus.
  b.hidden=true;is(env.doc.activeElement,env.doc.body,'hiding the focused control drops focus');
  const c=env.el('button');env.doc.body.append(c);c.focus();c.disabled=true;
  is(env.doc.activeElement,env.doc.body,'disabling the focused control drops focus');
  const box=env.el('div',{},env.el('button'));env.doc.body.append(box);box.children[0].focus();box.hidden=true;
  is(env.doc.activeElement,env.doc.body,'hiding a container that holds focus drops it');
 }finally{env.restore();}
});

test('Library: keyboard Unsave keeps focus while saving and after confirmation; a second press while saving writes nothing',async()=>{
 const env=await library({rows:[row('taegeuk-1'),row('koryo')]});
 try{
  env.save('taegeuk-1').focus();env.save('taegeuk-1').click();
  const busy=env.save('taegeuk-1');
  is(env.doc.activeElement,busy,'focus is on the rebuilt Save button, not <body>');
  assert.equal(busy.getAttribute('aria-disabled'),'true');assert.equal(busy.disabled,false,'busy, not natively disabled');
  busy.click();env.save('koryo').click();
  assert.equal(env.srv.calls.length,1,'no further write while one is pending');
  await env.srv.release('confirm');await settle(5);
  const after=env.save('taegeuk-1');
  is(env.doc.activeElement,after,'still focused after confirmation');
  assert.equal(after.getAttribute('aria-pressed'),'false');assert.equal(after.hasAttribute('aria-disabled'),false);
 }finally{await done(env);}
});

test('Library: a failed save keeps focus and the busy state until Retry succeeds',async()=>{
 const env=await library({rows:[row('taegeuk-1')]});
 try{
  env.save('taegeuk-1').focus();env.save('taegeuk-1').click();
  await env.srv.release('fail');await settle(5);
  is(env.doc.activeElement,env.save('taegeuk-1'),'focus kept after the failure');
  assert.equal(env.save('taegeuk-1').getAttribute('aria-disabled'),'true','still pending until retried');
  assert.equal(env.doc.getElementById('forms-learning-retry').hidden,false,'Retry is offered');
  env.save('taegeuk-1').click();assert.equal(env.srv.calls.length,1,'no new write while the failed change waits');
  env.s.retry();await settle(5);await env.srv.release('confirm');await settle(5);
  is(env.doc.activeElement,env.save('taegeuk-1'));assert.equal(env.save('taegeuk-1').hasAttribute('aria-disabled'),false);
 }finally{await done(env);}
});

test('lesson widget: Mark as practised keeps focus while saving, after confirmation and after a failure',async()=>{
 for(const outcome of ['confirm','fail']){
  const env=await lessonWidget({rows:[row('koryo')]});
  try{
   env.key('practised').focus();env.key('practised').click();
   const busy=env.key('practised');
   is(env.doc.activeElement,busy,`${outcome}: focused while saving`);assert.equal(busy.getAttribute('aria-disabled'),'true');
   busy.click();assert.equal(env.srv.calls.length,1,'no second write');
   await env.srv.release(outcome);await settle(5);
   is(env.doc.activeElement,env.key('practised'),`${outcome}: still focused`);
   if(outcome==='confirm')assert.equal(env.key('practised').getAttribute('aria-pressed'),'true');
  }finally{await done(env);}
 }
});

test('My learning, Saved: Unsave moves focus to the card now in its place, then to the empty-state link',async()=>{
 const env=await myLearning({rows:[row('taegeuk-1',{updated_at:'2026-11-17T10:00:00Z'}),row('chon-ji',{updated_at:'2026-11-16T10:00:00Z'}),row('koryo',{updated_at:'2026-11-15T10:00:00Z'})]});
 try{
  assert.deepEqual(env.cards().map(c=>c.dataset.form),['taegeuk-1','chon-ji','koryo']);
  env.key('save:chon-ji').focus();env.key('save:chon-ji').click();
  assert.deepEqual(env.cards().map(c=>c.dataset.form),['taegeuk-1','koryo'],'the middle card leaves Saved at once');
  is(env.doc.activeElement,env.key('open:koryo'),'focus moved to the card now in second place');
  await env.srv.release('confirm');await settle(5);
  is(env.doc.activeElement,env.key('open:koryo'),'and stays there after confirmation');
  env.key('save:taegeuk-1').click();await env.srv.release('confirm');await settle(5);
  env.key('save:koryo').focus();env.key('save:koryo').click();
  assert.equal(env.cards().length,0);
  is(env.doc.activeElement,env.key('learning:explore'),'last card gone: the empty-state link');
  await env.srv.release('confirm');await settle(5);
 }finally{await done(env);}
});

test('My learning: focus on a tab or elsewhere is never moved when cards change',async()=>{
 const env=await myLearning({rows:[row('taegeuk-1'),row('koryo')]});
 try{
  const tab=env.key('view:saved');tab.focus();
  env.s.update('koryo',{saved:false});await settle(5);
  is(env.doc.activeElement,env.key('view:saved'),'the focused tab keeps focus');
  const refresh=env.doc.getElementById('learning-refresh');
  assert.equal(refresh.disabled,false,'Refresh is busy, not natively disabled, while saving');
  assert.equal(refresh.getAttribute('aria-disabled'),'true');
  refresh.focus();is(env.doc.activeElement,refresh,'and it can hold focus while saving');
  env.key('view:saved').focus();   // the tab element was rebuilt; focus the current one
  await env.srv.release('confirm');await settle(5);
  is(env.doc.activeElement,env.key('view:saved'));
  assert.equal(refresh.getAttribute('aria-disabled'),'false');
 }finally{await done(env);}
});

test('an account switch discards the old pending change; a late reply cannot restore it',async()=>{
 const env=await library({rows:[row('taegeuk-1')]});
 try{
  env.save('taegeuk-1').click();assert.equal(env.srv.waiting,1);
  const other=server([row('koryo')]);
  await env.s.connect(other.client,'owner-2');await settle(5);
  assert.equal(env.s.snapshot().pending,0,'pending cleared for the new account');
  await env.srv.release('confirm');await settle(5);
  assert.equal(env.s.get('taegeuk-1'),null,'the old account’s late reply is ignored');
  assert.equal(env.save('koryo').getAttribute('aria-pressed'),'true');
 }finally{await done(env);}
});

test('browser mode still saves at once with focus kept and no busy state',async()=>{
 const env=await library({mode:'browser',rows:[row('taegeuk-1')]});
 try{
  env.save('taegeuk-1').focus();env.save('taegeuk-1').click();
  is(env.doc.activeElement,env.save('taegeuk-1'));
  assert.equal(env.save('taegeuk-1').hasAttribute('aria-disabled'),false);
  assert.equal(env.s.get('taegeuk-1'),null,'unsaved immediately');
 }finally{await done(env);}
});

test('saving controls are natively disabled only when saving is impossible',async()=>{
 const {saveFormButton}=await import('../js/lib/learning-ui.js');
 const env=installDom();
 try{
  const svc={snapshot:()=>({mode:'loading',pending:0}),get:()=>null,update:()=>assert.fail('no write while loading')};
  const b=saveFormButton({id:'koryo',name:'Koryo'},null,{mode:'loading',pending:0},svc);
  assert.equal(b.hasAttribute('disabled'),true);b.click();
  const busy=saveFormButton({id:'koryo',name:'Koryo'},null,{mode:'account',pending:1},{snapshot:()=>({mode:'account',pending:1}),get:()=>null,update:()=>assert.fail('no write while pending')});
  assert.equal(busy.hasAttribute('disabled'),false);assert.equal(busy.getAttribute('aria-disabled'),'true');busy.click();
 }finally{env.restore();}
});

test('My learning: the card links that can receive fallback focus name their form',async()=>{
 const env=await myLearning({rows:[row('koryo',{last_pose:3,pose_count:52,updated_at:'2026-11-17T10:00:00Z'}),row('chon-ji',{updated_at:'2026-11-16T10:00:00Z'})]},'all');
 try{
  const resume=env.key('open:koryo'),open=env.key('open:chon-ji');
  assert.equal(resume.textContent,'Resume lesson');assert.equal(resume.getAttribute('aria-label'),'Resume lesson: Koryo');
  assert.equal(open.textContent,'Open lesson');assert.equal(open.getAttribute('aria-label'),'Open lesson: Chon-Ji');
  for(const a of [resume,open])assert.ok(a.getAttribute('aria-label').startsWith(a.textContent),'the visible words start the accessible name');
 }finally{await done(env);}
});

/* Clear progress asks with confirm(); replace it per test and restore it. */
function withConfirm(answer){
 const calls=[],prev=globalThis.confirm;
 globalThis.confirm=msg=>{calls.push(msg);return typeof answer==='function'?answer(msg):answer;};
 return {calls,restore(){if(prev===undefined)delete globalThis.confirm;else globalThis.confirm=prev;}};
}

test('My learning, In progress: Clear progress moves focus to the card now in its place; while saving it neither asks nor writes',async()=>{
 const env=await myLearning({rows:[row('koryo',{last_pose:3,pose_count:52,updated_at:'2026-11-17T10:00:00Z'}),row('taegeuk-1',{last_pose:2,pose_count:20,updated_at:'2026-11-16T10:00:00Z'})]},'progress');
 const ask=withConfirm(true);
 try{
  assert.deepEqual(env.cards().map(c=>c.dataset.form),['koryo','taegeuk-1']);
  env.key('reset:koryo').focus();env.key('reset:koryo').click();
  assert.equal(ask.calls.length,1);assert.equal(env.srv.calls.length,1);assert.equal(env.srv.calls[0].reset_progress,true);
  assert.deepEqual(env.cards().map(c=>c.dataset.form),['taegeuk-1'],'koryo left In progress (it stays saved)');
  is(env.doc.activeElement,env.key('open:taegeuk-1'),'focus moved to the card now in its place');
  const busy=env.key('reset:taegeuk-1');
  assert.equal(busy.getAttribute('aria-disabled'),'true');assert.equal(busy.disabled,false);
  busy.click();
  assert.equal(ask.calls.length,1,'no second confirmation while saving');assert.equal(env.srv.calls.length,1,'and no write');
  await env.srv.release('confirm');await settle(5);
  is(env.doc.activeElement,env.key('open:taegeuk-1'));
  assert.equal(env.s.get('koryo').saved,true);assert.equal(env.s.get('koryo').last_pose,null);
 }finally{ask.restore();await done(env);}
});

test('My learning, Practised: clearing the last card focuses the empty-state link; a cancelled or overtaken confirmation writes nothing',async()=>{
 const env=await myLearning({rows:[row('chon-ji',{practised:true,saved:false,updated_at:'2026-11-17T10:00:00Z'}),row('koryo',{updated_at:'2026-11-16T10:00:00Z'})]},'practised');
 let ask=withConfirm(false);
 try{
  env.key('reset:chon-ji').click();
  assert.equal(ask.calls.length,1);assert.equal(env.srv.calls.length,0,'cancelled: no write');ask.restore();
  // A save starts while the dialog is open: the second live check stops the reset.
  ask=withConfirm(()=>{env.s.update('koryo',{saved:false});return true;});
  env.key('reset:chon-ji').click();
  assert.equal(env.srv.calls.length,1,'only the save that started during the dialog was written');
  assert.equal(env.srv.calls[0].lesson_id,'koryo');
  await env.srv.release('confirm');await settle(5);ask.restore();
  ask=withConfirm(true);
  env.key('reset:chon-ji').focus();env.key('reset:chon-ji').click();
  assert.equal(env.cards().length,0,'no practised forms left');
  is(env.doc.activeElement,env.key('learning:explore'),'focus moved to the empty-state link');
  await env.srv.release('confirm');await settle(5);
  is(env.doc.activeElement,env.key('learning:explore'));
 }finally{ask.restore();await done(env);}
});

test('My learning: Refresh and Import do nothing while a change is saving, and act once when ready',async()=>{
 const env=await myLearning({rows:[row('koryo'),row('taegeuk-1')]},'all');
 try{
  const counts={refresh:0,import:0};
  env.s.refresh=()=>{counts.refresh++;return Promise.resolve();};
  env.s.importBrowser=()=>{counts.import++;return Promise.resolve();};
  const refresh=env.doc.getElementById('learning-refresh'),importButton=env.doc.getElementById('learning-import-button');
  env.s.update('koryo',{saved:false});await settle(2);
  assert.equal(refresh.getAttribute('aria-disabled'),'true');assert.equal(importButton.getAttribute('aria-disabled'),'true');
  refresh.click();importButton.click();
  assert.deepEqual(counts,{refresh:0,import:0},'pending guards prevent both actions');
  await env.srv.release('confirm');await settle(5);
  assert.equal(refresh.getAttribute('aria-disabled'),'false');
  refresh.click();importButton.click();
  assert.deepEqual(counts,{refresh:1,import:1},'each acts exactly once when ready');
 }finally{await done(env);}
});

test('Clear progress has a visible busy style of its own (it is not a .btn)',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.reset-learning\[aria-disabled="true"\] \{[^}]*opacity:\.6;[^}]*cursor:not-allowed;/);
});

/* ── transient controls: Retry, Refresh, Import (the real buttons) ── */

test('Library: pressing the real Retry hands focus to the status while it retries; a later failure does not pull focus back',async()=>{
 const env=await library({rows:[row('taegeuk-1')]});
 try{
  const retry=env.doc.getElementById('forms-learning-retry'),status=env.doc.getElementById('forms-learning-status');
  env.save('taegeuk-1').click();await env.srv.release('fail');await settle(5);
  assert.equal(retry.hidden,false);
  retry.focus();retry.click();
  assert.equal(retry.hidden,true,'Retry hides as the retry starts');
  is(env.doc.activeElement,status,'focus moved to the status message, not <body>');
  assert.equal(status.getAttribute('tabindex'),'-1');
  await env.srv.release('fail');await settle(5);
  assert.equal(retry.hidden,false,'failed again: Retry is offered again');
  is(env.doc.activeElement,status,'focus is not pulled back to Retry');
  retry.focus();retry.click();
  assert.equal(env.srv.calls.length,3,'a failed (still pending) change stays retryable');
  await env.srv.release('confirm');await settle(5);
  is(env.doc.activeElement,status,'still on the status after confirmation');
  assert.equal(env.s.snapshot().pending,0);
 }finally{await done(env);}
});

test('Library: a Retry hidden by a background change never takes focus from the search box',async()=>{
 const env=await library({rows:[row('taegeuk-1')]});
 try{
  env.save('taegeuk-1').click();await env.srv.release('fail');await settle(5);
  const search=env.doc.getElementById('search');search.focus();
  env.s.retry();await settle(2);
  assert.equal(env.doc.getElementById('forms-learning-retry').hidden,true);
  is(env.doc.activeElement,search);
  await env.srv.release('confirm');await settle(5);is(env.doc.activeElement,search);
 }finally{await done(env);}
});

test('My learning: the real Retry and Refresh buttons hand focus to the status when they go away, and only then',async()=>{
 const env=await myLearning({rows:[row('koryo'),row('taegeuk-1')]},'all');
 try{
  const retry=env.doc.getElementById('learning-retry'),refresh=env.doc.getElementById('learning-refresh'),status=env.doc.getElementById('learning-status');
  env.key('save:koryo').click();await env.srv.release('fail');await settle(5);
  retry.focus();retry.click();
  assert.equal(retry.hidden,true);is(env.doc.activeElement,status,'Retry → status');
  await env.srv.release('confirm');await settle(5);is(env.doc.activeElement,status);
  refresh.focus();refresh.click();
  assert.equal(refresh.disabled,true,'Refresh is natively disabled while the list reloads');
  is(env.doc.activeElement,status,'Refresh → status while loading');
  await settle(10);
  assert.equal(refresh.disabled,false,'enabled again after loading');
  is(env.doc.activeElement,status,'focus is not pulled back to Refresh');
  const tab=env.key('view:all');tab.focus();
  refresh.click();await settle(10);
  is(env.doc.activeElement,env.key('view:all'),'a reload started elsewhere does not move focus from a tab');
 }finally{await done(env);}
});

test('My learning: Import stays focusable while importing; if the panel goes away, focus goes to the status',async()=>{
 const env=await myLearning({rows:[row('koryo')],browserRows:[row('chon-ji',{last_pose:1,pose_count:21})]},'all');
 try{
  const panel=env.doc.getElementById('learning-import'),button=env.doc.getElementById('learning-import-button'),status=env.doc.getElementById('learning-status');
  assert.equal(panel.hidden,false,'browser saves can be added');
  button.focus();button.click();
  assert.equal(env.srv.calls.length,1);
  is(env.doc.activeElement,button,'busy while importing, still focused');assert.equal(button.getAttribute('aria-disabled'),'true');
  await env.srv.release('confirm');await settle(5);
  assert.equal(panel.hidden,false,'browser saves are kept, so the panel stays');is(env.doc.activeElement,button);
  localStorage.removeItem('tkdflow.learning.browser.v1');env.s.emit();
  assert.equal(panel.hidden,true);is(env.doc.activeElement,status,'panel gone while focused: focus moved to the status');
 }finally{await done(env);}
});

test('lesson widget: the real Retry hands focus to the widget status through confirm and failure',async()=>{
 for(const outcome of ['confirm','fail']){
  const env=await lessonWidget({rows:[row('koryo')]});
  try{
   env.key('practised').click();await env.srv.release('fail');await settle(5);
   const retry=[...env.doc.querySelectorAll('.lesson-learning button')].find(b=>b.textContent==='Retry saving');
   const status=env.doc.querySelector('.lesson-learning [role="status"]');
   assert.equal(retry.textContent,'Retry saving');assert.equal(retry.hidden,false);
   retry.focus();retry.click();
   is(env.doc.activeElement,status,`${outcome}: focus on the widget status, not <body>`);
   await env.srv.release(outcome);await settle(5);
   is(env.doc.activeElement,status,`${outcome}: not pulled back`);
   assert.equal(retry.hidden,outcome==='confirm');
  }finally{await done(env);}
 }
});

const cardOrder=doc=>[...doc.querySelectorAll('[data-fk]')].map(e=>e.dataset.fk).filter(k=>k.startsWith('save:')).map(k=>k.slice(5));
test('Library search: cards render in the ranked order, across series, with no series regrouping',async()=>{
 const {applyState,stateFromParams}=await import('../js/lib/catalog.js');
 const p=await library({search:'?q=sa'});
 try{
  const shown=cardOrder(p.doc),ranked=applyState(forms,stateFromParams('?q=sa')).map(f=>f.id);
  assert.deepEqual(shown,ranked,'the page shows exactly the ranked order');
  assert.ok(shown.indexOf('do-san')<shown.indexOf('taegeuk-1'),'Do-San (name word "San") precedes Taegeuk forms that match only in their text');
  assert.equal(p.doc.querySelector('.style-header'),null,'no series headers while ranking');
 }finally{await done(p);}
});

test('Library search: the closest name leads across series, and the sort control says how results are ordered',async()=>{
 const first=doc=>cardOrder(doc)[0];
 const label=doc=>[...doc.getElementById('sort').children].find(o=>o.value==='curriculum').textContent;
 let p=await library({search:'?q=Won'});
 try{
  assert.equal(first(p.doc),'won-hyo','Won-Hyo (ITF) before the Kukkiwon forms that match only through the word Kukkiwon');
  assert.match(p.doc.getElementById('results-summary').textContent,/closest name matches first/);
  assert.equal(label(p.doc),'Closest name match, then curriculum');
 }finally{await done(p);}
 p=await library({search:'?q=Won&sort=name'});
 try{
  assert.doesNotMatch(p.doc.getElementById('results-summary').textContent,/closest/);
  assert.equal(label(p.doc),'Curriculum order','the default option keeps its plain label when another sort is chosen');
  assert.equal(p.doc.getElementById('sort').value,'name');
 }finally{await done(p);}
});
