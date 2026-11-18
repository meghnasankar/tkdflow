/* First-tournament guide: context (organization + discipline), item scope and
   browser-only checklist ticks. Pure logic, tested in Node. Ticks are personal
   reminders: nothing here certifies eligibility, registration or readiness.
   No personal data, account client or network is involved. */

export const ORGS=Object.freeze({
 all:{label:'All three organizations',short:'All organizations',events:null},
 usatkd:{label:'USA Taekwondo',short:'USA Taekwondo',events:'USATKD'},
 aau:{label:'AAU Taekwondo',short:'AAU Taekwondo',events:'AAU'},
 atu:{label:'American Taekwondo United',short:'ATU',events:'ATU'},
});
export const DISCIPLINES=Object.freeze({both:'Forms and sparring',forms:'Forms',sparring:'Sparring'});
export const DEFAULT_CONTEXT=Object.freeze({org:'all',discipline:'both'});
export const STORAGE_KEY='tkdflow.tournamentChecklist.v1';
const ITEM_ID=/^[a-z0-9][a-z0-9-]{1,59}$/;
const CONTEXT_KEY=/^(all|usatkd|aau|atu):(both|forms|sparring)$/;
const MAX_ITEMS=200;

export function parseContext(search=''){
 const params=new URLSearchParams(search);
 const org=params.get('org'),discipline=params.get('discipline');
 return {org:Object.hasOwn(ORGS,org??'')?org:'all',discipline:Object.hasOwn(DISCIPLINES,discipline??'')?discipline:'both'};
}
/** Query string for a shareable link; defaults are omitted. */
export function contextQuery({org,discipline}){
 const params=new URLSearchParams();
 if(org!=='all'&&Object.hasOwn(ORGS,org))params.set('org',org);
 if(discipline!=='both'&&Object.hasOwn(DISCIPLINES,discipline))params.set('discipline',discipline);
 return params.size?`?${params}`:'';
}
export const contextKey=({org,discipline})=>`${org}:${discipline}`;
export function contextLabel({org,discipline}){return `${ORGS[org]?.label||ORGS.all.label} · ${DISCIPLINES[discipline]||DISCIPLINES.both}`;}

/** Scope from data attributes: space-separated lists; empty means everyone. */
export function parseScope(value){return String(value||'').split(/\s+/).filter(Boolean);}
export function applies({orgs=[],disciplines=[]},{org,discipline}){
 const orgOk=!orgs.length||org==='all'||orgs.includes(org);
 const disciplineOk=!disciplines.length||discipline==='both'||disciplines.includes(discipline);
 return orgOk&&disciplineOk;
}
export function eventsHref(org){
 const code=ORGS[org]?.events;
 return code?`/competitions.html?organization=${encodeURIComponent(code)}&status=all`:'/competitions.html';
}

/** A plain count of items checked. The page states once, beside it, that ticks
 *  are reminders and do not confirm eligibility, registration or readiness. */
export function progressText(checked,total,ctx){
 return `${checked} of ${total} item${total===1?'':'s'} checked · ${contextLabel(ctx)}`;
}

/** Browser-only ticks, kept separately for each organization/discipline view.
 *  state: 'ok' | 'unavailable' (storage can't be read or used right now) |
 *  'corrupt' (the saved data couldn't be read when the page loaded, so it started
 *  empty) | 'damaged' (the saved data became unreadable after this page loaded;
 *  this tab keeps showing its ticks) | 'write-failed' (the last save failed) |
 *  'unsaved' (another tab's readable save was adopted, but some ticks here are
 *  still not stored). In every state but 'ok', the next tick tries again; an
 *  unreadable saved value is replaced only after the page has said so.
 *  Saving is best effort: it re-reads, merges and writes, so a different view
 *  already stored by another tab is kept, but two truly simultaneous saves can
 *  still end with the last one written.
 *  Saving re-reads what is stored and writes back only the views this tab has
 *  changed, so other tabs' ticks for other views are kept. For the same view the
 *  most recent save wins. Views changed here but not yet stored stay "unsaved"
 *  until a save succeeds, and another tab's update never replaces them. */
