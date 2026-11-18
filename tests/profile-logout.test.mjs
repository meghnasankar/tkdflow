/* Profile "Log out" and sign-out notices: the real profile.js on the real
   profile.html in a minimal DOM. account-service.js is substituted in this test
   process only by a fake that re-exports the real storage helpers and hands out
   a synthetic client; the real auth-flows logout() runs. No network, no real
   session, no credential: the "session" is synthetic text in a fake storage. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';

const REAL=new URL('../js/lib/account-service.js',import.meta.url).href+'?real';
const FAKE=`export * from ${JSON.stringify(REAL)};
export function getAccountService(){return globalThis.__profileTest.service();}
export const initAccountService=getAccountService;`;
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(s,c,next){
 if(/(^|\\/)account-service\\.js$/.test(s)&&!s.includes('?real'))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(FAKE)}),shortCircuit:true};
 return next(s,c);}`));
const {ACCOUNTS}=await import('../js/config.js');
const {sessionStorageKey,storedSessionState,logoutVerdict,LOGOUT_MESSAGES}=await import(REAL);
const KEY=sessionStorageKey(ACCOUNTS),AGE='tkdflow.ageScreen.v1';
const html=readFileSync(new URL('../profile.html',import.meta.url),'utf8');
const main=html.slice(html.indexOf('<main'),html.indexOf('</main>')+7);
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const USER_A='00000000-0000-4000-8000-00000000000a',USER_B='00000000-0000-4000-8000-00000000000b';
const profileRow=id=>({id,full_name:'Synthetic Member',username:'synthetic_member',age:30,belt_level:'Green',school_name:null,school_directory_id:null,school_country:null,school_region:null,school_city:null,school_website:null,created_at:'2026-11-01T00:00:00Z'});
let run=0;

/** The profile page signed in as a synthetic adult. `signOut` decides what the client does:
 *  'ok' removes the stored session; 'fail' errors and keeps it; 'keep-stored' ends the
 *  client's session but leaves the stored copy; a deferred holds the answer. */
async function page({signOut='ok',gate=null,effects=true}={}){
 const env=installDom({url:'https://tkdflow.com/profile.html',fetch:async()=>{throw new Error('no network in tests');}});
 parseInto(env.doc,env.doc.body,main);
 const assigned=[];env.location.assign=u=>assigned.push(u);
 const ls=globalThis.localStorage;ls.setItem(KEY,'{"access_token":"synthetic-only"}');
 const removed=[];const removeItem=ls.removeItem;ls.removeItem=k=>{removed.push(k);return removeItem(k);};
 let session={user:{id:USER_A,email:'synthetic-a@example.invalid'}};const listeners=[],signOuts=[];
 const notify=(e,s)=>{for(const fn of listeners)fn(e,s);};
 const query=table=>{const q={select:()=>q,eq:()=>q,neq:()=>q,in:()=>q,order:()=>q,range:()=>q,limit:()=>q,
  maybeSingle:async()=>({data:table==='profiles'&&session?profileRow(session.user.id):null,error:null}),
  then:(a,b)=>Promise.resolve({data:[],error:null}).then(a,b)};return q;};
 const sdk={removeStored:()=>removeItem(KEY)};   // the SDK's own storage write, not page code
 const client={from:query,rpc:async()=>({data:null,error:null}),auth:{
  getSession:async()=>({data:{session},error:null}),
  getUserIdentities:async()=>({data:{identities:[{provider:'email'}]},error:null}),
  linkIdentity:async()=>({error:{message:'synthetic'}}),
  onAuthStateChange:fn=>{listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}};},
  signOut:async opts=>{signOuts.push(opts);if(gate)await gate.promise;
   if(!effects)return {error:null};   // the test plays the session changes itself
   if(signOut==='fail')return {error:{message:'synthetic network'}};
   session=null;if(signOut!=='keep-stored')sdk.removeStored();notify('SIGNED_OUT',null);return {error:null};}}};
 globalThis.__profileTest={service:async()=>({status:'ready',client})};
 await import(`../js/pages/profile.js?run=${++run}`);await settle(20);
 const $=id=>env.doc.getElementById(id);
 return {...env,$,assigned,removed,signOuts,notify,setSession:s=>{session=s;},
  click:async()=>{$('btn-logout').click();await settle(20);},
  msgText:()=>$('pmsg').hidden?'':$('pmsg').textContent,
  privateHidden:()=>$('profile-wrap').hidden===true&&$('profile-state').hidden===false,
  title:()=>$('state-title').textContent,text:()=>$('state-text').textContent};
}
const done=async p=>{await settle(5);p.restore();globalThis.__profileTest=null;};
const blockStorageReads=()=>{const ls=globalThis.localStorage,get=ls.getItem;ls.getItem=k=>{if(k===KEY)throw new Error('SecurityError (synthetic)');return get(k);};};

