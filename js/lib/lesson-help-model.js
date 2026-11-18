/* Lesson help: private member questions, moderator review and a curated public
   FAQ. Pure logic only (tested in Node). Pose numbers are animation poses, never
   official movement counts. Private question text is never published by code:
   public FAQ entries are written separately by moderators. */
import {FORM_IDS} from './learning-model.js';

export const QUESTION_MIN=10,QUESTION_MAX=1000,REPLY_MIN=2,REPLY_MAX=2000;
export const FAQ_LIMITS=Object.freeze({question:[10,300],answer:[20,4000],label:[2,120],url:500});
export const STATUSES=Object.freeze(['submitted','reviewed','resolved','closed']);
export const STATUS_LABELS=Object.freeze({submitted:'Waiting for review',reviewed:'Reviewed',resolved:'Resolved',closed:'Closed'});
export const FAQ_STATUS_LABELS=Object.freeze({draft:'Draft · not public',published:'Published',unpublished:'Unpublished · not public'});
/** Allowed moderator moves; mirrors set_lesson_question_status. */
export const NEXT_STATUSES=Object.freeze({submitted:['reviewed','resolved','closed'],reviewed:['resolved','closed'],resolved:['reviewed','closed'],closed:['reviewed']});
export const STATUS_ACTIONS=Object.freeze({reviewed:'Mark reviewed',resolved:'Mark resolved',closed:'Close',reopen:'Reopen'});
export const POSE_NOTE='Pose numbers count the animation’s poses, not the form’s official movements.';
const CONTROL=/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isLesson=id=>FORM_IDS.includes(id);
export const isUuid=value=>typeof value==='string'&&UUID.test(value);

export function textProblem(value,min,max,label='text'){
 const clean=String(value??'').trim();
 if(CONTROL.test(clean))return `Remove unsupported characters from the ${label}.`;
 if(clean.length<min||clean.length>max)return `Use ${min}–${max.toLocaleString('en-US')} characters for the ${label}.`;
 return null;
}
export const questionProblem=value=>textProblem(value,QUESTION_MIN,QUESTION_MAX,'question');
export const replyProblem=value=>textProblem(value,REPLY_MIN,REPLY_MAX,'reply');

/** A pose attached to a question: {pose_index,pose_count} or null for the whole form. */
export function poseContext(index,count){
 if(index===null||index===undefined)return null;
 if(!Number.isInteger(index)||!Number.isInteger(count)||count<1||count>200||index<0||index>=count)return null;
 return {pose_index:index,pose_count:count};
}
export function poseLabel(index,count){
 return Number.isInteger(index)&&Number.isInteger(count)?`Animation pose ${index+1} of ${count}`:'The whole form';
}
/** Link back to the exact pose. ?pose= is an explicit link, so it outranks resume. */
export function poseHref(lesson,index){
 if(!isLesson(lesson))return '/forms.html';
 return Number.isInteger(index)&&index>=0&&index<200?`/${lesson}.html?pose=${index+1}#player`:`/${lesson}.html#player`;
}
export function faqHref(lesson,entryId){
 const params=new URLSearchParams();if(isLesson(lesson))params.set('lesson',lesson);
 return `/lesson-faq.html${params.size?'?'+params:''}${isUuid(entryId)?`#faq-${entryId}`:''}`;
}

