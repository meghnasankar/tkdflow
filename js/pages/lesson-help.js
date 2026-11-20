/* My lesson questions, plus the moderator review queue and FAQ editor.
   Every call names the account this page loaded with; a sign-in change clears
   all private content immediately and cancels in-flight work. Each list keeps
   only its latest response. Drafts stay in memory only. Member identity is
   never shown to moderators. */
import {h,replaceChildren} from '../lib/dom.js';
import {loadJSON} from '../lib/data.js';
import {validateForms} from '../lib/validators.js';
import {getAccountService} from '../lib/account-service.js';
import {currentSession} from '../lib/account-ops.js';
import {SessionGuard} from '../lib/auth-flows.js';
import {createEligibilityStore,INELIGIBLE} from '../lib/age-gate.js';
import {FORM_IDS} from '../lib/learning-model.js';
import {helpAccess,myQuestions,helpQueue,setQuestionStatus,replyQuestion,groupQuestion,saveFaq,setFaqPublished,faqAdmin} from '../lib/lesson-help-service.js';
import {STATUS_LABELS,FAQ_STATUS_LABELS,NEXT_STATUSES,STATUS_ACTIONS,POSE_COUNTS,RequestIds,questionRecord,faqRecord,poseHref,poseLabel,accessMessage,helpErrorMessage,replyProblem,faqDraftProblems,groupSummary,isLesson} from '../lib/lesson-help-model.js';

const $=id=>document.getElementById(id);
const guard=new SessionGuard();
const ids=new RequestIds();
/* Per-question review state survives re-renders: drafts, pending writes and messages. */
const replyDrafts=new Map(),pendingWrites=new Set(),cardMessages=new Map();
const loads={mine:0,queue:0,faq:0};
let client=null,account=null,access=null,names={},connection=0,editing=null,faqBusy=false,subscribed=false,queueRows=[];
/* Moderator permission epoch: bumped whenever moderator content is cleared, so a
   late response or write result from before a rights change is ignored. */
let modEpoch=0;
const offline=()=>navigator.onLine===false?' You appear to be offline.':'';
const lessonName=id=>names[id]||id;
const fmt=value=>value?new Date(value).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
const badge=status=>h('span',{class:`help-status help-status-${status}`},STATUS_LABELS[status]);
function setStatus(text){$('help-status').textContent=text;}

/* ── private state ── */
function invalidateReads(){loads.mine++;loads.queue++;loads.faq++;}
function clearMember(){loads.mine++;$('my-questions').hidden=true;replaceChildren($('my-question-list'));}
function clearModerator(){
 loads.queue++;loads.faq++;modEpoch++;
 ids.clear();replyDrafts.clear();pendingWrites.clear();cardMessages.clear();queueRows=[];
 $('review-panel').hidden=true;$('faq-panel').hidden=true;
 for(const id of ['review-list','review-groups','faq-admin-list'])replaceChildren($(id));
 for(const id of ['review-summary','faq-admin-summary','faq-form-status'])$(id).textContent='';
 $('faq-form').reset();resetFaqForm();
}
function clearPrivate(){invalidateReads();access=null;clearMember();clearModerator();$('help-sign-in').hidden=true;$('help-profile').hidden=true;}
/* Same account, changed rights: hide what it may no longer see. */
function applyAccess(next){
 if(!next.member)clearMember();
 if(!next.moderator)clearModerator();
 access=next;
 $('help-profile').hidden=next.reason!=='complete-profile';
 $('my-questions').hidden=!next.member;$('review-panel').hidden=!next.moderator;$('faq-panel').hidden=!next.moderator;
}

