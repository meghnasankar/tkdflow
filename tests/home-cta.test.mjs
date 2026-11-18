/* Homepage closing banner: chosen from the real learning/account state machine,
   so members never see a signup invitation and stale responses cannot flip it. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LearningState,setupNeeded} from '../js/lib/learning-service.js';
import {createBrowserLearningStore} from '../js/lib/learning-model.js';
import {homeCta,LIBRARY_CTA,createCtaRenderer} from '../js/lib/home-cta.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ON={configured:true,signupEnabled:true};
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const fresh=()=>new LearningState({browserStore:createBrowserLearningStore(memory()),ms:200});
const kind=(state,opts=ON)=>homeCta(state.snapshot(),opts).kind;
/* The real renderer with a fake page: records each banner actually applied. */
function mount(state,opts=ON){const shown=[];state.subscribe(createCtaRenderer(next=>shown.push(next.kind),()=>opts));return {shown,current:()=>shown.at(-1)};}
const SETUP_ERROR={code:'42501',message:'Confirm your email and complete your profile first.'};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const clientWith=handler=>({rpc:(name,args)=>handler(name,args)});
const members=clientWith(async()=>({data:{version:1,records:[]},error:null}));

test('loading always shows the neutral library banner, matching the static first-load banner',()=>{
 const state=fresh();
 assert.equal(state.snapshot().mode,'loading');
 assert.deepEqual(homeCta(state.snapshot(),ON),LIBRARY_CTA);
 assert.deepEqual(homeCta(null,ON),LIBRARY_CTA);
 assert.equal(LIBRARY_CTA.title,'Keep learning at your own pace');
 const html=read('index.html');
 assert.match(html,/<h2 id="cta-title">Keep learning at your own pace<\/h2>/);
 assert.doesNotMatch(html.slice(html.indexOf('<main'),html.indexOf('</main>')),/Create a free account|mode=register/,'no static signup invitation in the homepage body');
});

test('a confirmed member with a completed profile sees Keep learning, never Create account',async()=>{
 const state=fresh();await state.connect(members,'member-a');
 const cta=homeCta(state.snapshot(),ON);
 assert.equal(cta.kind,'member');assert.equal(cta.title,'Keep learning');
 assert.deepEqual(cta.actions.map(a=>[a.href,a.label,!!a.primary]),[['/learning.html','My learning',true],['/forms.html','Browse the forms library',false]]);
 assert.doesNotMatch(JSON.stringify(cta),/register|Create|account-a|member-a|@/,'no signup link and no personal details');
});

test('a signed-in account without a confirmed email or completed profile is sent to finish setup',async()=>{
 const state=fresh();
 await state.connect(clientWith(async()=>({data:null,error:SETUP_ERROR})),'member-b');
 const snap=state.snapshot();
 assert.equal(snap.mode,'unavailable');assert.equal(snap.signedIn,true);assert.equal(snap.reason,'setup');
 const cta=homeCta(snap,ON);
 assert.equal(cta.kind,'setup');assert.equal(cta.actions[0].href,'/profile.html');
 assert.doesNotMatch(JSON.stringify(cta),/register|Create a free account/);
 assert.equal(setupNeeded({code:'42501',message:'Your sign-in changed. Reload your learning list.'}),false,'a session switch is not a setup problem');
 assert.equal(setupNeeded({code:'timeout',message:'Confirm your email'}),false);
});

test('signed-out visitors get the signup invitation only when accounts work and signup is on',async()=>{
 const state=fresh();await state.connect(members,null);
 assert.equal(kind(state),'signup');
 assert.equal(homeCta(state.snapshot(),ON).actions[0].href,'/auth.html?mode=register');
 assert.equal(kind(state,{configured:true,signupEnabled:false}),'library');
 assert.equal(kind(state,{configured:false,signupEnabled:true}),'library');
 const offline=fresh();await offline.connect(null,null);
 assert.equal(offline.snapshot().accountReady,false);
 assert.equal(kind(offline),'library','accounts disabled or unreachable: honest library fallback');
});

test('known under-13 visitors and failures get the library fallback, never signup',async()=>{
 const child=fresh();child.allowAccount=false;await child.connect(null,null);
 assert.equal(kind(child),'library');
 const failing=fresh();await failing.connect(clientWith(async()=>({data:null,error:{code:'timeout',name:'TimeoutError'}})),'member-a');
 assert.equal(failing.snapshot().reason,'error');assert.equal(kind(failing),'library');
 const unchecked=fresh();unchecked.unavailable();
 assert.equal(unchecked.snapshot().reason,'session');assert.equal(kind(unchecked),'library');
 assert.deepEqual(homeCta(unchecked.snapshot(),ON),LIBRARY_CTA);
});

