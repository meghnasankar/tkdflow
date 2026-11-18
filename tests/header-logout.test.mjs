/* Header "Log out": the real site.js in a minimal DOM. account-service.js is
   substituted in this test process only by a fake that re-exports the real
   storage helpers and counts getAccountService() calls, so the tests can prove
   the account client starts only on an explicit click. The real auth-flows
   logout() runs against synthetic clients; no network, no real session. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {installDom,settle} from './helpers/mini-dom.mjs';

const REAL=new URL('../js/lib/account-service.js',import.meta.url).href+'?real';
const FAKE=`export * from ${JSON.stringify(REAL)};
export function getAccountService(){const t=globalThis.__logoutTest;t.serviceCalls++;return t.service();}
export const initAccountService=getAccountService;
export const retryAccountService=getAccountService;`;
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(s,c,next){
 if(/(^|\\/)account-service\\.js$/.test(s)&&!s.includes('?real'))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(FAKE)}),shortCircuit:true};
 return next(s,c);}`));
const {ACCOUNTS}=await import('../js/config.js');
const {sessionStorageKey}=await import(REAL);
const KEY=sessionStorageKey(ACCOUNTS),AGE='tkdflow.ageScreen.v1';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
let run=0;

/** A page with a header slot; `client` decides what signOut does. */
async function header({member=true,age=null,client=null,serviceStatus='ready'}={}){
 const env=installDom({url:'https://tkdflow.com/forms.html',session:age?{[AGE]:age}:{}});
 const {doc,el}=env;doc.body.dataset.page='forms';
 const slot=el('li',{id:'nav-account'}),search=el('input',{type:'search',id:'q'});
 doc.body.append(el('header',{},el('ul',{},slot)),el('main',{},search));
 if(member)globalThis.localStorage.setItem(KEY,'{"access_token":"synthetic"}');
 const t=globalThis.__logoutTest={serviceCalls:0,signOuts:0,service:async()=>serviceStatus==='ready'?{status:'ready',client}:{status:'unavailable',reason:'test'}};
 const site=await import(`../js/site.js?run=${++run}`);
 const go=[];const deps={go:u=>go.push(u),ms:60};
 const button=()=>slot.children.find(c=>c.tagName==='BUTTON');
 const status=()=>slot.children.find(c=>c.classList?.contains('nav-logout-status'))?.textContent??null;
 const links=()=>slot.children.filter(c=>c.tagName==='A').map(a=>a.textContent);
 return {...env,site,slot,search,button,status,links,go,deps,t,click:()=>site.headerLogout({deps})};
}
const done=async e=>{await settle(5);e.restore();globalThis.__logoutTest=null;};
/** Synthetic client: signOut removes the local session ('ok'), fails keeping it ('fail'), or never answers ('hang'). */
function client(mode){
 const c={auth:{signOut:async()=>{globalThis.__logoutTest.signOuts++;
  if(mode==='hang')return new Promise(()=>{});
  if(mode==='fail')return {error:{message:'network'}};
  globalThis.localStorage.removeItem(KEY);return {error:null};}}};
 return c;
}

test('a page view never starts the account client; members see Log out next to My profile, others do not',async()=>{
 for(const [opts,expect] of [[{member:true},['My profile',true]],[{member:false},['Log in',false]],[{member:true,age:'ineligible'},['About accounts',false]]]){
  const h=await header(opts);
  try{
   assert.equal(h.links()[0],expect[0]);assert.equal(Boolean(h.button()),expect[1]);
   if(expect[1])assert.equal(h.button().textContent,'Log out');
   assert.equal(h.t.serviceCalls,0,'no account service on page view');
  }finally{await done(h);}
 }
});

test('Log out signs out locally, confirms the session is gone, then loads a fresh home page',async()=>{
 const h=await header({client:client('ok')});
 try{
  h.button().focus();const p=h.click();
  assert.equal(h.button().getAttribute('aria-disabled'),'true');assert.equal(h.button().textContent,'Logging out…');
  assert.equal(h.doc.activeElement,h.button(),'focus stays on the busy button');
  assert.equal(await p,'signed-out');
  assert.equal(h.t.serviceCalls,1);assert.equal(h.t.signOuts,1);
  assert.equal(globalThis.localStorage.getItem(KEY),null);assert.deepEqual(h.go,['/']);
 }finally{await done(h);}
});

