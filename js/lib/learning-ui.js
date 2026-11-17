import {h} from './dom.js';
import {icon} from './icons.js';
import {getLearningService,learningMessage} from './learning-service.js';
import {learningUrl,resumePose} from './learning-model.js';
export function saveFormButton(form,record,state,service) {
 const saved=!!record?.saved;
 return h('button',{type:'button',class:`btn btn-secondary btn-sm save-form${saved?' is-saved':''}`,'aria-pressed':String(saved),'aria-label':`${saved?'Unsave':'Save'} ${form.name}`,'data-fk':`save:${form.id}`,'data-learning-key':`save:${form.id}`,disabled:!['browser','account'].includes(state.mode)||state.pending>0,on:{click:()=>service.update(form.id,{saved:!saved})}},icon('bookmark'),saved?'Saved':'Save form');
}
export function learningCard(form,record,state,service) {
 return h('article',{class:'learning-card'},
  form.thumbnail?h('img',{src:form.thumbnail.src,width:form.thumbnail.width,height:form.thumbnail.height,alt:'',loading:'lazy',decoding:'async'}):null,
  h('div',{class:'learning-card-body'},h('p',{class:'section-label'},`${form.organization}${record.practised?' · Practised':''}`),h('h3',{},form.name),
   h('p',{},record.last_pose!==null?`Last studied: pose ${record.last_pose+1} of ${record.pose_count}`:'Saved for later'),
   h('div',{class:'learning-card-actions'},h('a',{class:'btn btn-primary btn-sm',href:learningUrl(form.id,record)},record.last_pose!==null?'Resume lesson':'Open lesson'),saveFormButton(form,record,state,service)),
   record.last_pose!==null||record.practised?h('button',{type:'button',class:'link-btn reset-learning','data-learning-key':`reset:${form.id}`,disabled:state.pending>0,on:{click:()=>{if(confirm(`Clear your study position and practised mark for ${form.name}? Your saved-form choice will stay.`))service.update(form.id,{reset:true});}}},'Clear progress'):null));
}
export function mountLessonLearning({id,title,count,player}) {
 const service=getLearningService(),holder=h('section',{class:'lesson-learning','aria-label':'Saved form and lesson progress'}),actions=h('div',{class:'learning-card-actions'}),position=h('p'),status=h('p',{role:'status',class:'learning-storage-note'}),retry=h('button',{type:'button',class:'btn btn-secondary btn-sm',hidden:true,on:{click:()=>service.retry()}},'Retry saving');
 const learningLink=h('a',{href:'/learning.html',class:'text-link'},'My learning');
 holder.append(actions,position,status,retry,learningLink);
 document.querySelector('.lesson-layout').before(holder);
 let interacted=false,ready=false,generation=null,lastStored=null;
 const explicitPose=new URLSearchParams(location.search).has('pose');
 const observe=({index,cause})=>{
  if(['init','resume','link','rate','tick'].includes(cause))return;
  interacted=true;
  if(index===lastStored)return;
  if(service.update(id,{last_pose:index,pose_count:count}))lastStored=index;
 };
 player.subscribe(observe);
 service.subscribe(state=>{
  if(ready&&generation!==state.generation){interacted=false;lastStored=null;}
  generation=state.generation;
  const record=service.get(id),canSave=['browser','account'].includes(state.mode);
  const focused=document.activeElement?.dataset?.learningKey;
  actions.replaceChildren(saveFormButton({id,name:title},record,state,service),h('button',{
   type:'button',class:'btn btn-secondary btn-sm','data-learning-key':'practised','aria-pressed':String(!!record?.practised),disabled:!canSave||state.pending>0,
   on:{click:()=>service.update(id,{practised:!record?.practised})},
  },icon('check'),record?.practised?'Practised':'Mark as practised'));
  if(focused)actions.querySelector(`[data-learning-key="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  position.textContent=record?.last_pose!==null&&record?`Last studied: pose ${record.last_pose+1} of ${record.pose_count}.`:'Your study position is saved when you use the lesson controls.';
  status.textContent=learningMessage(state);retry.hidden=!state.error;
  if(!ready&&canSave){
   ready=true;
   const resume=resumePose(record,count);
   if(!explicitPose&&!interacted&&resume!==null)player.select(resume,'resume');
   else if(interacted&&lastStored===null){if(service.update(id,{last_pose:player.index,pose_count:count}))lastStored=player.index;}
  }
 });
 return service;
}