test('rendered banner: every loading transition clears the previous signup or member banner at once',async()=>{
 const state=fresh(),page=mount(state);
 assert.deepEqual(page.shown,['library'],'first load renders the neutral banner');
 await state.connect(members,null);
 assert.equal(page.current(),'signup');
 // Signs in: the member list request is still pending.
 const slow=deferred(),signIn=state.connect(clientWith(()=>slow.promise),'member-a');
 assert.equal(state.snapshot().mode,'loading');
 assert.equal(page.current(),'library','signup is cleared immediately, not after the response');
 slow.resolve({data:{version:1,records:[]},error:null});await signIn;
 assert.equal(page.current(),'member');
 // Signs out or the session expires: member content is cleared immediately too.
 const out=deferred(),signOut=state.connect(clientWith(()=>out.promise),'member-b');
 assert.equal(page.current(),'library','member banner cleared while the next account loads');
 out.resolve({data:null,error:SETUP_ERROR});await signOut;
 assert.equal(page.current(),'setup');
 const setupLoad=deferred(),again=state.connect(clientWith(()=>setupLoad.promise),'member-a');
 assert.equal(page.current(),'library','setup banner cleared on the next load');
 setupLoad.resolve({data:{version:1,records:[]},error:null});await again;
 assert.deepEqual(page.shown,['library','signup','library','member','library','setup','library','member']);
});

test('rendered banner: a stale response cannot restore an earlier account’s banner',async()=>{
 const state=fresh(),page=mount(state);
 await state.connect(members,'member-a');assert.equal(page.current(),'member');
 const stale=deferred(),pending=state.connect(clientWith(()=>stale.promise),'member-b');
 assert.equal(page.current(),'library');
 await state.connect(members,null);                 // signed out before B's response
 assert.equal(page.current(),'signup');
 stale.resolve({data:{version:1,records:[]},error:null});await pending;
 assert.equal(page.current(),'signup','B’s late member response is ignored');
 const late=deferred(),second=state.connect(clientWith(()=>late.promise),'member-b');
 await state.connect(members,'member-a');
 late.resolve({data:null,error:SETUP_ERROR});await second;
 assert.equal(page.current(),'member','a late setup refusal does not replace the current member banner');
 const before=page.shown.length;state.emit();assert.equal(page.shown.length,before,'unchanged state does not re-render');
});

test('a slow response for a previous account cannot overwrite the current banner',async()=>{
 const state=fresh(),slow=deferred();
 const pending=state.connect(clientWith(()=>slow.promise),'member-a');
 await state.connect(members,null);          // signed out before member A's list arrived
 assert.equal(kind(state),'signup');
 slow.resolve({data:{version:1,records:[]},error:null});await pending;
 assert.equal(kind(state),'signup','the stale member response is ignored');
 const slowSetup=deferred(),second=state.connect(clientWith(()=>slowSetup.promise),'member-b');
 await state.connect(members,'member-a');
 slowSetup.resolve({data:null,error:SETUP_ERROR});await second;
 assert.equal(kind(state),'member','a stale setup refusal for another account is ignored');
});

test('the homepage wires the banner to the shared service without a second auth client or personal data',()=>{
 const home=read('js/pages/home.js');
 const cta=home.slice(home.indexOf('function cta()'),home.indexOf('forms();',home.indexOf('function cta()')));
 assert.match(cta,/getLearningService\(\)\.subscribe\(/);
 assert.match(cta,/getLearningService\(\)\.subscribe\(createCtaRenderer\(/,'the tested renderer is the one the page uses');
 assert.match(cta,/\(\) => \(\{ configured: accountsConfigured\(\), signupEnabled: ACCOUNTS\.signupEnabled \}\)/);
 assert.doesNotMatch(cta,/if \(!next/,'no path keeps a previous banner during loading');
 assert.doesNotMatch(home,/getAccountService|initAccountService|createClient|auth\.|getSession|fetchOwnProfile|email|username|full_name/,'no second client and no personal details');
 assert.doesNotMatch(home,/Create a free account/,'signup copy lives in the state-driven model only');
 const model=read('js/lib/home-cta.js');
 assert.doesNotMatch(model,/import /,'pure mapping');
});