export function createChecklistStore(source=()=>globalThis.localStorage,{known=null}={}){
 let contexts={},state='ok',loaded=false;const dirty=new Set();
 const storage=()=>{const target=typeof source==='function'?source():source;if(!target)throw new Error('No storage');return target;};
 const clean=list=>[...new Set((Array.isArray(list)?list:[]).filter(id=>typeof id==='string'&&ITEM_ID.test(id)&&(!known||known.has(id))))].slice(0,MAX_ITEMS);
 /** Stored contexts, {} when nothing is stored, or null when the data can't be read. */
 function parse(raw){
  if(raw===null||raw===undefined)return {};
  try{
   const data=JSON.parse(raw);
   if(data?.version!==1||!data.contexts||typeof data.contexts!=='object'||Array.isArray(data.contexts))throw new Error('shape');
   const out={};for(const [key,list] of Object.entries(data.contexts))if(CONTEXT_KEY.test(key)){const c=clean(list);if(c.length)out[key]=c;}
   return out;
  }catch{return null;}
 }
 function load(){
  if(loaded)return;loaded=true;
  let raw;try{raw=storage().getItem(STORAGE_KEY);}catch{state='unavailable';return;}
  const parsed=parse(raw);
  if(parsed===null){contexts={};state='corrupt';}else contexts=parsed;
 }
 const withLocal=(base)=>{const next={...base};for(const k of dirty){if(contexts[k]?.length)next[k]=contexts[k];else delete next[k];}return next;};
 return {
  get state(){load();return state;},
  /** True while this tab shows ticks that aren't stored yet. */
  get unsaved(){load();return dirty.size>0;},
  get(key){load();return new Set(contexts[key]||[]);},
  /** Returns true when saved in the browser, false when kept only on this page. */
  set(key,ids){
   load();if(!CONTEXT_KEY.test(key))return false;
   const list=clean([...ids]);
   if(list.length)contexts[key]=list;else delete contexts[key];
   dirty.add(key);
   let target,raw;
   try{target=storage();raw=target.getItem(STORAGE_KEY);}catch{state='unavailable';return false;}
   const stored=parse(raw);
   // Data that became unreadable since this page loaded is never overwritten
   // unannounced: say so first; the visitor's next tick then replaces it.
   if(stored===null&&state!=='corrupt'&&state!=='damaged'){state='damaged';return false;}
   // Replacing unreadable data writes everything this tab knows; otherwise merge.
   const next=stored===null?{...contexts}:withLocal(stored);
   try{target.setItem(STORAGE_KEY,JSON.stringify({version:1,contexts:next}));}catch{state='write-failed';return false;}
   contexts=next;dirty.clear();state='ok';return true;
  },
  /** Another tab's saved value: adopt its views, keeping this tab's unsaved ones. Unreadable values are ignored. */
  external(raw){
   load();const parsed=parse(raw);
   if(parsed===null)return false;
   contexts=withLocal(parsed);
   // Readable data is back: clear the warning, unless ticks here still aren't stored.
   if(!dirty.size)state='ok';else if(state!=='write-failed')state='unsaved';
   return true;
  },
 };
}
export function storageMessage(state){
 if(state==='unavailable')return 'This browser isn’t letting the page use its storage right now, so your latest ticks are kept only on this page and are lost if you leave. Ticks saved here earlier may come back if the browser allows storage again. The checklist still works.';
 if(state==='write-failed')return 'Your latest ticks couldn’t be saved in this browser (it may be out of space). They’re still shown here, and the page tries again when you tick or untick an item. If you reload or leave now, the ticks last saved here come back without them.';
 if(state==='corrupt')return 'Saved ticks on this browser could not be read, so the checklist started empty. Ticking an item replaces the unreadable data.';
 if(state==='damaged')return 'The ticks saved in this browser became unreadable, so your latest tick wasn’t saved. Your ticks are still shown here; ticking or unticking an item replaces the unreadable data.';
 if(state==='unsaved')return 'Some of your latest ticks aren’t saved in this browser yet. They’re still shown here, and the page tries again when you tick or untick an item.';
 return 'Ticks are saved on this browser only.';
}
