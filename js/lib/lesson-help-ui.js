/* “Help with this lesson” on every lesson page: published answers for this
   lesson and a private question form for eligible members. It reads the
   player's current pose but never moves the player, changes the address or
   writes saved learning. Private text is held in memory only. */
import {h,replaceChildren} from './dom.js';
import {getAccountService} from './account-service.js';
import {currentSession} from './account-ops.js';
import {createEligibilityStore,INELIGIBLE} from './age-gate.js';
import {helpAccess,submitQuestion} from './lesson-help-service.js';
import {readPublicFaq} from './public-faq.js';
import {QuestionComposer,QUESTION_MAX,POSE_NOTE,accessMessage,faqRecord,faqHref,poseLabel} from './lesson-help-model.js';
import {faqItem} from './lesson-faq-ui.js';

const SHOWN=5;
let mounted=null;

export function mountLessonHelp({id,title,count=null,player=null,poseName=()=>''}){
 if(mounted){if(player&&!mounted.player)mounted.attach(player,count,poseName);return mounted;}
 const section=document.getElementById('lesson-help');if(!section)return null;
 const answers=document.getElementById('lesson-help-answers'),ask=document.getElementById('lesson-help-ask');
 const composer=new QuestionComposer({lesson:id});
 const state={player,count,poseName,client:null,account:null,access:null,request:0,form:null,subscribed:false};

 /* ── published answers ── */
 let answerRequest=0;
 async function loadAnswers(){
  const request=++answerRequest;
  replaceChildren(answers,h('p',{class:'lesson-help-note',role:'status'},'Loading answers…'));
  // Public answers never start an account client (also safe for known under-13 visitors).
  const result=await readPublicFaq({lesson:id});
  if(request!==answerRequest)return;
  const entries=Array.isArray(result.data?.entries)&&result.data.version===1?result.data.entries.map(faqRecord):null;
  if(result.error||!entries||entries.some(e=>!e)){
   replaceChildren(answers,h('p',{class:'lesson-help-note'},navigator.onLine===false?'You appear to be offline. Answers will load when you reconnect.':'Answers could not load right now.'),
    h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:loadAnswers}},'Try again'));
   return;
  }
  if(!entries.length){replaceChildren(answers,h('p',{class:'lesson-help-note'},'No answers have been published for this lesson yet.'));return;}
  replaceChildren(answers,h('h3',{class:'lesson-help-subtitle'},`Answers for ${title}`),...entries.slice(0,SHOWN).map(e=>faqItem(e,{headingLevel:'span'})),
   entries.length>SHOWN?h('p',{},h('a',{href:faqHref(id),class:'text-link'},`See all ${entries.length} answers for this lesson →`)):null);
 }

 /* ── private question ── */
 function notice(text,action=null){composer.setAccount(state.account);state.form=null;replaceChildren(ask,h('p',{class:'lesson-help-note'},text),action);}
 function currentIndex(){return state.player&&Number.isInteger(state.player.index)?state.player.index:null;}
 function buildForm(){
  const poseChoice=h('input',{type:'radio',name:`help-scope-${id}`,id:'help-scope-pose',value:'pose',checked:!!state.player,disabled:!state.player});
  const wholeChoice=h('input',{type:'radio',name:`help-scope-${id}`,id:'help-scope-form',value:'form',checked:!state.player});
  const attached=h('p',{class:'help-attached',id:'help-attached'});
  const useNow=h('button',{type:'button',class:'btn btn-secondary btn-sm',hidden:true});
  const text=h('textarea',{id:'help-question',rows:4,maxLength:QUESTION_MAX,required:true,'aria-describedby':'help-attached help-privacy help-count'});
  const counter=h('p',{class:'field-help',id:'help-count'});
  const status=h('p',{class:'form-status',role:'status'});
  const send=h('button',{type:'submit',class:'btn btn-primary'},'Send privately');
  const capture=()=>composer.capture(poseChoice.checked?currentIndex():null,state.count);
  function paint(){
   const index=currentIndex(),p=composer.pose;
   attached.textContent=p?`Attached: ${poseLabel(p.pose_index,p.pose_count)}${state.poseName(p.pose_index)?` · ${state.poseName(p.pose_index)}`:''}. ${POSE_NOTE}`:'Attached: the whole form, not a single pose.';
   useNow.hidden=!(poseChoice.checked&&index!==null&&p&&p.pose_index!==index);
   useNow.textContent=index===null?'':`Use the pose now showing (pose ${index+1})`;
   counter.textContent=`${text.value.trim().length.toLocaleString('en-US')} / ${QUESTION_MAX.toLocaleString('en-US')} characters`;
   const sending=composer.status==='sending';
   for(const control of [send,text,poseChoice,wholeChoice,useNow])control.disabled=sending||(control===poseChoice&&!state.player);
   send.textContent=sending?'Sending…':'Send privately';form.setAttribute('aria-busy',String(sending));
   status.className=composer.status==='error'?'form-status error':'form-status';
   if(composer.message)status.replaceChildren(composer.message,...(composer.status==='sent'?[' ',h('a',{href:'/lesson-help.html',class:'text-link'},'My lesson questions')]:[]));else status.textContent='';
  }
  for(const choice of [poseChoice,wholeChoice])choice.addEventListener('change',()=>{capture();paint();});
  useNow.addEventListener('click',()=>{capture();paint();text.focus();});
  text.addEventListener('focus',()=>{if(!composer.pose&&poseChoice.checked)capture();paint();});
  text.addEventListener('input',()=>{composer.edit(text.value);if(!composer.pose&&poseChoice.checked)capture();paint();});
  const form=h('form',{class:'lesson-help-form',novalidate:true,on:{submit:async e=>{
   e.preventDefault();composer.edit(text.value);
   if(poseChoice.checked&&!composer.pose)capture();
   if(wholeChoice.checked&&composer.pose)composer.capture(null,state.count);
   const pending=composer.submit(args=>submitQuestion(state.client,args));paint();
   const result=await pending;if(result.kind==='stale')return;
   if(result.kind==='sent'){text.value=composer.draft;composer.ensurePose(poseChoice.checked,currentIndex(),state.count);}
   paint();if(result.kind!=='sent')text.focus();
  }}},
   h('h3',{class:'lesson-help-subtitle'},'Ask a private question'),
   h('fieldset',{class:'help-scope'},h('legend',{},'What is your question about?'),
    h('label',{for:'help-scope-pose'},poseChoice,state.player?' The pose showing in the player':' A single pose (unavailable while the animation is not loaded)'),
    h('label',{for:'help-scope-form'},wholeChoice,' The whole form')),
   attached,useNow,
   h('label',{for:'help-question'},'Your question'),text,counter,
   h('p',{class:'field-help',id:'help-privacy'},'Only you and TKDflow community moderators can read this question and its replies. It is not posted publicly or emailed. Leave out contact details, school schedules and other private information.'),
   send,status);
  form.paint=paint;form.text=text;
  if(composer.draft)text.value=composer.draft;
  // The label matches the selected scope from the moment the form opens.
  composer.ensurePose(poseChoice.checked,currentIndex(),state.count);
  return form;
 }
 async function refreshAccess(){
  const request=++state.request;
  if(createEligibilityStore().read()===INELIGIBLE){state.account=null;notice(accessMessage('ineligible'));return;}
  const service=await getAccountService();if(request!==state.request)return;
  if(service.status!=='ready'){state.account=null;notice(accessMessage('unavailable'));return;}
  state.client=service.client;
  if(!state.subscribed){state.subscribed=true;state.client.auth.onAuthStateChange((event,session)=>{
   if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))return;
   const next=session?.user?.id||null;
   if(next===state.account&&event!=='USER_UPDATED')return;
   // Invalidate in-flight checks and clear the previous account's text before any network call.
   state.request++;
   if(next!==state.account){state.account=next;composer.setAccount(next);state.form=null;replaceChildren(ask,h('p',{class:'lesson-help-note',role:'status'},'Checking your sign-in…'));}
   setTimeout(refreshAccess,0);
  });}
  const session=await currentSession(state.client);if(request!==state.request)return;
  if(session.error){state.account=null;notice('We could not check your sign-in. Public answers still work.',h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:refreshAccess}},'Try again'));return;}
  const account=session.session?.user?.id||null;
  if(account!==state.account){state.account=account;state.form=null;}
  composer.setAccount(account);
  if(!account){notice(accessMessage('sign-in'),h('a',{href:'/auth.html',class:'btn btn-secondary btn-sm'},'Sign in'));return;}
  const result=await helpAccess(state.client);if(request!==state.request)return;
  if(result.error||result.data?.version!==1){notice(accessMessage('unavailable'),h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:refreshAccess}},'Try again'));return;}
  if(!result.data.member){
   const reason=result.data.reason;
   notice(accessMessage(reason),reason==='complete-profile'?h('a',{href:'/profile.html',class:'btn btn-secondary btn-sm'},'Complete profile'):null);return;
  }
  if(!state.form){state.form=buildForm();replaceChildren(ask,state.form);}
  state.form.paint();
 }
 mounted={
  player:state.player,
  attach(nextPlayer,nextCount,name){state.player=nextPlayer;state.count=nextCount;state.poseName=name||state.poseName;this.player=nextPlayer;follow(nextPlayer);if(state.form){state.form=null;refreshAccess();}},
 };
 /* Repaint only when the pose changes; the player also reports every frame. */
 function follow(target){let last=null;target.subscribe(({index})=>{if(index!==last){last=index;state.form?.paint();}});}
 if(state.player)follow(state.player);
 window.addEventListener('online',()=>{loadAnswers();});
 loadAnswers();refreshAccess();
 return mounted;
}