test('the strict proof: present, absent, or unknown when storage cannot be read; it never writes',()=>{
 const writes=[];const box=(v)=>({getItem:()=>v,setItem:()=>writes.push('set'),removeItem:()=>writes.push('remove')});
 assert.equal(storedSessionState(ACCOUNTS,box('{"x":1}')),'present');
 assert.equal(storedSessionState(ACCOUNTS,box(null)),'absent');
 assert.equal(storedSessionState(ACCOUNTS,{getItem(){throw new Error('blocked');}}),'unknown');
 assert.equal(storedSessionState(ACCOUNTS,null),'unknown');
 assert.equal(storedSessionState({...ACCOUNTS,supabaseUrl:'not a url'},box(null)),'unknown');
 assert.deepEqual(writes,[]);
 assert.deepEqual(logoutVerdict('absent'),{verified:true,message:''});
 assert.equal(logoutVerdict('unknown','unavailable').message,LOGOUT_MESSAGES.unknown,'unknown is never presented as signed out');
 assert.equal(logoutVerdict('present','unavailable').message,LOGOUT_MESSAGES.unavailable);
 assert.equal(logoutVerdict('present').message,LOGOUT_MESSAGES.error);
});

test('Log out on the profile: confirmed absent → home page; only the local scope; no keys removed by page code',async()=>{
 const p=await page();
 try{
  assert.equal(p.$('profile-wrap').hidden,false,'the synthetic profile is shown');
  await p.click();
  assert.deepEqual(p.assigned,['/']);assert.deepEqual(p.signOuts,[{scope:'local'}]);
  assert.deepEqual(p.removed,[],'only the SDK removes its stored session');
 }finally{await done(p);}
});

test('a failed sign-out keeps the visitor on the profile with the shared wording',async()=>{
 const p=await page({signOut:'fail'});
 try{
  await p.click();
  assert.deepEqual(p.assigned,[]);assert.equal(p.msgText(),'Couldn’t log out. Try again.');
  assert.equal(p.$('profile-wrap').hidden,false,'still signed in, so the profile stays');
 }finally{await done(p);}
});

test('unreadable storage is not proof: no redirect, no “signed out” claim, private fields hidden',async()=>{
 const p=await page();
 try{
  blockStorageReads();
  await p.click();
  assert.deepEqual(p.assigned,[],'no redirect without a confirmed absence');
  assert.ok(p.privateHidden(),'the page session ended, so private fields are hidden');
  assert.equal(p.title(),'You’re signed out on this page');
  assert.equal(p.text(),'Couldn’t confirm that you’re logged out in this browser. Reload this page to check.');
  assert.doesNotMatch(p.$('profile-state').textContent,/You have been signed out/);
  assert.deepEqual(p.removed,[]);
 }finally{await done(p);}
});

test('a stored copy left behind: no redirect, and the notice says it may still be kept',async()=>{
 const p=await page({signOut:'keep-stored'});
 try{
  await p.click();
  assert.deepEqual(p.assigned,[]);assert.ok(p.privateHidden());
  assert.equal(p.title(),'You’re signed out on this page');
  assert.equal(p.text(),'This browser may still keep your sign-in. Reload this page to check.');
  assert.equal(p.msgText(),'Couldn’t log out. Try again.','the hidden form notice matches the header');
 }finally{await done(p);}
});

test('a sign-out from another tab: “You have been signed out” only when the stored session is gone',async()=>{
 for(const [stored,title] of [[false,'You have been signed out'],[true,'You’re signed out on this page']]){
  const p=await page();
  try{
   if(!stored)globalThis.localStorage.removeItem(KEY);
   p.setSession(null);p.notify('SIGNED_OUT',null);await settle(10);
   assert.ok(p.privateHidden());assert.equal(p.title(),title,`stored copy ${stored?'kept':'gone'}`);
  }finally{await done(p);}
 }
});

