/* Test-only: runs ONE header scenario in a fresh process (so the page-wide
   shared age store starts empty every time) and prints a JSON report.
   Usage: node tests/helpers/age-nav-scenario.mjs <scenario> */
import {installDom} from './mini-dom.mjs';

const scenario=process.argv[2];
const AGE_KEY='tkdflow.ageScreen.v1';
const {ACCOUNTS}=await import('../../js/config.js');
const {sessionStorageKey}=await import('../../js/lib/account-service.js');
const SESSION_KEY=sessionStorageKey(ACCOUNTS);

const ageInit={'initial-ineligible-session':'ineligible','initial-ineligible-accounts-off':'ineligible','ineligible-dedupe':'ineligible','eligible-member':'eligible'}[scenario];
const env=installDom({url:'https://tkdflow.com/companions/taegeuk-1.html',session:ageInit?{[AGE_KEY]:ageInit}:{}});
const {doc,el}=env;
const slot=el('li',{id:'nav-account'}),search=el('input',{type:'search',id:'q'});
doc.body.dataset.page='forms';
doc.body.append(el('header',{},el('ul',{},slot)),el('main',{},search));

// Count every read of the stored-session key (an under-13 tab must not read it).
let sessionReads=0;
const local=new Map();
if(['initial-ineligible-session','ineligible-dedupe','eligible-member'].includes(scenario))local.set(SESSION_KEY,'{"access_token":"synthetic"}');
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>{if(k===SESSION_KEY)sessionReads++;return local.has(k)?local.get(k):null;},setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)}});
if(scenario==='blocked-getter'||scenario==='page-writer-blocked')Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw new Error('SecurityError: storage blocked');}});
if(scenario==='blocked-setitem')Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:()=>null,setItem(){throw new Error('QuotaExceededError');},removeItem(){}}});

const site=await import('../../js/site.js');
const age=await import('../../js/lib/age-gate.js');
const links=()=>slot.children.map(a=>({text:a.textContent,href:a.getAttribute('href'),resolved:new URL(a.getAttribute('href'),env.location.href).pathname+new URL(a.getAttribute('href'),env.location.href).hash+new URL(a.getAttribute('href'),env.location.href).search}));
const out={scenario,initial:links(),initialSessionReads:sessionReads};
const fire=(type,init)=>env.win.dispatchEvent(env.event(type,init));

switch(scenario){
 case 'initial-ineligible-session':break;
 case 'initial-ineligible-accounts-off':
  out.offChanged=site.renderAccountNav({...ACCOUNTS,enabled:false});
  out.signupOffChanged=site.renderAccountNav({...ACCOUNTS,signupEnabled:false});
  out.after=links();break;
 case 'guest-then-answer':{
  slot.children[0].focus();
  out.recorded=age.sharedEligibilityStore().record('under-13');
  out.after=links();out.focusOnNew=doc.activeElement===slot.children[0];
  const node=slot.children[0];
  out.afterAdult=age.sharedEligibilityStore().record('adult');
  out.sameNodeAfterAdult=slot.children[0]===node;
  out.rerender=site.renderAccountNav();break;}
 case 'guest-answer-focus-elsewhere':
  search.focus();age.sharedEligibilityStore().record('under-13');
  out.after=links();out.focusStayed=doc.activeElement===search;break;
 case 'ineligible-dedupe':{
  const node=slot.children[0];node.focus();
  local.set(SESSION_KEY,'{"access_token":"refreshed"}');
  fire('storage',{key:SESSION_KEY});
  out.sameNodeAfterStorage=slot.children[0]===node;out.focusKept=doc.activeElement===node;
  fire('pageshow',{persisted:true});
  out.sameNodeAfterPageshow=slot.children[0]===node;out.after=links();
  out.sessionReadsTotal=sessionReads;break;}
 case 'blocked-getter':
 case 'blocked-setitem':{
  out.recorded=age.sharedEligibilityStore().record('under-13');
  out.after=links();
  out.separateStoreReads=age.createEligibilityStore().read();   // documents why the header uses the shared store
  fire('pageshow',{persisted:true});out.afterPageshow=links();break;}
 case 'page-writer':
 case 'page-writer-blocked':{
  // Resolve age-gate.js exactly as a js/pages/ writer (auth.js, profile.js) does.
  const fromPages=new URL('../lib/age-gate.js',new URL('../../js/pages/profile.js',import.meta.url)).href;
  const pageAge=await import(fromPages);
  out.sameModule=pageAge.sharedEligibilityStore===age.sharedEligibilityStore;
  slot.children[0].focus();
  out.recorded=pageAge.sharedEligibilityStore().record('under-13');
  out.after=links();out.focusOnNew=doc.activeElement===slot.children[0];break;}
 case 'eligible-member':
  out.member=links();
  local.delete(SESSION_KEY);fire('storage',{key:SESSION_KEY});
  out.guest=links();break;
 default:throw new Error('unknown scenario '+scenario);
}
process.stdout.write(JSON.stringify(out));
