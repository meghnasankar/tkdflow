/* Public editorial guides + real, moderated member discussions when connected.
   A tab whose age screen recorded a known under-13 result reads published
   discussions publicly and never starts the account service (see
   community-connection.js); member controls are offered only in account mode. */
import {loadJSON} from '../lib/data.js';
import {validateForum} from '../lib/validators.js';
import {h,replaceChildren,safeHref} from '../lib/dom.js';
import {getAccountService,retryAccountService} from '../lib/account-service.js';
import {currentSession} from '../lib/account-ops.js';
import {SessionGuard} from '../lib/auth-flows.js';
import {createEligibilityStore} from '../lib/age-gate.js';
import {SUBMISSIONS_SHOWN,appendPage,listTopics,listReplies,discussionAccess,discussionProblem,submitTopic,submitReply,reportContent,moderationQueue,moderateContent,reviewSubmissions,discussionUrl,publishedTopic,copyDiscussionLink,resolveReport,reportDecisionMessage} from '../lib/discussions.js';
import {publicTopics,publicTopic,publicReplies,canonicalUuid} from '../lib/public-discussions.js';
import {createCommunityConnection,communityControls,NOTICES} from '../lib/community-connection.js';
import {keepFocus,findKey,focusTarget,captureFocus,restoreFocus} from '../lib/focus-keep.js';
import {normalize} from '../lib/catalog.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
/* Topic links may carry an upper-case UUID; the database returns lower case. */
const topicParam=v=>canonicalUuid(v)||v;
let doc=null,topics=[],more={hasMore:false,cursor:null,status:'idle'},loaded=0,active=params.get('category')||'all',query=params.get('q')||'',selected=topicParam(params.get('topic')),client=null,session=null,access={adult:false,moderator:false},mode=null,connection=null;
const guard=new SessionGuard();let submissionRequest=0,queueRequest=0,detailRequest=0,detailKey=null,feedState='loading',topicLoadError=null;
const controls=()=>communityControls({mode,session,access});
const paragraph=body=>String(body).split(/\n\s*\n/).map(p=>h('p',{},p));
const categoryName=id=>doc.categories.find(c=>c.id===id)?.title||id;
function message(text,error=false){$('discussion-message').textContent=text;$('discussion-message').className=error?'form-status error':'form-status';}
function writeUrl(){history.replaceState(null,'',discussionUrl({category:active,query,topic:selected}));}
function selectCategory(id){active=id;selected=null;writeUrl();render();}
/* Explicit navigation moves focus; deep links, Back/Forward and background
   refreshes never do (they only keep focus that a re-render would drop). */
let origin=null;
function openTopic(id,part='link'){
 origin={id,part};selected=id;writeUrl();render();
 const heading=$('topic-detail-title');
 if(heading&&!$('topic-detail').hidden)focusTarget(heading,{scroll:true,scrollTarget:$('topic-detail')});
}
function closeTopic(){
 const closed=selected,key=origin?.id===closed?`topic:${closed}:${origin.part}`:`topic:${closed}:link`;
 origin=null;selected=null;writeUrl();render();
 focusTarget(findKey($('forum-content'),key)||$('forum-summary'),{scroll:true});
}
function report(kind,id){
 if(document.getElementById(`report-${id}`)){document.getElementById(`report-${id}`).focus();return;}
 const form=h('form',{class:'discussion-form',on:{submit:async e=>{e.preventDefault();const reason=form.querySelector('textarea').value.trim();if(reason.length<5||reason.length>500)return;const button=form.querySelector('button');button.disabled=true;const token=guard.token(),r=await reportContent(client,kind,id,reason);if(!guard.isCurrent(token))return;message(r.error?'The report could not be sent. Try again.':'Report received for moderator review.',!!r.error);if(!r.error)form.remove();else button.disabled=false;}}},h('label',{for:`report-${id}`},'What should a moderator check?'),h('textarea',{id:`report-${id}`,required:true,minLength:5,maxLength:500,rows:3}),h('button',{type:'submit',class:'btn btn-secondary btn-sm'},'Send report'));
 $('topic-detail').append(form);form.querySelector('textarea').focus();
}
/* Unsent replies, kept in this page's memory only (never written to browser
   storage or sent), per account and topic, so switching topics or going Back
   doesn't lose them. A reply's draft is removed once that exact text is saved,
   and every draft whenever private state is cleared (sign-in, sign-out, account
   switch, public reading). The consent box is never restored. */
