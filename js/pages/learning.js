import {loadInto,showEmpty} from '../lib/data.js';
import {validateForms} from '../lib/validators.js';
import {getLearningService,learningMessage} from '../lib/learning-service.js';
import {learningCard,savingBusy,readyToSave} from '../lib/learning-ui.js';
import {h} from '../lib/dom.js';
import {keepFocus,findKey,setHidden,setDisabled} from '../lib/focus-keep.js';
const $=id=>document.getElementById(id),service=getLearningService();
const VIEWS={all:'All learning',saved:'Saved forms',progress:'In progress',practised:'Practised'};
let forms=[],loaded=false,view=new URLSearchParams(location.search).get('view')||'all',snapshot=service.snapshot();
if(!VIEWS[view])view='all';
function render(){
 const state=snapshot,records=new Map(state.records.map(row=>[row.form_id,row])),all=forms.filter(form=>records.has(form.id));
 const match=(form,key)=>{const r=records.get(form.id);return key==='saved'?r.saved:key==='progress'?r.last_pose!==null&&!r.practised:key==='practised'?r.practised:true;};
 $('learning-status').textContent=learningMessage(state);
 // Transient controls that go away while focused (Retry after it starts, Refresh while
 // loading, Import when nothing is left to import) hand focus to the status message.
 const statusEl=$('learning-status');
 $('learning-sign-in').hidden=state.mode!=='browser'||state.allowAccount===false;setHidden($('learning-retry'),!state.error,statusEl);
 // Busy while a change is pending (still focusable); natively disabled only while loading.
 const busy=savingBusy(state)?'true':'false';
 setDisabled($('learning-refresh'),state.mode==='loading',statusEl);$('learning-refresh').setAttribute('aria-disabled',busy);
 setHidden($('learning-import'),state.mode!=='account'||!service.browserRecords().length,statusEl);$('learning-import-button').setAttribute('aria-disabled',busy);
 keepFocus($('learning-tabs'),()=>$('learning-tabs').replaceChildren(...Object.entries(VIEWS).map(([key,label])=>h('button',{type:'button',class:'btn btn-secondary btn-sm','aria-pressed':String(view===key),'data-fk':`view:${key}`,'data-learning-key':`view:${key}`,on:{click:()=>{view=key;const p=key==='all'?'':`?view=${key}`;history.pushState(null,'',location.pathname+p);render();}}},`${label} (${all.filter(form=>match(form,key)).length})`))));
 $('learning-summary').textContent=`${all.filter(f=>match(f,'saved')).length} saved · ${all.filter(f=>match(f,'progress')).length} in progress · ${all.filter(f=>match(f,'practised')).length} marked practised`;
 if(!loaded||state.mode==='loading'){$('learning-cards').replaceChildren();return;}
 const shown=all.filter(form=>match(form,view)).sort((a,b)=>(records.get(b.id).studied_at||records.get(b.id).updated_at||'').localeCompare(records.get(a.id).studied_at||records.get(a.id).updated_at||''));
 const cards=$('learning-cards'),before=[...cards.children].map(n=>n.dataset?.form).filter(Boolean);
 // If the focused card leaves this view (e.g. Unsave on Saved), focus goes to
 // the card now in its place, then the empty-state link, then the summary.
 keepFocus(cards,()=>{
  if(shown.length)cards.replaceChildren(...shown.map(form=>learningCard(form,records.get(form.id),state,service)));
  else showEmpty(cards,state.mode==='unavailable'?'Retry to see your saved learning.':'Nothing here yet. Save a form in the library or use a lesson’s controls to begin.',h('a',{href:'/forms.html',class:'btn btn-primary btn-sm','data-fk':'learning:explore'},'Explore forms'));
 },{fallback:saved=>{
  const at=Math.max(0,before.indexOf(saved.key.split(':')[1]));
  const now=[...cards.children].filter(n=>n.dataset?.form);
  const near=now[Math.min(at,now.length-1)];
  return (near&&findKey(near,`open:${near.dataset.form}`))||findKey(cards,'learning:explore')||$('learning-summary');
 }});
}
service.subscribe(state=>{snapshot=state;render();});
$('learning-retry').addEventListener('click',()=>service.retry());
$('learning-refresh').addEventListener('click',()=>{const live=service.snapshot();if(live.mode!=='loading'&&!savingBusy(live))service.refresh();});
$('learning-import-button').addEventListener('click',()=>{if(readyToSave(service))service.importBrowser();});
window.addEventListener('popstate',()=>{view=new URLSearchParams(location.search).get('view')||'all';if(!VIEWS[view])view='all';render();});
loadInto($('learning-cards'),'/data/forms.json',{title:'Your form catalogue could not load.',validate:validateForms,onData:data=>{forms=data;loaded=true;render();}});
