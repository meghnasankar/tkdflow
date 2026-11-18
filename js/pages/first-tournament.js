/* First-tournament guide. The page is complete without JavaScript (everything is
   shown). With it, visitors filter by organization and discipline, share the
   view by URL, keep browser-only ticks per view, and print the selected
   checklist. No account client, personal data or network request is used. */
import {parseContext,contextQuery,contextKey,contextLabel,parseScope,applies,progressText,createChecklistStore,storageMessage,ORGS,DISCIPLINES,STORAGE_KEY} from '../lib/tournament-guide.js';

const $=id=>document.getElementById(id);
const items=[...document.querySelectorAll('#ft-checklist li[data-item]')];
const scoped=[...document.querySelectorAll('#main [data-org]:not(li[data-item]),#main [data-discipline]:not(li[data-item])')];
const scopeOf=el=>({orgs:parseScope(el.dataset.org),disciplines:parseScope(el.dataset.discipline)});
const known=new Set(items.map(li=>li.dataset.item));
let store=createChecklistStore(undefined,{known});
let ctx=parseContext(location.search);

function visibleItems(){return items.filter(li=>!li.hidden);}
function updateProgress(){
 const shown=visibleItems(),checked=shown.filter(li=>li.querySelector('input').checked).length;
 $('ft-progress').textContent=progressText(checked,shown.length,ctx);
 $('ft-storage').textContent=storageMessage(store.state);
}
function render(){
 $('ft-org').value=ctx.org;$('ft-discipline').value=ctx.discipline;
 for(const el of scoped)el.hidden=!applies(scopeOf(el),ctx);
 const ticks=store.get(contextKey(ctx));
 for(const li of items){
  li.hidden=!applies(scopeOf(li),ctx);
  li.querySelector('input').checked=!li.hidden&&ticks.has(li.dataset.item);
 }
 $('ft-print-context').textContent=`Showing guidance for ${contextLabel(ctx)}.`;
 updateProgress();
}
function setContext(next){
 ctx={...ctx,...next};
 history.replaceState(null,'',`${location.pathname}${contextQuery(ctx)}${location.hash}`);
 $('ft-copy-status').textContent='';
 render();
}

$('ft-context').hidden=false;$('ft-tools').hidden=false;
$('ft-context').addEventListener('submit',e=>e.preventDefault());
$('ft-org').addEventListener('change',e=>setContext({org:Object.hasOwn(ORGS,e.target.value)?e.target.value:'all'}));
$('ft-discipline').addEventListener('change',e=>setContext({discipline:Object.hasOwn(DISCIPLINES,e.target.value)?e.target.value:'both'}));
for(const li of items)li.querySelector('input').addEventListener('change',()=>{
 store.set(contextKey(ctx),visibleItems().filter(x=>x.querySelector('input').checked).map(x=>x.dataset.item));
 updateProgress();
});
$('ft-reset').addEventListener('click',()=>{
 if(!confirm(`Clear your ticks for ${contextLabel(ctx)}? Ticks for other views stay.`))return;
 store.set(contextKey(ctx),[]);render();
});
$('ft-print').addEventListener('click',()=>window.print());
$('ft-copy').addEventListener('click',async()=>{
 const url=`${location.origin}${location.pathname}${contextQuery(ctx)}#ft-checklist`;
 try{await navigator.clipboard.writeText(url);$('ft-copy-status').textContent='Link copied. It opens this organization and discipline; ticks are not shared.';}
 catch{$('ft-copy-status').textContent=`Copy this link: ${url}`;}
});
window.addEventListener('popstate',()=>{ctx=parseContext(location.search);render();});
// Another tab changed ticks: take its views, keeping any this tab hasn't stored yet.
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY||e.key===null){store.external(e.key===null?null:e.newValue);render();}});
render();