/** https only, no credentials, no whitespace or quote characters. */
export function safeReference(value){
 if(typeof value!=='string'||!value||value.length>FAQ_LIMITS.url||/[\s<>"'`\\]/.test(value))return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname))return null;
  return url.href;
 }catch{return null;}
}

const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
function pose(raw,lesson){
 if(raw.pose_index===null&&raw.pose_count===null)return {pose_index:null,pose_count:null};
 const p=poseContext(raw.pose_index,raw.pose_count);return p&&isLesson(lesson)?p:undefined;
}
export function replyRecord(raw){
 return raw&&isUuid(raw.id)&&typeof raw.body==='string'&&date(raw.created_at)?{id:raw.id,body:raw.body,created_at:raw.created_at}:null;
}
/** Validates a question from my_lesson_questions or the moderator queue. */
export function questionRecord(raw){
 if(!raw||!isUuid(raw.id)||!isLesson(raw.lesson_id)||typeof raw.body!=='string'||!STATUSES.includes(raw.status)||!date(raw.created_at))return null;
 const p=pose(raw,raw.lesson_id);if(!p)return null;
 const replies=Array.isArray(raw.replies)?raw.replies.map(replyRecord):null;
 if(!replies||replies.some(r=>!r))return null;
 const row={id:raw.id,lesson_id:raw.lesson_id,...p,body:raw.body,status:raw.status,created_at:raw.created_at,updated_at:date(raw.updated_at),replies};
 if(typeof raw.member==='string'&&/^Member [0-9A-F]{6}$/.test(raw.member))row.member=raw.member;
 if(raw.topic_key===null||(typeof raw.topic_key==='string'&&/^[a-z0-9][a-z0-9-]{1,39}$/.test(raw.topic_key)))row.topic_key=raw.topic_key??null;
 return row;
}
/** Validates a public FAQ entry and keeps only its public fields. */
export function faqRecord(raw){
 if(!raw||!isUuid(raw.id)||!isLesson(raw.lesson_id)||typeof raw.question!=='string'||typeof raw.answer!=='string'||typeof raw.credit!=='string')return null;
 const p=pose(raw,raw.lesson_id);if(!p)return null;
 const url=raw.source_url==null?null:safeReference(raw.source_url);
 if(raw.source_url!=null&&!url)return null;
 const row={id:raw.id,lesson_id:raw.lesson_id,...p,question:raw.question,answer:raw.answer,source_url:url,
  source_label:url&&typeof raw.source_label==='string'?raw.source_label:null,credit:raw.credit,published_at:date(raw.published_at),updated_at:date(raw.updated_at)};
 if(['draft','published','unpublished'].includes(raw.status))row.status=raw.status;
 if(Number.isInteger(raw.version))row.version=raw.version;
 if(Array.isArray(raw.revisions))row.revisions=raw.revisions.filter(r=>r&&Number.isInteger(r.version)&&['created','edited','published','unpublished'].includes(r.action)&&date(r.created_at)).map(r=>({version:r.version,action:r.action,created_at:r.created_at,by_you:r.by_you===true}));
 return row;
}
export function faqDraftProblems({lesson,pose:poseNumber,count,question,answer,url,label,credit,editing=false}){
 const errors={};
 if(!isLesson(lesson))errors.lesson='Choose a lesson.';
 if(poseNumber!==''&&poseNumber!==null&&poseNumber!==undefined){
  const n=Number(poseNumber);if(!Number.isInteger(n)||n<1||(Number.isInteger(count)&&n>count))errors.pose=`Use a pose from 1 to ${count||'the last pose'}, or leave it empty for the whole form.`;
 }
 const q=textProblem(question,...FAQ_LIMITS.question,'public question');if(q)errors.question=q;
 const a=textProblem(answer,...FAQ_LIMITS.answer,'answer');if(a)errors.answer=a;
 const link=String(url??'').trim(),text=String(label??'').trim();
 if(link&&!safeReference(link))errors.url='Use a full https:// link without spaces or sign-in details.';
 if(!link&&text)errors.url='Add the reference link for this label.';
 if(text){const l=textProblem(text,...FAQ_LIMITS.label,'reference label');if(l)errors.label=l;}
 if(!['team','handle',...(editing?['keep']:[])].includes(credit))errors.credit='Choose how to credit this answer.';
 return Object.keys(errors).length?errors:null;
}

/** Plain-text paragraphs; callers render each with textContent. */
export const paragraphs=text=>String(text).split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);