/* Identity changes during a slow Log out (deferred sign-out). The answer is used only
   when nothing changed, or exactly one change to signed out happened (this sign-out). */
const A={user:{id:USER_A,email:'synthetic-a@example.invalid'}},B={user:{id:USER_B,email:'synthetic-b@example.invalid'}};
const signedOutHere=p=>{globalThis.localStorage.removeItem(KEY);p.setSession(null);p.notify('SIGNED_OUT',null);};
const signedInHere=(p,s)=>{globalThis.localStorage.setItem(KEY,'{"access_token":"synthetic-only"}');p.setSession(s);p.notify('SIGNED_IN',s);};

test('own sign-out seen by the listener before the answer still loads the home page',async()=>{
 const gate=deferred(),p=await page({gate,effects:false});
 try{
  p.$('btn-logout').click();await settle(5);
  signedOutHere(p);await settle(10);
  assert.ok(p.privateHidden(),'private fields hidden at once');
  gate.resolve();await settle(20);
  assert.deepEqual(p.assigned,['/']);
 }finally{await done(p);}
});

test('signed out and back in as the same account during a slow Log out: the stale answer is dropped',async()=>{
 const gate=deferred(),p=await page({gate,effects:false});
 try{
  p.$('btn-logout').click();await settle(5);
  signedOutHere(p);await settle(10);signedInHere(p,A);await settle(20);
  gate.resolve();await settle(20);
  assert.deepEqual(p.assigned,[],'no redirect');assert.equal(p.msgText(),'','no message from the stale attempt');
  assert.equal(p.$('profile-wrap').hidden,false,'the re-signed-in profile is shown again');
 }finally{await done(p);}
});

test('another account, then signed out, during a slow Log out: the stale answer is dropped',async()=>{
 for(const steps of [[p=>signedInHere(p,B)],[p=>signedInHere(p,B),p=>signedOutHere(p)]]){
  const gate=deferred(),p=await page({gate,effects:false});
  try{
   p.$('btn-logout').click();await settle(5);
   for(const step of steps){step(p);await settle(20);}
   gate.resolve();await settle(20);
   assert.deepEqual(p.assigned,[],`no redirect after ${steps.length} identity change(s)`);
   assert.equal(p.msgText(),'','no message from the stale attempt');
  }finally{await done(p);}
 }
});

test('an under-13 result recorded during a slow Log out shows the public route, with no redirect',async()=>{
 const gate=deferred(),q=await page({gate});
 try{
  q.$('btn-logout').click();await settle(5);
  globalThis.sessionStorage.setItem(AGE,'ineligible');
  gate.resolve();await settle(20);
  assert.deepEqual(q.assigned,[]);assert.ok(q.privateHidden());
  assert.equal(q.title(),'You can use TKDflow without an account');
 }finally{await done(q);}
});

test('header, profile and password recovery share the strict proof and wording; nothing removes a key by hand',async()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const site=read('js/site.js'),profile=read('js/pages/profile.js'),auth=read('js/pages/auth.js');
 assert.ok(site.includes("stillSignedIn: () => storedSessionState(cfg) !== 'absent'")&&site.includes('logoutVerdict(state, outcome.kind)'),'header');
 assert.doesNotMatch(site,/function sessionState\(/,'no private copy of the proof');
 assert.doesNotMatch(profile,/hasStoredSession/,'the profile never uses the navbar’s cheap check as proof');
 assert.ok(auth.includes("stillSignedIn: () => storedSessionState() !== 'absent',"),'recovery reports a sign-out only when the stored session is confirmed absent');
 assert.ok(auth.includes('Password updated, but we couldn’t confirm that you’re logged out in this browser. Sign in with your new password.'));
 for(const [name,src] of [['site',site],['profile',profile],['auth',auth]])assert.doesNotMatch(src,/removeItem\(|scope: 'global'|scope:'global'/,`${name}: no manual key removal or global sign-out`);
 const {updatePassword}=await import('../js/lib/auth-flows.js');
 const c={auth:{updateUser:async()=>({error:null}),signOut:async()=>({error:null})}};
 assert.equal((await updatePassword(c,'Synthetic-pass-123','Synthetic-pass-123',{stillSignedIn:()=>true})).signedOut,false,'not proven absent → not reported as signed out');
 assert.equal((await updatePassword(c,'Synthetic-pass-123','Synthetic-pass-123',{stillSignedIn:()=>false})).signedOut,true);
});
