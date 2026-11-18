/* Header account link: follows sign-in/sign-out from other tabs and pages
   restored by Back/Forward, without redrawing (and losing keyboard focus)
   when only the session token was refreshed. Runs the real site.js against a
   minimal fake page; no browser, account client or network. */
import {test} from 'node:test';
import assert from 'node:assert/strict';

class FakeNode {}
class FakeText extends FakeNode {constructor(t){super();this.text=String(t);}get textContent(){return this.text;}}
class FakeElement extends FakeNode {
 constructor(tag){super();this.tagName=tag.toUpperCase();this.attrs=new Map();this.children=[];this.dataset={};this.className='';this.style={setProperty(){}};}
 setAttribute(k,v){this.attrs.set(k,String(v));}
 getAttribute(k){return this.attrs.has(k)?this.attrs.get(k):null;}
 addEventListener(){}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 get textContent(){return this.children.map(c=>c.textContent).join('');}
 set textContent(v){this.children=[new FakeText(v)];}
 contains(n){return n===this||this.children.some(c=>c.contains?.(n));}
 querySelector(sel){return sel==='a'?this.children.find(c=>c.tagName==='A')||null:null;}
 focus(){globalThis.document.activeElement=this;}
}
const slot=new FakeElement('li');
const store=new Map();
globalThis.Node=FakeNode;
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null};
globalThis.document={
 body:{dataset:{page:'home'}},activeElement:null,
 getElementById:id=>id==='nav-account'?slot:null,
 querySelector:()=>null,querySelectorAll:()=>[],
 createElement:tag=>new FakeElement(tag),createTextNode:t=>new FakeText(t),
};
globalThis.window=new EventTarget();

const {ACCOUNTS}=await import('../js/config.js');
const {sessionStorageKey}=await import('../js/lib/account-service.js');
const {renderAccountNav}=await import('../js/site.js');   // renders once and starts watching, as on every page
const KEY=sessionStorageKey(ACCOUNTS);
const links=()=>slot.children.map(a=>`${a.textContent}→${a.getAttribute('href')}`);
const otherTab=(key,value)=>{if(key){if(value===null)store.delete(key);else store.set(key,value);}else store.clear();window.dispatchEvent(Object.assign(new Event('storage'),{key}));};
const restored=persisted=>window.dispatchEvent(Object.assign(new Event('pageshow'),{persisted}));

test('signed-out visitors see Log in and Join free on first render',()=>{
 assert.ok(ACCOUNTS.enabled&&ACCOUNTS.signupEnabled&&KEY,'shipped config has accounts and signup on');
 assert.deepEqual(links(),['Log in→/auth.html','Join free→/auth.html?mode=register']);
});

test('signing in from another tab switches the header to My profile',()=>{
 otherTab(KEY,'{"access_token":"first"}');
 assert.deepEqual(links(),['My profile→/profile.html']);
});

test('a token refresh in another tab keeps the same, still-focused link',()=>{
 const link=slot.children[0];document.activeElement=link;
 otherTab(KEY,'{"access_token":"refreshed"}');
 assert.equal(slot.children[0],link,'the existing link element is kept');
 assert.equal(document.activeElement,link,'keyboard focus is not lost');
 assert.equal(renderAccountNav(),false,'an unchanged state does not redraw');
});

test('a real sign-out in another tab replaces My profile with Log in and Join free',()=>{
 const before=slot.children[0];
 otherTab(KEY,null);
 assert.deepEqual(links(),['Log in→/auth.html','Join free→/auth.html?mode=register']);
 assert.notEqual(slot.children[0],before);
});