test('a failed sign-out keeps the visitor here with a retryable message, and never claims success',async()=>{
 const h=await header({client:client('fail')});
 try{
  h.button().focus();
  assert.equal(await h.click(),'error');
  assert.deepEqual(h.go,[],'no navigation while a session remains');
  assert.notEqual(globalThis.localStorage.getItem(KEY),null);
  assert.equal(h.status(),'Couldn’t log out. Try again.');
  assert.equal(h.button().getAttribute('aria-disabled'),null);assert.equal(h.button().textContent,'Log out');
  assert.equal(h.doc.activeElement,h.button(),'focus kept for the retry');
  assert.equal(await h.click(),'error');assert.equal(h.t.signOuts,2,'retry makes a new attempt');
 }finally{await done(h);}
});

test('a client that never answers times out as a failure; an unavailable service says so',async()=>{
 const h=await header({client:client('hang')});
 try{assert.equal(await h.click(),'error');assert.deepEqual(h.go,[]);assert.equal(h.status(),'Couldn’t log out. Try again.');}
 finally{await done(h);}
 const u=await header({serviceStatus:'unavailable'});
 try{assert.equal(await u.click(),'unavailable');assert.equal(u.status(),'Log out isn’t available right now. Reload this page and try again.','the service keeps an unavailable result, so the message asks for a reload');assert.deepEqual(u.go,[]);}
 finally{await done(u);}
});

test('double clicks and key repeats make one attempt',async()=>{
 const gate=deferred(),c={auth:{signOut:async()=>{globalThis.__logoutTest.signOuts++;await gate.promise;globalThis.localStorage.removeItem(KEY);return {error:null};}}};
 const h=await header({client:c});
 try{
  const first=h.click();assert.equal(await h.click(),'busy');h.button().click();
  await settle(2);gate.resolve();assert.equal(await first,'signed-out');
  assert.equal(h.t.signOuts,1);assert.equal(h.t.serviceCalls,1);assert.deepEqual(h.go,['/']);
 }finally{await done(h);}
});

test('a known under-13 result recorded on this page before the click starts nothing',async()=>{
 const h=await header({client:client('ok')});
 try{
  globalThis.sessionStorage.setItem(AGE,'ineligible');
  assert.equal(await h.click(),'ineligible');assert.equal(h.t.serviceCalls,0);assert.deepEqual(h.go,[]);
 }finally{await done(h);}
});

test('another tab signing out mid-attempt shows guest links, and the attempt still ends on the home page',async()=>{
 const gate=deferred(),c={auth:{signOut:async()=>{globalThis.__logoutTest.signOuts++;await gate.promise;return {error:null};}}};
 const h=await header({client:c});
 try{
  h.button().focus();const p=h.click();
  globalThis.localStorage.removeItem(KEY);h.win.dispatchEvent(h.event('storage',{key:KEY}));
  assert.deepEqual(h.links(),['Log in','Join free']);assert.equal(h.button(),undefined);
  assert.equal(h.doc.activeElement,h.slot.children[0],'focus moves to the first header link, as today');
  gate.resolve();assert.equal(await p,'signed-out');assert.deepEqual(h.go,['/']);
 }finally{await done(h);}
});

test('a page restored by Back/Forward never keeps an old "Logging out…"',async()=>{
 const gate=deferred(),c={auth:{signOut:async()=>{await gate.promise;return {error:{message:'late'}};}}};
 const h=await header({client:c});
 try{
  h.click();assert.equal(h.button().textContent,'Logging out…');
  h.win.dispatchEvent(h.event('pageshow',{persisted:true}));
  assert.equal(h.button().textContent,'Log out');assert.equal(h.button().getAttribute('aria-disabled'),null);
  gate.resolve();await settle(5);
 }finally{await done(h);}
});

const okClient=()=>({auth:{signOut:async()=>{globalThis.__logoutTest.signOuts++;globalThis.localStorage.removeItem(KEY);return {error:null};}}});
test('an attempt restored away by Back/Forward while the service loads never signs out, navigates or unlocks the newer attempt',async()=>{
 const h=await header();
 try{
  const first=deferred(),second=deferred();let n=0;h.t.service=()=>(n++===0?first.promise:second.promise);
  h.button().focus();const p1=h.click();
  h.win.dispatchEvent(h.event('pageshow',{persisted:true}));
  assert.equal(h.button().textContent,'Log out','the restored page is not busy');
  const p2=h.click();assert.equal(h.button().textContent,'Logging out…');
  first.resolve({status:'ready',client:okClient()});
  assert.equal(await p1,'stale');
  assert.equal(h.t.signOuts,0,'the old attempt never signs out');assert.deepEqual(h.go,[]);
  assert.equal(h.button().getAttribute('aria-disabled'),'true','the newer attempt stays busy');assert.equal(h.status(),'');
  second.resolve({status:'ready',client:okClient()});
  assert.equal(await p2,'signed-out');assert.equal(h.t.signOuts,1);assert.deepEqual(h.go,['/']);
 }finally{await done(h);}
});

