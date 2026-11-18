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
 *  state: 'ok' | 'unavailable' (storage blocked) | 'corrupt' (unreadable data,
 *  ignored and replaced only when the visitor changes a tick). */
export function createChecklistStore(source=()=>globalThis.localStorage,{known=null}={}){
 let contexts={},state='ok',loaded=false;
 const storage=()=>typeof source==='function'?source():source;
 const clean=list=>[...new Set((Array.isArray(list)?list:[]).filter(id=>typeof id==='string'&&ITEM_ID.test(id)&&(!known||known.has(id))))].slice(0,MAX_ITEMS);
 function load(){
  if(loaded)return;loaded=true;
  let raw;
  try{const target=storage();if(!target)throw new Error('No storage');raw=target.getItem(STORAGE_KEY);}catch{state='unavailable';return;}
  if(raw===null||raw===undefined)return;
  try{
   const data=JSON.parse(raw);
   if(data?.version!==1||!data.contexts||typeof data.contexts!=='object'||Array.isArray(data.contexts))throw new Error('shape');
   for(const [key,list] of Object.entries(data.contexts))if(CONTEXT_KEY.test(key))contexts[key]=clean(list);
  }catch{contexts={};state='corrupt';}
 }
 return {
  get state(){load();return state;},
  get(key){load();return new Set(contexts[key]||[]);},
  /** Returns true when saved in the browser, false when kept only in memory. */
  set(key,ids){
   load();if(!CONTEXT_KEY.test(key))return false;
   const list=clean([...ids]);
   if(list.length)contexts[key]=list;else delete contexts[key];
   if(state==='unavailable')return false;
   try{
    const target=storage();if(!target)throw new Error('No storage');
    target.setItem(STORAGE_KEY,JSON.stringify({version:1,contexts}));
    state='ok';return true;
   }catch{state='unavailable';return false;}
  },
 };
}
export function storageMessage(state){
 if(state==='unavailable')return 'This browser is not saving ticks, so they will be lost when you leave the page. The checklist still works.';
 if(state==='corrupt')return 'Saved ticks on this browser could not be read, so the checklist started empty. Ticking an item replaces the unreadable data.';
 return 'Ticks are saved on this browser only.';
}
