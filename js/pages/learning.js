import {loadInto,showEmpty} from '../lib/data.js';
import {validateForms} from '../lib/validators.js';
import {getLearningService,learningMessage} from '../lib/learning-service.js';
import {learningCard} from '../lib/learning-ui.js';
import {h} from '../lib/dom.js';
const $=id=>document.getElementById(id),service=getLearningService();
const VIEWS={all:'All learning',saved:'Saved forms',progress:'In progress',practised:'Practised'};
let forms=[],loaded=false,view=new URLSearchParams(location.search).get('view')||'all',snapshot=service.snapshot();
if(!VIEWS[view])view='all';
function render(){
 const state=snapshot,records=new Map(state.records.map(row=>[row.form_id,row])),all=forms.filter(form=>records.has(form.id));
 const match=(form,key)=>{const r=records.get(form.id);return key==='saved'?r.saved:key==='progress'?r.last_pose!==null&&!r.practised:key==='practised'?r.practised:true;};
 const focus=document.activeElement?.dataset?.learningKey;
 $('learning-status').textContent=learningMessage(state);
 $('learning-sign-in').hidden=state.mode!=='browser'||state.allowAccount===false;$('learning-retry').hidden=!state.error;$('learning-refresh').disabled=state.mode==='loading'||state.pending>0;
 $('learning-import').hidden=state.mode!=='account'||!service.browserRecords().length;$('learning-import-button').disabled=state.pending>0;
 $('learning-tabs').replaceChildren(...Object.entries(VIEWS).map(([key,label])=>h('button',{type:'button',class:'btn btn-secondary btn-sm','aria-pressed':String(view===key),'data-learning-key':`view:${key}`,on:{click:()=>{view=key;const p=key==='all'?'':`?view=${key}`;history.pushState(null,'',location.pathname+p);render();}}},`${label} (${all.filter(form=>match(form,key)).length})`)));
 $('learning-summary').textContent=`${all.filter(f=>match(f,'saved')).length} saved · ${all.filter(f=>match(f,'progress')).length} in progress · ${all.filter(f=>match(f,'practised')).length} marked practised`;
 if(!loaded||state.mode==='loading'){$('learning-cards').replaceChildren();return;}
 const shown=all.filter(form=>match(form,view)).sort((a,b)=>(records.get(b.id).studied_at||records.get(b.id).updated_at||'').localeCompare(records.get(a.id).studied_at||records.get(a.id).updated_at||''));
 if(shown.length)$('learning-cards').replaceChildren(...shown.map(form=>learningCard(form,records.get(form.id),state,service)));
 else showEmpty($('learning-cards'),state.mode==='unavailable'?'Retry to see your saved learning.':'Nothing here yet. Save a form in the library or use a lesson’s controls to begin.',h('a',{href:'/forms.html',class:'btn btn-primary btn-sm'},'Explore forms'));
 if(focus)$('main').querySelector(`[data-learning-key="${CSS.escape(focus)}"]`)?.focus({preventScroll:true});
}
service.subscribe(state=>{snapshot=state;render();});
$('learning-retry').addEventListener('click',()=>service.retry());$('learning-refresh').addEventListener('click',()=>service.refresh());$('learning-import-button').addEventListener('click',()=>service.importBrowser());
window.addEventListener('popstate',()=>{view=new URLSearchParams(location.search).get('view')||'all';if(!VIEWS[view])view='all';render();});
loadInto($('learning-cards'),'/data/forms.json',{title:'Your form catalogue could not load.',validate:validateForms,onData:data=>{forms=data;loaded=true;render();}});