async function connect(){
 const request=++connection;$('help-refresh').disabled=true;
 try{
  if(createEligibilityStore().read()===INELIGIBLE){guard.switchTo(null);account=null;clearPrivate();setStatus(accessMessage('ineligible'));return;}
  setStatus('Checking your sign-in…');
  const svc=await getAccountService();if(request!==connection)return;
  if(svc.status!=='ready'){setStatus(accessMessage('unavailable')+offline());return;}
  client=svc.client;
  if(!subscribed){subscribed=true;client.auth.onAuthStateChange((event,session)=>{
   if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))return;
   const next=session?.user?.id||null;
   if(next===account&&event!=='USER_UPDATED')return;
   connection++;   // cancel any in-flight check for the previous account
   if(guard.switchTo(next)){account=next;clearPrivate();setStatus('Checking your sign-in…');}
   setTimeout(connect,0);
  });}
  const session=await currentSession(client);if(request!==connection)return;
  if(session.error){guard.switchTo(null);account=null;clearPrivate();setStatus('We could not check your sign-in. Try Refresh.'+offline());return;}
  const next=session.session?.user?.id||null;
  if(guard.switchTo(next)||next!==account){account=next;clearPrivate();}
  if(!account){$('help-sign-in').hidden=false;setStatus(accessMessage('sign-in'));return;}
  const token=guard.token(),result=await helpAccess(client);if(!guard.isCurrent(token)||request!==connection)return;
  if(result.error||result.data?.version!==1){setStatus(accessMessage('unavailable')+offline());return;}
  applyAccess(result.data);
  setStatus(access.member?'Your questions are private to you and TKDflow community moderators.':access.moderator?'Moderator tools are available below.':accessMessage(access.reason));
  if(access.member)loadMine();
  if(access.moderator){loadQueue();loadFaqAdmin();}
 }finally{if(request===connection)$('help-refresh').disabled=false;}
}

/* ── question cards (member list and review queue use different heading IDs) ── */
function questionCard(q,{review=false}={}){
 const headingId=`${review?'review':'mine'}-q-${q.id}`;
 const card=h('article',{class:'help-card','aria-labelledby':headingId,'aria-busy':String(review&&pendingWrites.has(q.id))},
  h('h3',{id:headingId},`${lessonName(q.lesson_id)} · ${poseLabel(q.pose_index,q.pose_count)}`),
  h('div',{class:'help-card-meta'},badge(q.status),review&&q.member?h('span',{},q.member):null,h('span',{},`Asked ${fmt(q.created_at)}`),
   q.topic_key?h('span',{},`Group: ${q.topic_key}`):null,
   h('a',{href:poseHref(q.lesson_id,q.pose_index),class:'text-link',...(review?{target:'_blank',rel:'noopener noreferrer'}:{})},q.pose_index===null?'Open the lesson':`Open pose ${q.pose_index+1}`,review?h('span',{class:'sr-only'},' (opens in a new tab)'):null)),
  h('p',{class:'help-card-body'},q.body),
  ...q.replies.map(r=>h('div',{class:'help-reply'},h('p',{class:'help-reply-meta'},`Reply from TKDflow moderators · ${fmt(r.created_at)}`),h('p',{class:'help-card-body'},r.body))));
 if(!review&&!q.replies.length)card.append(h('p',{class:'field-help'},q.status==='closed'?'This question was closed without a reply.':'No reply yet.'));
 if(review)card.append(reviewTools(q));
 return card;
}
async function loadMine(){
 if(!client||!access?.member)return;
 const token=guard.token(),request=++loads.mine,list=$('my-question-list');
 replaceChildren(list,h('p',{class:'lesson-help-note'},'Loading your questions…'));
 const result=await myQuestions(client,account);if(!guard.isCurrent(token)||request!==loads.mine)return;
 const rows=result.data?.version===1&&Array.isArray(result.data.questions)?result.data.questions.map(questionRecord):null;
 if(result.error||!rows||rows.some(r=>!r)){replaceChildren(list,h('p',{class:'lesson-help-note'},helpErrorMessage(result.error,'Your questions could not load. Use Refresh to try again.')+offline()));return;}
 if(!rows.length){replaceChildren(list,h('p',{class:'lesson-help-note'},'You have not asked any lesson questions yet. Open a lesson and use “Help with this lesson”.'),h('a',{href:'/forms.html',class:'btn btn-secondary btn-sm'},'Choose a lesson'));return;}
 replaceChildren(list,...rows.map(q=>questionCard(q)));
}

/* ── moderator review ── */
/* One write per question at a time. Its controls stay locked across re-renders,
   and its outcome is shown on whichever card is current when it settles. */