const replyDrafts=new Map();
const draftKey=topic=>`${guard.userId||''}:${topic.id}`;
function withReplyDraft(form,topic){
 const area=form.querySelector('#reply-body'),key=draftKey(topic),saved=guard.userId?replyDrafts.get(key):null;
 if(saved){area.value=saved;form.append(h('p',{class:'field-help draft-note'},'Your unsent reply is kept while this page stays open.'));}
 area.addEventListener('input',()=>{if(!guard.userId)return;if(area.value.trim())replyDrafts.set(key,area.value);else replyDrafts.delete(key);});
 return form;
}
/* The fields stay editable while a submission is sending. After it succeeds,
   clear only what still equals what was sent; anything typed since stays (with
   its caret and focus) as unsent text, and the category stays with it. The
   consent box is always cleared, so the next submission is confirmed again.
   For a reply, the form on the page for that topic is used, which may be a newer
   one restored from the draft after switching topics. Returns whether newer
   text remains. */
function clearSent(form,sent){
 const title=form.querySelector('[name="title"]'),select=form.querySelector('select'),area=form.querySelector('textarea');
 let newer=false;
 for(const [field,value] of [[title,sent.title],[area,sent.body]]){if(!field)continue;if(field.value===value)field.value='';else newer=true;}
 if(select&&!newer&&select.value===sent.category)select.value=select.options[0]?.value??'';
 form.querySelector('.discussion-consent input').checked=false;
 if(!area.value)form.querySelector('.draft-note')?.remove();
 return newer;
}
/* One submission at a time per account and target (a topic's reply, or a new
   topic). A form rebuilt while one is in flight (switching topics and back)
   stays locked until it settles, so no second request is sent. */