export function accessMessage(reason){
 return {
  'sign-in':'Sign in with a confirmed account to ask a private question.',
  'confirm-email':'Confirm your email address, then you can ask a private question.',
  'complete-profile':'Complete your profile to ask a private question.',
  'under-13':'Lesson questions are for members aged 13 and over. The lessons and public answers stay open to everyone.',
  'age-unconfirmed':'Lesson questions need a confirmed age of 13 or over on your account. The lessons and public answers stay open to everyone.',
  'ineligible':'Lesson questions need an account for people aged 13 and over. The lessons and public answers stay open to everyone.',
  'unavailable':'Private questions are unavailable right now. The lesson and public answers still work.',
 }[reason]||'Private questions are unavailable right now. The lesson and public answers still work.';
}
export function helpErrorMessage(error,fallback='That did not work. Please try again.'){
 const msg=String(error?.message||'');
 if(error?.code==='timeout'||error?.name==='TimeoutError')return 'The service took too long to respond. Your text is kept here; try again.';
 if(/sign-in changed/i.test(msg))return 'Your sign-in changed. Reload the page before sending.';
 if(/Please wait|several questions recently/i.test(msg))return 'You have sent several questions recently. Please wait a little before asking another.';
 if(/changed since you opened it/i.test(msg))return 'Someone changed this answer since you opened it. Reload the list, then edit again.';
 if(/Reopen this question/i.test(msg))return 'Reopen this question before replying.';
 if(/cannot move/i.test(msg))return 'That status change is not allowed for this question.';
 if(/https:\/\//.test(msg))return 'Use a full https:// reference link without spaces or sign-in details.';
 if(/Moderator only/i.test(msg))return 'Only community moderators can do this.';
 if(/Confirm your email|Complete your profile|aged 13 and over/i.test(msg))return msg;
 if(/Use \d+ to \d+ characters|unsupported characters|Unknown lesson|Invalid pose/i.test(msg))return 'Check the text and pose, then try again.';
 if(/failed to fetch|network|load failed/i.test(msg))return 'The service could not be reached. Check your connection; your text is kept here.';
 return fallback;
}

export function newRequestId(source=globalThis.crypto){
 if(source?.randomUUID)return source.randomUUID();
 const bytes=source?.getRandomValues?source.getRandomValues(new Uint8Array(16)):Uint8Array.from({length:16},()=>Math.floor(Math.random()*256));
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/** Composer state for one lesson. Drafts live in memory only, survive failures,
 *  and are cleared when the signed-in account changes. A retried send reuses its
 *  request ID so the server stores the question once. */
export class QuestionComposer{
 constructor({lesson,makeId=newRequestId}={}){this.lesson=lesson;this.makeId=makeId;this.account=null;this.generation=0;this.reset();}
 reset(){this.draft='';this.pose=null;this.requestId=null;this.sentText=null;this.status='idle';this.message='';this.last=null;}
 setAccount(account){if(account===this.account)return false;this.account=account;this.generation++;this.reset();return true;}
 edit(text){this.draft=String(text??'');if(this.sentText!==null&&this.draft.trim()!==this.sentText)this.requestId=null;if(this.status!=='sending')this.status='idle';}
 /** Capture the pose that is showing; null attaches the whole form. */
 /** Attach the pose showing when pose scope is chosen and nothing is attached yet
  *  (form opened, or after a successful send). Never replaces the pose of a
  *  failed or in-flight send, so a retry keeps its exact context and request ID. */
 ensurePose(poseScope,index,count){if(!poseScope||this.pose||this.status==='sending')return false;return this.capture(index,count)&&this.pose!==null;}
 capture(index,count){if(this.status==='sending')return false;const next=poseContext(index,count);if(JSON.stringify(next)!==JSON.stringify(this.pose)&&this.sentText!==null)this.requestId=null;this.pose=next;return true;}
 async submit(send){
  if(this.status==='sending')return {kind:'busy'};
  if(!this.account)return {kind:'blocked',message:accessMessage('sign-in')};
  const problem=questionProblem(this.draft);
  if(problem){this.status='error';this.message=problem;return {kind:'invalid',message:problem};}
  const body=this.draft.trim(),generation=this.generation,pose=this.pose;
  if(!this.requestId||this.sentText!==body)this.requestId=this.makeId();
  this.sentText=body;this.status='sending';this.message='';
  const result=await send({account:this.account,lesson:this.lesson,pose:pose?.pose_index??null,body,request:this.requestId});
  if(generation!==this.generation)return {kind:'stale'};
  const question=questionRecord(result?.data?.question);
  if(result?.error||result?.data?.version!==1||!question){
   this.status='error';this.message=helpErrorMessage(result?.error,'Your question was not sent. Your text is kept here; try again.');
   return {kind:'error',message:this.message};
  }
  const duplicate=result.data.duplicate===true,newer=this.draft.trim()!==body?this.draft:null;
  this.reset();this.status='sent';this.last=question;
  if(newer!==null)this.draft=newer;   // keep anything typed while the send was in flight
  this.message=duplicate?'You already asked this. It is in My lesson questions.':'Sent privately. Moderators will review it; replies appear in My lesson questions.';
  return {kind:'sent',duplicate,question};
 }
}

/** Groups for the moderator summary. */
export function groupSummary(groups,names={}){
 return (Array.isArray(groups)?groups:[]).filter(g=>isLesson(g?.lesson_id)&&typeof g.key==='string'&&Number(g.count)>1).map(g=>({
  lesson_id:g.lesson_id,key:g.key,count:Number(g.count),pose_index:Number.isInteger(g.pose_index)?g.pose_index:null,
  label:`${Number(g.count)} open questions · ${names[g.lesson_id]||g.lesson_id} · ${/^pose-\d+$/.test(g.key)?`animation pose ${g.key.slice(5)}`:/^pose-all$/.test(g.key)?'whole form':`group “${g.key}”`}`,
 }));
}

/** One request ID per pending write. A retry with the same payload reuses the
 *  ID (the server stores it once); a changed payload gets a new ID. */
export class RequestIds{
 constructor(makeId=newRequestId){this.makeId=makeId;this.pending=new Map();}
 for(key,payload){const text=JSON.stringify(payload),prev=this.pending.get(key);if(prev&&prev.payload===text)return prev.id;const id=this.makeId();this.pending.set(key,{payload:text,id});return id;}
 done(key){this.pending.delete(key);}
 clear(){this.pending.clear();}
}

/** Animation pose counts per lesson; tests pin these to the lesson data and SQL. */
export const POSE_COUNTS=Object.freeze({"taegeuk-1":20,"taegeuk-2":25,"taegeuk-3":36,"taegeuk-4":31,"taegeuk-5":34,"taegeuk-6":33,"taegeuk-7":35,"taegeuk-8":40,"koryo":52,"keumgang":29,"taebaek":44,"pyongwon":33,"sipjin":47,"jitae":40,"chon-ji":21,"dan-gun":23,"do-san":26,"won-hyo":30,"yul-gok":40,"joong-gun":34,"songahm-1":20,"songahm-2":25,"songahm-3":30});