test('an under-13 result recorded while the service loads stops before signing out',async()=>{
 const h=await header();
 try{
  const gate=deferred();h.t.service=()=>gate.promise;
  const p=h.click();
  globalThis.sessionStorage.setItem(AGE,'ineligible');
  gate.resolve({status:'ready',client:okClient()});
  assert.equal(await p,'ineligible');
  assert.equal(h.t.signOuts,0);assert.deepEqual(h.go,[]);
  assert.deepEqual(h.links(),['About accounts']);assert.equal(h.button(),undefined);
  assert.notEqual(globalThis.localStorage.getItem(KEY),null,'nothing is signed out or cleared');
 }finally{await done(h);}
});

test('a sign-out already sent before Back/Forward cannot be recalled, but its late answer leaves the newer attempt alone',async()=>{
 const h=await header();
 try{
  const late=deferred(),newer=deferred();let n=0;
  const slow=(gate,result)=>({auth:{signOut:async()=>{globalThis.__logoutTest.signOuts++;await gate.promise;return result;}}});
  h.t.service=async()=>({status:'ready',client:n++===0?slow(late,{error:{message:'late'}}):slow(newer,{error:{message:'newer failed'}})});
  const p1=h.click();await settle(4);assert.equal(h.t.signOuts,1,'the first sign-out request was sent');
  h.win.dispatchEvent(h.event('pageshow',{persisted:true}));
  const p2=h.click();await settle(4);assert.equal(h.t.signOuts,2);
  late.resolve();assert.equal(await p1,'stale');
  assert.equal(h.button().textContent,'Logging out…','the late failure does not unlock the newer attempt');assert.equal(h.status(),'');assert.deepEqual(h.go,[]);
  newer.resolve();assert.equal(await p2,'error');assert.equal(h.status(),'Couldn’t log out. Try again.','only the current attempt reports');
 }finally{await done(h);}
});

test('when no session is left (another tab signed out), the attempt goes home instead of reporting a failure',async()=>{
 const h=await header({serviceStatus:'unavailable'});
 try{
  globalThis.localStorage.removeItem(KEY);
  assert.equal(await h.click(),'signed-out');assert.deepEqual(h.go,['/']);assert.equal(h.status(),'');
 }finally{await done(h);}
});

test('a restored page with no new click ignores the old attempt entirely',async()=>{
 const h=await header();
 try{
  const gate=deferred();h.t.service=()=>gate.promise;
  const p=h.click();
  h.win.dispatchEvent(h.event('pageshow',{persisted:true}));
  gate.resolve({status:'ready',client:okClient()});
  assert.equal(await p,'stale');
  assert.equal(h.t.signOuts,0);assert.deepEqual(h.go,[],'no navigation from the restored page');
  assert.equal(h.button().textContent,'Log out');assert.equal(h.status(),'');
  assert.notEqual(globalThis.localStorage.getItem(KEY),null);
 }finally{await done(h);}
});

/** Make reads of the session key throw from now on (as blocked storage would); the record itself stays. */
const blockSessionReads=()=>{const store=globalThis.localStorage,orig=store.getItem.bind(store);store.getItem=k=>{if(k===KEY)throw new DOMException('blocked','SecurityError');return orig(k);};return orig;};
test('unreadable storage is never taken as proof of logout: a failed or successful answer stays here with a retryable message',async()=>{
 for(const answer of ['fail','ok-but-unreadable']){
  let read=null;
  const c={auth:{signOut:async()=>{globalThis.__logoutTest.signOuts++;read=blockSessionReads();return answer==='fail'?{error:{message:'network'}}:{error:null};}}};
  const h=await header({client:c});
  try{
   h.button().focus();
   assert.equal(await h.click(),'unconfirmed',answer);
   assert.deepEqual(h.go,[],`${answer}: no navigation`);
   assert.equal(read(KEY),'{"access_token":"synthetic"}',`${answer}: the stored record is still there`);
   assert.equal(h.status(),'Couldn’t confirm that you’re logged out in this browser. Try again.');
   assert.equal(h.button().textContent,'Log out');assert.equal(h.doc.activeElement,h.button(),'retryable, focus kept');
  }finally{await done(h);}
 }
});