const pendingSends=new Set();
const sendKey=(reply,topic)=>reply?draftKey(topic):`${guard.userId||''}:new-topic`;
function lockForm(form,on){
 const button=form.querySelector('button[type="submit"]');if(button)button.disabled=on;
 form.querySelector('.send-pending')?.remove();
 if(on)button?.before(h('p',{class:'field-help send-pending',role:'status'},'Your earlier submission is still sending.'));
}
const liveForm=(reply,topic)=>reply?(selected===topic.id&&$('topic-detail').dataset.topicId===topic.id?$('reply-body')?.closest('form'):null):$('topic-composer').querySelector('form');
function composer({reply=false,topic=null}={}){
 const form=h('form',{class:'discussion-form',on:{submit:async e=>{
  e.preventDefault();const lock=sendKey(reply,topic);if(pendingSends.has(lock))return;   // the earlier one is still in flight
  message('');const body=form.querySelector('textarea').value,title=reply?'':form.querySelector('[name="title"]').value,category=reply?topic.category:form.querySelector('select').value,key=reply?draftKey(topic):null;
  const problem=discussionProblem({title,body,category},doc.categories.map(c=>c.id),{reply});if(problem){message(Object.values(problem).join(' '),true);return;}
  const token=guard.token(),button=form.querySelector('button[type="submit"]');button.disabled=true;pendingSends.add(lock);
  const r=reply?await submitReply(client,topic.id,body):await submitTopic(client,{title,body,category});
  // Always release this submission's own lock, even if it is stale. The forms on
  // the page then show the CURRENT account's state for this target: another
  // account's (or a re-signed-in account's) own pending send keeps them locked.
  pendingSends.delete(lock);
  const busy=pendingSends.has(sendKey(reply,topic));
  for(const f of new Set([form,liveForm(reply,topic)]))if(f)lockForm(f,busy);
  if(!guard.isCurrent(token))return;
  if(r.error){message('Your submission was not saved. Please try again; if you posted recently, wait a minute.',true);return;}
  // A reply's topic may no longer be open (the visitor moved to another one): then
  // the message names it, and newer text waits as that topic's unsent draft.
  const open=!reply||(selected===topic.id&&$('topic-detail').dataset.topicId===topic.id);
  const newer=clearSent(reply&&open&&$('reply-body')?.closest('form')||form,{title,body,category});
  if(reply&&replyDrafts.get(key)===body)replyDrafts.delete(key);
  const saved=open?'Submitted for moderation.':`Your reply to “${topic.title}” was submitted for moderation.`;
  message(!newer?`${saved} Your username will appear with the text after a moderator approves it.`
   :open?'Your earlier version was submitted for moderation. What you typed while it was sending is still here and has not been sent.'
   :`${saved} What you typed while it was sending is kept as an unsent reply for that discussion.`);loadSubmissions();
 }}},h('h3',{},reply?'Write a reply':'Start a discussion'));
 if(!reply){form.append(h('label',{for:'topic-title'},'Title'),h('input',{id:'topic-title',name:'title',type:'text',minLength:8,maxLength:160,required:true}),h('label',{for:'topic-category'},'Category'),h('select',{id:'topic-category',required:true},...doc.categories.map(c=>h('option',{value:c.id},c.title))));}
 const id=reply?'reply-body':'topic-body';form.append(h('label',{for:id},reply?'Reply':'Question or discussion'),h('textarea',{id,'data-fk':reply?'detail:reply':'composer:body',rows:6,minLength:reply?10:20,maxLength:reply?4000:8000,required:true}),h('label',{class:'discussion-consent'},h('input',{type:'checkbox',required:true}),'I want my username and this text to be public after moderation.'),h('p',{class:'field-help'},'Use respectful language and credit your sources. Leave out contact details, school schedules and other private information.'),h('button',{type:'submit',class:'btn btn-primary'},'Submit for review'));
 if(pendingSends.has(sendKey(reply,topic)))lockForm(form,true);
 return form;
}
async function detail(topic,{preserveDraft=false}={}){
 const request=++detailRequest,token=guard.token(),panel=$('topic-detail');
 const draft=preserveDraft&&panel.dataset.topicId===topic.id?panel.querySelector('#reply-body')?.closest('form'):null;panel.dataset.topicId=topic.id;panel.hidden=false;
 const live=mode==='public'||Boolean(client),canReport=controls().report;
 const holder=h('div',{'aria-live':'polite'},h('p',{},live?'Loading replies…':'Member replies will appear here when the account service is connected.'));
 const shareStatus=h('p',{class:'discussion-share-status',role:'status'});
 // Everything except the replies is built synchronously, including a preserved
 // reply draft, so focus and its caret are restored before any await.
 keepFocus(panel,()=>{
  replaceChildren(panel,h('button',{type:'button',class:'btn btn-secondary btn-sm','data-fk':'detail:back',on:{click:closeTopic}},'← All topics'),h('p',{class:'section-label'},categoryName(topic.category)),h('h2',{id:'topic-detail-title','data-fk':'detail:title'},topic.title),h('p',{class:'topic-author'},topic.editorial?'TKDflow discussion guide':`By @${topic.author_handle}`),...paragraph(topic.body),
   h('button',{type:'button',class:'btn btn-secondary btn-sm','data-fk':'detail:copy',on:{click:async()=>{const ok=await copyDiscussionLink(location.origin,topic.id);if(guard.isCurrent(token)&&selected===topic.id)shareStatus.textContent=ok?'Discussion link copied.':'Copy this discussion’s address from your browser to share it.';}}},'Copy discussion link'),shareStatus,
   topic.resourceUrl?h('a',{href:safeHref(topic.resourceUrl),class:'text-link','data-fk':'detail:resource'},'Open the related resource →'):null,
   canReport?h('button',{type:'button',class:'report-button','data-fk':'detail:report',on:{click:()=>report('topic',topic.id)}},'Report this topic'):null,
   h('h3',{},'Replies'),holder,
   controls().composer?(draft||withReplyDraft(composer({reply:true,topic}),topic)):h('p',{class:'discussion-access'},mode==='public'?'Reading is open to everyone.':session?'Reading is open to everyone. Public posting is available only to adult accounts with a completed profile.':h('a',{href:'/auth.html',class:'text-link'},'Sign in to join the discussion')));
  panel.setAttribute('aria-labelledby','topic-detail-title');
 },{fallback:()=>$('topic-detail-title')});   // a focused control that is rebuilt later (e.g. a reply's Report) lands on the heading
 if(!live)return;
 // Replies arrive 50 at a time. Only the replies area changes after an await;
 // a reply draft, the composer and focus elsewhere are untouched.
 let rows=[],next={hasMore:false,cursor:null,status:'idle'};
 const current=()=>selected===topic.id&&request===detailRequest&&guard.isCurrent(token);
 const article=reply=>h('article',{class:'discussion-reply','data-reply':reply.id},h('p',{class:'topic-author'},`@${reply.author_handle}`),...paragraph(reply.body),canReport?h('button',{type:'button',class:'report-button','data-fk':`reply:${reply.id}:report`,on:{click:()=>report('reply',reply.id)}},'Report reply'):null);
 const show=()=>keepFocus(holder,()=>replaceChildren(holder,...rows.map(article),
  next.status==='error'?h('p',{class:'form-status error',role:'status'},'More replies could not be loaded.'):null,
  next.hasMore?h('button',{type:'button',class:'btn btn-secondary btn-sm','data-fk':'more:replies','aria-disabled':next.status==='loading'?'true':null,on:{click:loadMoreReplies}},next.status==='loading'?'Loading more replies…':next.status==='error'?'Try loading more replies again':'Load more replies'):null),
  {fallback:()=>$('topic-detail-title')});
 async function loadMoreReplies(){
  if(next.status==='loading'||!next.hasMore)return;
  const cursor=next.cursor,before=rows.length;next={...next,status:'loading'};show();
  const r=await connection.replies(topic.id,{after:cursor});if(!current())return;
  if(r.error){next={...next,status:'error'};show();return;}
  rows=appendPage(rows,r.data||[]);next={hasMore:Boolean(r.hasMore),cursor:r.cursor||null,status:'idle'};
  const onButton=document.activeElement?.dataset?.fk==='more:replies';
  show();
  const first=holder.querySelectorAll('[data-reply]')[before];
  if(onButton&&first)focusTarget(first);
 }
 const r=await connection.replies(topic.id);if(!current())return;
 if(r.error){replaceChildren(holder,h('p',{},'Replies could not be loaded. Refresh to try again.'));return;}
 if(!r.data?.length&&!r.hasMore){replaceChildren(holder,h('p',{},'No published replies yet.'));return;}
 rows=r.data||[];next={hasMore:Boolean(r.hasMore),cursor:r.cursor||null,status:'idle'};show();
}
/* Search and categories filter the topics loaded so far; while older ones can
   still be loaded, say so instead of implying the count covers everything. */