async function runWrite(q,work,success){
 if(pendingWrites.has(q.id))return;
 const token=guard.token(),epoch=modEpoch;pendingWrites.add(q.id);cardMessages.set(q.id,{text:'Saving…',error:false});renderQueue();
 const r=await work();if(!guard.isCurrent(token)||epoch!==modEpoch)return;
 pendingWrites.delete(q.id);
 if(r.error||r.data?.version!==1){cardMessages.set(q.id,{text:helpErrorMessage(r.error),error:true});renderQueue();return;}
 cardMessages.set(q.id,{text:success(r.data),error:false});loadQueue();
}
function reviewTools(q){
 const busy=pendingWrites.has(q.id),note=cardMessages.get(q.id);
 const replyText=h('textarea',{id:`reply-${q.id}`,rows:3,maxLength:2000,disabled:busy||q.status==='closed'});
 replyText.value=replyDrafts.get(q.id)||'';
 replyText.addEventListener('input',()=>replyDrafts.set(q.id,replyText.value));
 const sendReply=h('button',{type:'button',class:'btn btn-primary btn-sm',disabled:busy||q.status==='closed',on:{click:()=>{
  const body=replyText.value.trim(),problem=replyProblem(body);
  if(problem){cardMessages.set(q.id,{text:problem,error:true});renderQueue();document.getElementById(`reply-${q.id}`)?.focus();return;}
  const request=ids.for(`reply:${q.id}`,{body});
  runWrite(q,()=>replyQuestion(client,account,q.id,body,request),()=>{ids.done(`reply:${q.id}`);replyDrafts.delete(q.id);return 'Private reply sent.';});
 }}},q.status==='closed'?'Reopen to reply':'Send private reply');
 const moves=(NEXT_STATUSES[q.status]||[]).map(next=>h('button',{type:'button',class:'btn btn-secondary btn-sm',disabled:busy,on:{click:()=>
  runWrite(q,()=>setQuestionStatus(client,account,q.id,next),()=>`Marked ${STATUS_LABELS[next].toLowerCase()}.`)}},
  q.status==='closed'||(q.status==='resolved'&&next==='reviewed')?STATUS_ACTIONS.reopen:STATUS_ACTIONS[next]));
 const groupInput=h('input',{type:'text',id:`group-${q.id}`,maxLength:40,value:q.topic_key||'',disabled:busy,pattern:'[a-z0-9][a-z0-9-]{1,39}','aria-describedby':`group-help-${q.id}`});
 const saveGroup=h('button',{type:'button',class:'btn btn-secondary btn-sm',disabled:busy,on:{click:()=>{
  const key=groupInput.value.trim();runWrite(q,()=>groupQuestion(client,account,q.id,key),()=>key?'Group saved.':'Group removed.');
 }}},'Save group');
 return h('div',{class:'help-review-tools'},
  h('label',{for:`reply-${q.id}`},'Private reply to this member'),replyText,
  h('div',{class:'help-actions'},sendReply,...moves),
  h('label',{for:`group-${q.id}`},'Group recurring questions (optional)'),groupInput,
  h('p',{class:'field-help',id:`group-help-${q.id}`},'2–40 lowercase letters, numbers or hyphens, e.g. low-block-height. Leave empty to remove.'),
  h('div',{class:'help-actions'},saveGroup),
  h('p',{class:note?.error?'form-status error':'form-status',role:'status'},note?.text||''));
}
function renderQueue(){
 const focused=document.activeElement?.id;
 replaceChildren($('review-list'),...(queueRows.length?queueRows.map(q=>questionCard(q,{review:true})):[h('p',{class:'lesson-help-note'},'No questions match these filters.')]));
 if(focused&&$('review-list').querySelector(`#${CSS.escape(focused)}`))document.getElementById(focused).focus({preventScroll:true});
}
async function loadQueue(){
 if(!client||!access?.moderator)return;
 const token=guard.token(),request=++loads.queue,lesson=$('review-lesson').value||null,status=$('review-status').value;
 $('review-summary').textContent='Loading questions…';
 const result=await helpQueue(client,account,{lesson,status});if(!guard.isCurrent(token)||request!==loads.queue)return;
 const rows=result.data?.version===1&&Array.isArray(result.data.questions)?result.data.questions.map(questionRecord):null;
 if(result.error||!rows||rows.some(r=>!r)){$('review-summary').textContent=helpErrorMessage(result.error,'The review queue could not load. Try again.')+offline();return;}
 const t=result.data.totals||{};
 $('review-summary').textContent=`${rows.length} shown · ${t.submitted||0} waiting · ${t.reviewed||0} reviewed · ${t.resolved||0} resolved · ${t.closed||0} closed`+(rows.length>=200?' · Showing the first 200; filter by lesson to see more.':'');
 replaceChildren($('review-groups'),...groupSummary(result.data.groups,names).map(g=>h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:()=>{$('review-lesson').value=g.lesson_id;loadQueue();}}},g.label)));
 // Keep messages and drafts only for questions still listed.
 const listed=new Set(rows.map(q=>q.id));for(const key of [...cardMessages.keys()])if(!listed.has(key)&&!pendingWrites.has(key))cardMessages.delete(key);
 queueRows=rows;renderQueue();
}