test('unrelated storage changes are ignored; a whole-storage change re-reads the session',()=>{
 const emit=key=>window.dispatchEvent(Object.assign(new Event('storage'),{key}));
 store.set(KEY,'{"access_token":"x"}');           // session present, but no session-key event yet
 emit('tkdflow.learning.browser.v1');
 assert.deepEqual(links(),['Log in→/auth.html','Join free→/auth.html?mode=register'],'another key does not re-read the session');
 emit(null);                                     // e.g. storage cleared or restored elsewhere: key is null
 assert.deepEqual(links(),['My profile→/profile.html']);
 otherTab(null);                                 // localStorage.clear() in another tab
 assert.deepEqual(links(),['Log in→/auth.html','Join free→/auth.html?mode=register']);
});

test('a page restored by Back/Forward after a sign-in or sign-out shows the current state',()=>{
 store.set(KEY,'{"access_token":"z"}');
 restored(false);
 assert.deepEqual(links(),['Log in→/auth.html','Join free→/auth.html?mode=register'],'a normal load already rendered; nothing to redo');
 restored(true);
 assert.deepEqual(links(),['My profile→/profile.html']);
 store.delete(KEY);restored(true);
 assert.deepEqual(links(),['Log in→/auth.html','Join free→/auth.html?mode=register']);
});

test('signup switched off or accounts disabled change the visible links',()=>{
 assert.equal(renderAccountNav({...ACCOUNTS,signupEnabled:false}),true);
 assert.deepEqual(links(),['Log in→/auth.html']);
 assert.equal(renderAccountNav({...ACCOUNTS,enabled:false}),true);
 assert.deepEqual(links(),['Log in→/auth.html']);
 assert.equal(renderAccountNav({...ACCOUNTS,enabled:false}),false);
 document.body.dataset.page='auth';
 assert.equal(renderAccountNav({...ACCOUNTS,enabled:false}),true,'the current-page marker is part of what is shown');
 assert.equal(slot.children[0].getAttribute('aria-current'),'page');
 document.body.dataset.page='home';renderAccountNav();
});

test('narrow desktop (769–900px) keeps nav and account labels on one line without touching other layouts',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 const start=css.indexOf('@media (min-width: 769px) and (max-width: 900px) {');
 assert.ok(start>0,'a narrow-desktop header rule exists');
 const block=css.slice(start,css.indexOf('\n}\n',start));
 assert.match(block,/\.navbar-logo \.kr \{ display: none; \}/,'the decorative Korean logotype gives way first');
 assert.match(block,/\.nav-links a:not\(\.btn\) \{[^}]*white-space: nowrap/);
 assert.match(block,/\.nav-account \.btn \{[^}]*white-space: nowrap/);
 assert.doesNotMatch(block,/grid|\.container|nav-toggle|\.nav-links \{|display: flex/,'only header spacing changes; grids and the mobile menu are untouched');
 const mobile=css.slice(css.indexOf('@media (max-width: 768px) {'));
 assert.match(mobile,/\.nav-toggle \{ display: inline-flex;/,'the mobile menu still takes over at 768px and below');
});

test('account links resolve to the site root from nested pages such as /companions/…, in every mode',()=>{
 const nested='https://tkdflow.com/companions/taegeuk-1.html';
 const resolved=()=>slot.children.map(a=>{const u=new URL(a.getAttribute('href'),nested);return u.pathname+u.search;});
 const modes=[
  ['accounts off',{...ACCOUNTS,enabled:false},null,['/auth.html']],
  ['guest, signup on',ACCOUNTS,null,['/auth.html','/auth.html?mode=register']],
  ['guest, signup off',{...ACCOUNTS,signupEnabled:false},null,['/auth.html']],
  ['member',ACCOUNTS,'{"access_token":"nested"}',['/profile.html']],
 ];
 for(const [name,cfg,session,want] of modes){
  if(session)store.set(KEY,session);else store.delete(KEY);
  renderAccountNav(cfg);
  assert.deepEqual(resolved(),want,name);
  for(const a of slot.children)assert.match(a.getAttribute('href'),/^\//,`${name}: root-absolute`);
 }
 store.delete(KEY);renderAccountNav();
});