function summaryText(n){
 const plural=x=>`${x} topic${x===1?'':'s'}`,q=query.trim(),filtered=Boolean(q)||active!=='all';
 if(!more.hasMore)return `${plural(n)}${q?` matching “${q}”`:''}.`;
 if(filtered)return `${n} of the ${plural(loaded)} loaded so far ${n===1?'matches':'match'}${q?` “${q}”`:''}. Load more discussions to search older ones.`;
 return `Showing the ${plural(n)} loaded so far. Older discussions can be loaded.`;
}
function renderMore(){
 const holder=$('forum-more');if(!holder)return;
 keepFocus(holder,()=>replaceChildren(holder,
  more.status==='error'?h('p',{class:'form-status error',role:'status'},'Older discussions could not be loaded.'):null,
  more.hasMore?h('button',{type:'button',class:'btn btn-secondary','data-fk':'more:topics','aria-disabled':more.status==='loading'?'true':null,on:{click:()=>connection?.loadMore()}},more.status==='loading'?'Loading more discussions…':more.status==='error'?'Try loading more discussions again':'Load more discussions'):null),
  {fallback:()=>$('forum-summary')});
}
function render({preserveDraft=false}={}){if(!doc)return;if(!doc.categories.some(c=>c.id===active))active='all';
 keepFocus($('category-nav'),()=>replaceChildren($('category-nav'),h('button',{type:'button',class:'category-btn','data-fk':'cat:all','aria-pressed':String(active==='all'),on:{click:()=>selectCategory('all')}},'All categories'),...doc.categories.map(c=>h('button',{type:'button',class:'category-btn','data-fk':`cat:${c.id}`,'aria-pressed':String(active===c.id),on:{click:()=>selectCategory(c.id)}},c.title))));
 // Every typed word must appear in the title or body, compared the way the library
 // compares names (catalogue normalize(): case, accents, spaces and punctuation).
 const words=query.trim().split(/\s+/).map(normalize).filter(Boolean);
 const shown=topics.filter(t=>(active==='all'||t.category===active)&&(!words.length||(hay=>words.every(w=>hay.includes(w)))(normalize(`${t.title} ${t.body}`))));
 $('forum-summary').textContent=summaryText(shown.length);
 // A focused topic that is no longer listed falls back to the results summary.
 keepFocus($('forum-content'),()=>{
  if(!shown.length)replaceChildren($('forum-content'),h('p',{class:'status-panel'},'No topics match. Try another category or search.'));
  else replaceChildren($('forum-content'),...shown.map(t=>h('article',{class:'discussion-card'},h('div',{class:'example-meta'},h('span',{class:'badge badge-navy'},categoryName(t.category)),h('span',{class:'badge badge-muted'},t.editorial?'Discussion guide':'Member topic')),h('h3',{},h('a',{href:discussionUrl({category:active,query,topic:t.id}),'data-fk':`topic:${t.id}:link`,on:{click:e=>{e.preventDefault();openTopic(t.id,'link');}}},t.title)),h('p',{},t.body.split('\n')[0]),h('button',{type:'button',class:'btn btn-secondary btn-sm','data-fk':`topic:${t.id}:read`,on:{click:()=>openTopic(t.id,'read')}},'Read discussion →'))));
 },{fallback:()=>$('forum-summary')});
 renderMore();
 const topic=topics.find(t=>t.id===selected);$('topic-detail').hidden=!topic;if(topic){const key=topic.id+':'+guard.generation+':'+mode+':'+Boolean(client)+':'+access.adult;if(key!==detailKey){detailKey=key;detail(topic,{preserveDraft});}}else{detailKey=null;detailRequest++;if(selected){$('topic-detail').hidden=false;$('topic-detail').removeAttribute('aria-labelledby');keepFocus($('topic-detail'),()=>replaceChildren($('topic-detail'),h('p',{},feedState==='loading'?'Loading this discussion…':topicLoadError===selected||feedState==='unavailable'?'This discussion could not be loaded. Use Refresh discussions to try again.':'This discussion is unavailable or has not been published.'),h('a',{href:discussionUrl(),class:'text-link','data-fk':'detail:browse'},'Browse all discussions')),{fallback:()=>$('forum-summary')});}}
 const show=controls();
 $('topic-composer').hidden=!show.composer;if(show.composer&&!$('topic-composer').children.length)$('topic-composer').append(composer());
 $('moderation').hidden=!show.moderation;
 $('moderation-link').hidden=!show.moderation;$('start-topic-link').hidden=!show.composer;$('my-submissions-link').hidden=!show.submissions;$('my-submissions').hidden=!show.submissions;$('forum-sign-in').hidden=!show.signIn;
 if(!show.composer)$('topic-composer').replaceChildren();
}
function clearPrivate(){
 replyDrafts.clear();
 access={adult:false,moderator:false};detailKey=null;detailRequest++;submissionRequest++;queueRequest++;
 for(const id of ['my-submissions','moderation','topic-composer','start-topic-link','my-submissions-link','moderation-link'])$(id).hidden=true;
 for(const id of ['my-submissions-list','moderation-queue','topic-composer','topic-detail'])$(id).replaceChildren();
 message('');
}
async function loadSubmissions(){
 if(!controls().submissions||!client)return;
 const token=guard.token(),request=++submissionRequest,button=$('refresh-submissions');button.disabled=true;
 const result=await reviewSubmissions(client);
 if(!guard.isCurrent(token)||request!==submissionRequest)return;
 button.disabled=false;
 const holder=$('my-submissions-list');
 if(result.error){replaceChildren(holder,h('p',{class:'status-panel'},'Your submissions could not be loaded. Use Refresh your submissions to try again.'));return;}
 // Say which list was cut to its most recent 30, and only that one.
 const cut=[result.moreTopics?'topics':null,result.moreReplies?'replies':null].filter(Boolean);
 const truncated=cut.length?h('p',{class:'submissions-limit'},`Showing your ${SUBMISSIONS_SHOWN} most recent unpublished ${cut.join(` and your ${SUBMISSIONS_SHOWN} most recent unpublished `)}.`):null;
 replaceChildren(holder,truncated,...(result.data.length?result.data.map(item=>h('article',{class:'discussion-card'},h('div',{class:'example-meta'},h('span',{class:'badge badge-muted'},item.kind==='topic'?'Discussion':'Reply'),h('span',{class:'badge badge-navy'},item.status==='pending'?'Awaiting review':'Not published')),h('h3',{},item.title||'Your reply'),...paragraph(item.body),item.kind==='reply'&&canonicalUuid(item.topic_id)?h('a',{href:discussionUrl({topic:canonicalUuid(item.topic_id)}),class:'text-link'},'Open the discussion this reply belongs to'):null)):[h('p',{class:'status-panel'},'You have no unpublished submissions. After you submit a topic or reply, its review status will appear here.')]));
}
/* Public reading controls of an open discussion. Their focus may survive an
   account change (for example the first session arriving after a guide was
   opened); private controls (reply drafts, reports) never carry over. */