/* ── curated FAQ ── */
function setFaqBusy(on){
 faqBusy=on;$('faq-form').setAttribute('aria-busy',String(on));
 for(const control of $('faq-form').elements)control.disabled=on;
 for(const button of $('faq-admin-list').querySelectorAll('button'))button.disabled=on;
}
function resetFaqForm(){
 setFaqBusy(false);editing=null;$('faq-form-title').textContent='New answer';$('faq-form-save').textContent='Save draft';
 $('faq-form-cancel').hidden=true;$('faq-form-live-row').hidden=true;$('faq-form-live').checked=false;
 $('faq-credit-keep-row').hidden=true;$('faq-credit-team').checked=true;
}
function faqFields(){
 const pose=$('faq-form-pose').value.trim(),lesson=$('faq-form-lesson').value;
 return {lesson,pose,count:POSE_COUNTS[lesson]??null,question:$('faq-form-question').value,answer:$('faq-form-answer').value,
  url:$('faq-form-url').value.trim(),label:$('faq-form-label').value.trim(),credit:document.querySelector('input[name="faq-credit"]:checked')?.value,editing:!!editing};
}
function edit(entry){
 if(faqBusy)return;
 editing=entry;$('faq-form-title').textContent=`Edit answer (version ${entry.version})`;
 $('faq-form-lesson').value=entry.lesson_id;$('faq-form-pose').value=entry.pose_index===null?'':String(entry.pose_index+1);
 $('faq-form-question').value=entry.question;$('faq-form-answer').value=entry.answer;$('faq-form-url').value=entry.source_url||'';$('faq-form-label').value=entry.source_label||'';
 // Edits keep the existing public credit unless the editor explicitly changes it.
 $('faq-credit-keep-label').textContent=` Keep the current credit (${entry.credit})`;$('faq-credit-keep-row').hidden=false;$('faq-credit-keep').checked=true;
 const live=entry.status==='published';$('faq-form-live-row').hidden=!live;$('faq-form-live').checked=false;
 $('faq-form-save').textContent=live?'Update public answer':'Save changes';$('faq-form-cancel').hidden=false;
 $('faq-form-status').className='form-status';
 $('faq-form-status').textContent=live?'This answer is public. Saving changes updates the public page immediately.':'';
 $('faq-form-question').focus();
}
async function submitFaq(e){
 e.preventDefault();if(faqBusy)return;
 const token=guard.token(),epoch=modEpoch,out=$('faq-form-status'),f=faqFields(),problems=faqDraftProblems(f);
 out.className='form-status error';
 if(problems){out.textContent=Object.values(problems).join(' ');return;}
 if(!$('faq-form-curated').checked){out.textContent='Confirm this answer was written for the public and contains no private details.';$('faq-form-curated').focus();return;}
 const live=editing?.status==='published';
 if(live&&!$('faq-form-live').checked){out.textContent='Check “Update the public answer now” to change a published answer.';$('faq-form-live').focus();return;}
 const payload={entry:editing?.id??null,lesson:f.lesson,pose:f.pose===''?null:Number(f.pose)-1,question:f.question.trim(),answer:f.answer.trim(),url:f.url,label:f.label,credit:f.credit,version:editing?.version??null,updatePublic:live};
 const key=`faq:${payload.entry||'new'}`,request=ids.for(key,payload);
 // Lock the whole editor and every list action until this save settles.
 setFaqBusy(true);out.className='form-status';out.textContent='Saving…';
 const r=await saveFaq(client,account,{...payload,request});if(!guard.isCurrent(token)||epoch!==modEpoch)return;
 if(r.error||r.data?.version!==1||!faqRecord(r.data.entry)){setFaqBusy(false);out.className='form-status error';out.textContent=helpErrorMessage(r.error,'The answer was not saved. Your text is kept here; try again.');return;}
 ids.done(key);$('faq-form').reset();resetFaqForm();
 out.className='form-status';
 out.textContent=r.data.duplicate?'This answer was already saved.':live?'Public answer updated.':payload.entry===null?'Draft saved. It is not public until you publish it.':'Changes saved.';
 loadFaqAdmin();
}
async function loadFaqAdmin(){
 if(!client||!access?.moderator)return;
 const token=guard.token(),request=++loads.faq,list=$('faq-admin-list');$('faq-admin-summary').textContent='Loading answers…';
 const result=await faqAdmin(client,account);if(!guard.isCurrent(token)||request!==loads.faq)return;
 const rows=result.data?.version===1&&Array.isArray(result.data.entries)?result.data.entries.map(faqRecord):null;
 if(result.error||!rows||rows.some(r=>!r)){$('faq-admin-summary').textContent=helpErrorMessage(result.error,'Saved answers could not load.')+offline();return;}
 $('faq-admin-summary').textContent=`${rows.length} saved answer${rows.length===1?'':'s'} · ${rows.filter(r=>r.status==='published').length} published`;
 replaceChildren(list,...(rows.length?rows.map(entry=>{
  const status=h('p',{class:'form-status',role:'status'});
  const toggle=h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:async()=>{
   if(faqBusy)return;
   const epoch=modEpoch;setFaqBusy(true);status.textContent='Saving…';
   const r=await setFaqPublished(client,account,entry.id,entry.status!=='published',entry.version);if(!guard.isCurrent(token)||epoch!==modEpoch)return;
   setFaqBusy(false);
   if(r.error||r.data?.version!==1){status.className='form-status error';status.textContent=helpErrorMessage(r.error);return;}
   $('faq-admin-summary').textContent=r.data.status==='published'?'Answer published.':'Answer unpublished.';loadFaqAdmin();
  }}},entry.status==='published'?'Unpublish':'Publish');
  return h('article',{class:'help-card'},
   h('h4',{},entry.question),
   h('div',{class:'help-card-meta'},h('span',{class:'help-status help-status-reviewed'},FAQ_STATUS_LABELS[entry.status]),h('span',{},`${lessonName(entry.lesson_id)} · ${poseLabel(entry.pose_index,entry.pose_count)}`),h('span',{},`Version ${entry.version} · ${entry.credit}`)),
   h('p',{class:'help-card-body'},entry.answer),
   entry.source_url?h('p',{class:'faq-source'},'Reference: ',h('a',{href:entry.source_url,target:'_blank',rel:'noopener noreferrer'},entry.source_label||entry.source_url)):null,
   h('p',{class:'help-revisions'},'History: ',(entry.revisions||[]).map(r=>`v${r.version} ${r.action}${r.by_you?' by you':''} ${fmt(r.created_at)}`).join(' · ')||'none'),
   h('div',{class:'help-actions'},h('button',{type:'button',class:'btn btn-secondary btn-sm',disabled:faqBusy,on:{click:()=>edit(entry)}},'Edit'),toggle),status);
 }):[h('p',{class:'lesson-help-note'},'No answers yet. Write the first public answer above.')]));
 if(faqBusy)setFaqBusy(true);
}

/* ── start ── */
$('help-refresh').addEventListener('click',connect);
$('review-load').addEventListener('click',loadQueue);
$('review-lesson').addEventListener('change',loadQueue);
$('review-status').addEventListener('change',loadQueue);
$('faq-form').addEventListener('submit',submitFaq);
$('faq-form-cancel').addEventListener('click',()=>{if(faqBusy)return;$('faq-form').reset();resetFaqForm();$('faq-form-status').textContent='';});
window.addEventListener('online',()=>{if(account)connect();});
try{const forms=await loadJSON('/data/forms.json',{validate:validateForms,timeoutMs:6000});for(const f of forms)names[f.id]=f.name;}catch{/* lesson IDs stay readable */}
for(const select of [$('review-lesson'),$('faq-form-lesson')])select.append(...FORM_IDS.map(id=>h('option',{value:id},lessonName(id))));
$('faq-form-lesson').addEventListener('change',()=>{const count=POSE_COUNTS[$('faq-form-lesson').value];$('faq-form-pose').max=count?String(count):'';});
if(!isLesson($('review-lesson').value))$('review-lesson').value='';
connect();
