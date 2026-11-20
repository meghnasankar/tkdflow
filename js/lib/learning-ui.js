import {h} from './dom.js';
import {icon} from './icons.js';
import {getLearningService,learningMessage} from './learning-service.js';
import {learningUrl,resumePose} from './learning-model.js';
import {keepFocus,setHidden} from './focus-keep.js';

/* Saving controls while a change is pending stay focusable: they are marked
   aria-disabled (styled like disabled) rather than natively disabled, because a
   disabled button cannot keep keyboard focus. Every click re-checks the LIVE
   service state, so nothing is written while a change is pending or when
   saving is not possible. Only loading/unavailable modes are natively disabled. */
const canSave=state=>['browser','account'].includes(state.mode);
export const savingBusy=state=>canSave(state)&&state.pending>0;
/** Live guard: true only when the service can accept a change right now. */
export function readyToSave(service){const live=service.snapshot();return canSave(live)&&!(live.pending>0);}
const busyAttrs=state=>({disabled:!canSave(state),'aria-disabled':savingBusy(state)?'true':null});

export function saveFormButton(form,record,state,service) {
 const saved=!!record?.saved;
 return h('button',{type:'button',class:`btn btn-secondary btn-sm save-form${saved?' is-saved':''}`,'aria-pressed':String(saved),'aria-label':`${saved?'Unsave':'Save'} ${form.name}`,'data-fk':`save:${form.id}`,'data-learning-key':`save:${form.id}`,...busyAttrs(state),
  on:{click:()=>{if(readyToSave(service))service.update(form.id,{saved:!service.get(form.id)?.saved});}}},icon('bookmark'),saved?'Saved':'Save form');
}
export function learningCard(form,record,state,service) {
 return h('article',{class:'learning-card','data-form':form.id},
  form.thumbnail?h('img',{src:form.thumbnail.src,width:form.thumbnail.width,height:form.thumbnail.height,alt:'',loading:'lazy',decoding:'async'}):null,
  h('div',{class:'learning-card-body'},h('p',{class:'section-label'},`${form.organization}${record.practised?' · Practiced':''}`),h('h3',{},form.name),
   h('p',{},record.last_pose!==null?`Last studied: pose ${record.last_pose+1} of ${record.pose_count}`:'Saved for later'),
   h('div',{class:'learning-card-actions'},h('a',{class:'btn btn-primary btn-sm','data-fk':`open:${form.id}`,'aria-label':`${record.last_pose!==null?'Resume lesson':'Open lesson'}: ${form.name}`,href:learningUrl(form.id,record)},record.last_pose!==null?'Resume lesson':'Open lesson'),saveFormButton(form,record,state,service)),
   record.last_pose!==null||record.practised?h('button',{type:'button',class:'link-btn reset-learning','data-fk':`reset:${form.id}`,'data-learning-key':`reset:${form.id}`,...busyAttrs(state),
    on:{click:()=>{if(!readyToSave(service))return;if(confirm(`Clear your study position and practiced mark for ${form.name}? Your saved-form choice will stay.`)&&readyToSave(service))service.update(form.id,{reset:true});}}},'Clear progress'):null));
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
  const record=service.get(id),saving=canSave(state);
  keepFocus(actions,()=>actions.replaceChildren(saveFormButton({id,name:title},record,state,service),h('button',{
   type:'button',class:'btn btn-secondary btn-sm','data-fk':'practised','data-learning-key':'practised','aria-pressed':String(!!record?.practised),...busyAttrs(state),
   on:{click:()=>{if(readyToSave(service))service.update(id,{practised:!service.get(id)?.practised});}},
  },icon('check'),record?.practised?'Practiced':'Mark as practiced')));
  position.textContent=record?.last_pose!==null&&record?`Last studied: pose ${record.last_pose+1} of ${record.pose_count}.`:'Your study position is saved when you use the lesson controls.';
  status.textContent=learningMessage(state);setHidden(retry,!state.error,status);   // a focused Retry hands focus to the status
  if(!ready&&saving){
   ready=true;
   const resume=resumePose(record,count);
   if(!explicitPose&&!interacted&&resume!==null)player.select(resume,'resume');
   else if(interacted&&lastStored===null){if(service.update(id,{last_pose:player.index,pose_count:count}))lastStored=player.index;}
  }
 });
 return service;
}