const PUBLIC_READING=new Set(['detail:title','detail:back','detail:copy','detail:resource']);
function publicReadingFocus(){
 const panel=$('topic-detail'),saved=captureFocus(panel);
 return saved&&PUBLIC_READING.has(saved.key)?{saved,topicId:panel.dataset.topicId}:null;
}
function applyConnection(next,extra){
 client=next.client;session=next.session;access=next.access;mode=next.mode;feedState=next.feedState;topicLoadError=next.topicLoadError;topics=next.topics;more=next.more||more;loaded=next.loaded||0;
 $('refresh-discussions').disabled=next.loading;   // the connection owns every start and end
 const reading=extra.privateCleared?publicReadingFocus():null;
 if(extra.privateCleared)clearPrivate();
 $('forum-service').textContent=NOTICES[next.notice]||NOTICES.loading;
 if(extra.feedDone){detailKey=null;render({preserveDraft:true});if(controls().submissions)loadSubmissions();}
 else if(extra.moreDone){
  // Explicit Load more: focus the first newly listed topic only if the Load more
  // button still has focus; a visitor who moved to search or a draft keeps focus.
  const onButton=document.activeElement?.dataset?.fk==='more:topics';
  render();
  const first=(extra.added||[]).map(id=>findKey($('forum-content'),`topic:${id}:link`)).find(Boolean);
  if(onButton&&first)focusTarget(first);
 }else render();
 // Same discussion still open: return focus to the same public control, but
 // only if it was lost (never from search or anywhere else).
 if(reading&&selected===reading.topicId)restoreFocus($('topic-detail'),reading.saved);
}
const connect=()=>connection?connection.connect():Promise.resolve();
function reportCard(report,{supported,token}){
 const content=report.content,available=content?.available;
 const card=h('article',{class:'discussion-card'},h('h3',{},report.kind==='topic'?'Reported discussion':'Reported reply'),h('p',{class:'section-label'},'Reason for report'),h('p',{},report.reason));
 if(available){
  const publicNow=content.status==='published'&&content.parent_status==='published';
  card.append(h('div',{class:'report-context'},h('p',{class:'moderation-meta'},`${publicNow?'Currently public':'Not currently public'} · @${content.author_handle}`),h('h4',{},content.title),...paragraph(content.body)));
  if(content.topic_id)card.append(h('a',{href:discussionUrl({topic:content.topic_id}),class:'text-link',target:'_blank',rel:'noopener noreferrer'},'Open the related discussion ↗'));
 }else card.append(h('p',{},supported?'This content is no longer available. You can close the report.':'The report preview will be available after the review service update.'));
 if(!supported)return card;
 const status=h('p',{role:'status',class:'form-status'}),actions=h('div',{class:'moderation-actions'});card.append(actions,status);
 for(const decision of available&&content.status!=='rejected'?['dismiss','hide']:['dismiss']){
  const button=h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:async()=>{
   actions.querySelectorAll('button').forEach(b=>b.disabled=true);
   const result=await resolveReport(client,report.id,decision);if(!guard.isCurrent(token))return;
   if(result.error){status.textContent='The report could not be saved. Try again.';status.className='form-status error';actions.querySelectorAll('button').forEach(b=>b.disabled=false);return;}
   message(reportDecisionMessage(result.data));await queue();await connect();
  }}},decision==='hide'?'Hide content':available&&content.status==='published'&&content.parent_status==='published'?'Keep content':'Close report');
  actions.append(button);
 }
 return card;
}
async function queue(){
 if(!client||!access.moderator)return;
 const request=++queueRequest,token=guard.token(),button=$('load-moderation');button.disabled=true;
 const result=await moderationQueue(client);if(!guard.isCurrent(token)||request!==queueRequest)return;
 button.disabled=false;const holder=$('moderation-queue');
 if(result.error){replaceChildren(holder,h('p',{},'The moderation queue could not be loaded. Try opening it again.'));return;}
 const entries=[...(result.data.topics||[]).map(x=>({...x,kind:'topic'})),...(result.data.replies||[]).map(x=>({...x,kind:'reply'}))],reports=result.data.reports||[];
 const totals=result.data.totals||{topics:result.data.topics?.length||0,replies:result.data.replies?.length||0,reports:reports.length};
 const pending=Number(totals.topics)+Number(totals.replies),reportCount=Number(totals.reports);
 $('moderation-link').textContent=`Moderation (${pending+reportCount})`;
 replaceChildren(holder,h('p',{class:'results-summary'},`${pending} pending topics and replies · ${reportCount} open reports`),...entries.map(item=>h('article',{class:'discussion-card'},h('p',{class:'moderation-meta'},`${item.kind==='topic'?'Discussion':'Reply'} by @${item.author_handle}`),h('h3',{},item.title||'Reply'),...paragraph(item.body),h('div',{class:'moderation-actions'},...['published','rejected'].map(decision=>h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:async e=>{
  const buttons=e.target.parentElement.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
  const r=await moderateContent(client,item.kind,item.id,decision);if(!guard.isCurrent(token))return;
  message(r.error?'Moderation change failed. Try again.':decision==='published'?'Submission published.':'Submission was not published.',!!r.error);
  if(r.error)buttons.forEach(b=>b.disabled=false);else{await queue();detailKey=null;await connect();}
 }}},decision==='published'?'Publish':'Reject'))))),h('h3',{},'Open reports'),...reports.map(r=>reportCard(r,{supported:result.data.report_review_version===1,token})));
 if(pending>entries.length||reportCount>reports.length)holder.prepend(h('p',{},'Showing the first 100 items in each queue. Review these and refresh to load more.'));
 if(!entries.length)holder.prepend(h('p',{},'No pending topics or replies.'));if(!reports.length)holder.append(h('p',{},'No reports to review.'));
}
$('refresh-discussions').addEventListener('click',connect);$('refresh-submissions').addEventListener('click',loadSubmissions);
$('forum-q').value=query;
$('forum-q').addEventListener('input',e=>{query=e.target.value;writeUrl();render();});$('forum-search').addEventListener('submit',e=>e.preventDefault());$('load-moderation').addEventListener('click',queue);
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);active=p.get('category')||'all';selected=topicParam(p.get('topic'));query=p.get('q')||'';$('forum-q').value=query;render();});
if(params.get('view')!=='resources')try{doc=await loadJSON('/data/forum.json',{validate:validateForum});topics=doc.topics;
 connection=createCommunityConnection({eligibility:createEligibilityStore(),guard,staticTopics:doc.topics,selected:()=>selected,onState:applyConnection,
  account:{getService:getAccountService,retryService:retryAccountService,currentSession,discussionAccess,listTopics,listReplies,publishedTopic},
  publicReader:{topics:publicTopics,topic:publicTopic,replies:publicReplies}});
 // A page restored by Back after the age screen recorded an under-13 result must not keep account controls.
 window.addEventListener('pageshow',e=>connection.pageShown(e));
 render();connect();}catch{replaceChildren($('forum-content'),h('p',{role:'alert'},'Discussions could not be loaded. Refresh to try again.'));}
