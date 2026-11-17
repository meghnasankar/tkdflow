/* Public editorial guides + real, moderated member discussions when connected. */
import {loadJSON} from '../lib/data.js';
import {validateForum} from '../lib/validators.js';
import {h,replaceChildren,safeHref} from '../lib/dom.js';
import {getAccountService} from '../lib/account-service.js';
import {currentSession} from '../lib/account-ops.js';
import {SessionGuard} from '../lib/auth-flows.js';
import {listTopics,listReplies,discussionAccess,discussionProblem,submitTopic,submitReply,reportContent,moderationQueue,moderateContent,reviewSubmissions,discussionUrl} from '../lib/discussions.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let doc=null,topics=[],active=params.get('category')||'all',query=params.get('q')||'',selected=params.get('topic'),client=null,session=null,access={adult:false,moderator:false};
const guard=new SessionGuard();let connectionRequest=0,submissionRequest=0,queueRequest=0,detailRequest=0,detailKey=null,authSubscription=false;
const paragraph=body=>String(body).split(/\n\s*\n/).map(p=>h('p',{},p));
const categoryName=id=>doc.categories.find(c=>c.id===id)?.title||id;
function message(text,error=false){$('discussion-message').textContent=text;$('discussion-message').className=error?'form-status error':'form-status';}
function writeUrl(){history.replaceState(null,'',discussionUrl({category:active,query,topic:selected}));}
function selectCategory(id){active=id;selected=null;writeUrl();render();}
function openTopic(id){selected=id;writeUrl();render();$('topic-detail').scrollIntoView({block:'start',behavior:'smooth'});}
function report(kind,id){
 if(document.getElementById(`report-${id}`)){document.getElementById(`report-${id}`).focus();return;}
 const form=h('form',{class:'discussion-form',on:{submit:async e=>{e.preventDefault();const reason=form.querySelector('textarea').value.trim();if(reason.length<5||reason.length>500)return;const button=form.querySelector('button');button.disabled=true;const token=guard.token(),r=await reportContent(client,kind,id,reason);if(!guard.isCurrent(token))return;message(r.error?'The report could not be sent. Try again.':'Report received for moderator review.',!!r.error);if(!r.error)form.remove();else button.disabled=false;}}},h('label',{for:`report-${id}`},'What should a moderator check?'),h('textarea',{id:`report-${id}`,required:true,minLength:5,maxLength:500,rows:3}),h('button',{type:'submit',class:'btn btn-secondary btn-sm'},'Send report'));
 $('topic-detail').append(form);form.querySelector('textarea').focus();
}
function composer({reply=false,topic=null}={}){
 const form=h('form',{class:'discussion-form',on:{submit:async e=>{
  e.preventDefault();message('');const body=form.querySelector('textarea').value,title=reply?'':form.querySelector('[name="title"]').value,category=reply?topic.category:form.querySelector('select').value;
  const problem=discussionProblem({title,body,category},doc.categories.map(c=>c.id),{reply});if(problem){message(Object.values(problem).join(' '),true);return;}
  const token=guard.token(),button=form.querySelector('button[type="submit"]');button.disabled=true;
  const r=reply?await submitReply(client,topic.id,body):await submitTopic(client,{title,body,category});button.disabled=false;if(!guard.isCurrent(token))return;
  if(r.error){message('Your submission was not saved. Please try again; if you posted recently, wait a minute.',true);return;}
  form.reset();message('Submitted for moderation. Your username will appear with the text after a moderator approves it.');loadSubmissions();
 }}},h('h3',{},reply?'Write a reply':'Start a discussion'));
 if(!reply){form.append(h('label',{for:'topic-title'},'Title'),h('input',{id:'topic-title',name:'title',type:'text',minLength:8,maxLength:160,required:true}),h('label',{for:'topic-category'},'Category'),h('select',{id:'topic-category',required:true},...doc.categories.map(c=>h('option',{value:c.id},c.title))));}
 const id=reply?'reply-body':'topic-body';form.append(h('label',{for:id},reply?'Reply':'Question or discussion'),h('textarea',{id,rows:6,minLength:reply?10:20,maxLength:reply?4000:8000,required:true}),h('label',{class:'discussion-consent'},h('input',{type:'checkbox',required:true}),'I want my username and this text to be public after moderation.'),h('p',{class:'field-help'},'Use respectful language and credit your sources. Leave out contact details, school schedules and other private information.'),h('button',{type:'submit',class:'btn btn-primary'},'Submit for review'));return form;
}
async function detail(topic){
 const request=++detailRequest,token=guard.token(),panel=$('topic-detail');panel.hidden=false;replaceChildren(panel,h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:()=>{selected=null;writeUrl();render();}}},'← All topics'),h('p',{class:'section-label'},categoryName(topic.category)),h('h2',{},topic.title),h('p',{class:'topic-author'},topic.editorial?'TKDflow discussion guide':`By @${topic.author_handle}`),...paragraph(topic.body));
 if(topic.resourceUrl)panel.append(h('a',{href:safeHref(topic.resourceUrl),class:'text-link'},'Open the related resource →'));
 if(session)panel.append(h('button',{type:'button',class:'report-button',on:{click:()=>report('topic',topic.id)}},'Report this topic'));
 panel.append(h('h3',{},'Replies'));const holder=h('div',{'aria-live':'polite'});panel.append(holder);
 if(client){const r=await listReplies(client,topic.id);if(selected!==topic.id||request!==detailRequest||!guard.isCurrent(token))return;
  if(r.error)replaceChildren(holder,h('p',{},'Replies could not be loaded. Refresh to try again.'));
  else if(!r.data?.length)replaceChildren(holder,h('p',{},'No published replies yet.'));
  else replaceChildren(holder,...r.data.map(reply=>h('article',{class:'discussion-reply'},h('p',{class:'topic-author'},`@${reply.author_handle}`),...paragraph(reply.body),session?h('button',{type:'button',class:'report-button',on:{click:()=>report('reply',reply.id)}},'Report reply'):null)));
 }else replaceChildren(holder,h('p',{},'Member replies will appear here when the account service is connected.'));
 if(access.adult)panel.append(composer({reply:true,topic}));else panel.append(h('p',{class:'discussion-access'},session?'Reading is open to everyone. Public posting is available only to adult accounts with a completed profile.':h('a',{href:'/auth.html',class:'text-link'},'Sign in to join the discussion')));
}
function render(){if(!doc)return;if(!doc.categories.some(c=>c.id===active))active='all';
 replaceChildren($('category-nav'),h('button',{type:'button',class:'category-btn','aria-pressed':String(active==='all'),on:{click:()=>selectCategory('all')}},'All categories'),...doc.categories.map(c=>h('button',{type:'button',class:'category-btn','aria-pressed':String(active===c.id),on:{click:()=>selectCategory(c.id)}},c.title)));
 const q=query.trim().toLowerCase(),shown=topics.filter(t=>(active==='all'||t.category===active)&&(!q||`${t.title} ${t.body}`.toLowerCase().includes(q)));
 $('forum-summary').textContent=`${shown.length} topic${shown.length===1?'':'s'}${query?` matching “${query.trim()}”`:''}.`;
 replaceChildren($('forum-content'),...shown.map(t=>h('article',{class:'discussion-card'},h('div',{class:'example-meta'},h('span',{class:'badge badge-navy'},categoryName(t.category)),h('span',{class:'badge badge-muted'},t.editorial?'Discussion guide':'Member topic')),h('h3',{},h('a',{href:`?topic=${t.id}`,on:{click:e=>{e.preventDefault();openTopic(t.id);}}},t.title)),h('p',{},t.body.split('\n')[0]),h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:()=>openTopic(t.id)}},'Read discussion →'))));
 if(!shown.length)replaceChildren($('forum-content'),h('p',{class:'status-panel'},'No topics match. Try another category or search.'));
 const topic=topics.find(t=>t.id===selected);$('topic-detail').hidden=!topic;if(topic){const key=topic.id+':'+guard.generation+':'+Boolean(client)+':'+access.adult;if(key!==detailKey){detailKey=key;detail(topic);}}else{detailKey=null;detailRequest++;if(selected){$('topic-detail').hidden=false;replaceChildren($('topic-detail'),h('p',{},'This discussion is unavailable or has not been published.'),h('a',{href:discussionUrl(),class:'text-link'},'Browse all discussions'));}}
 $('topic-composer').hidden=!access.adult;if(access.adult&&!$('topic-composer').children.length)$('topic-composer').append(composer());
 $('moderation').hidden=!access.moderator;
 $('moderation-link').hidden=!access.moderator;$('start-topic-link').hidden=!access.adult;$('my-submissions-link').hidden=!session;$('my-submissions').hidden=!session;$('forum-sign-in').hidden=!!session;
 if(!access.adult)$('topic-composer').replaceChildren();
}
function clearPrivate(){
 access={adult:false,moderator:false};detailKey=null;detailRequest++;submissionRequest++;queueRequest++;
 for(const id of ['my-submissions','moderation','topic-composer','start-topic-link','my-submissions-link','moderation-link'])$(id).hidden=true;
 for(const id of ['my-submissions-list','moderation-queue','topic-composer','topic-detail'])$(id).replaceChildren();
 message('');
}
async function loadSubmissions(){
 if(!session||!client)return;
 const token=guard.token(),request=++submissionRequest,button=$('refresh-submissions');button.disabled=true;
 const result=await reviewSubmissions(client);
 if(!guard.isCurrent(token)||request!==submissionRequest)return;
 button.disabled=false;
 const holder=$('my-submissions-list');
 if(result.error){replaceChildren(holder,h('p',{class:'status-panel'},'Your submissions could not be loaded. Use Refresh your submissions to try again.'));return;}
 replaceChildren(holder,...(result.data.length?result.data.map(item=>h('article',{class:'discussion-card'},h('div',{class:'example-meta'},h('span',{class:'badge badge-muted'},item.kind==='topic'?'Discussion':'Reply'),h('span',{class:'badge badge-navy'},item.status==='pending'?'Awaiting review':'Not published')),h('h3',{},item.title||'Your reply'),...paragraph(item.body))):[h('p',{class:'status-panel'},'You have no unpublished submissions. After you submit a topic or reply, its review status will appear here.')]));
}
async function connect(){
 const request=++connectionRequest,refresh=$('refresh-discussions');refresh.disabled=true;
 try{
  const svc=await getAccountService();if(request!==connectionRequest)return;
  if(svc.status!=='ready'){$('forum-service').textContent='Discussion guides are available. Member discussions could not be connected; try refreshing.';return;}
  client=svc.client;const result=await currentSession(client);if(request!==connectionRequest)return;
  if(result.error){guard.switchTo(null);clearPrivate();session=null;render();$('forum-service').textContent='We could not check your sign-in. Refresh to try again; discussion guides remain available.';return;}
  const next=result.session;if(guard.switchTo(next?.user?.id||null))clearPrivate();session=next;
  if(!authSubscription){authSubscription=true;client.auth.onAuthStateChange((event,nextSession)=>{
   if(!['SIGNED_IN','SIGNED_OUT'].includes(event)||nextSession?.user?.id===guard.userId)return;
   connectionRequest++;guard.switchTo(nextSession?.user?.id||null);clearPrivate();session=nextSession;setTimeout(connect,0);
  });}
  const token=guard.token();access={adult:false,moderator:false};
  if(session){const r=await discussionAccess(client);if(!guard.isCurrent(token)||request!==connectionRequest)return;if(!r.error)access=r.data||access;}
  const feed=await listTopics(client);if(!guard.isCurrent(token)||request!==connectionRequest)return;
  if(!feed.error){const merged=new Map(doc.topics.map(t=>[t.id,t]));for(const t of feed.data||[])merged.set(t.id,{...merged.get(t.id),...t});topics=[...merged.values()];$('forum-service').textContent='Read freely. Adult members can submit topics and replies for moderation; younger accounts stay private.';}
  else $('forum-service').textContent='Discussion guides are available. Member discussions could not be reached; refresh to try again.';
  render();if(session)loadSubmissions();
 }finally{if(request===connectionRequest)refresh.disabled=false;}
}
async function queue(){
 if(!client||!access.moderator)return;
 const request=++queueRequest,token=guard.token(),button=$('load-moderation');button.disabled=true;
 const result=await moderationQueue(client);if(!guard.isCurrent(token)||request!==queueRequest)return;
 button.disabled=false;const holder=$('moderation-queue');
 if(result.error){replaceChildren(holder,h('p',{},'The moderation queue could not be loaded. Try opening it again.'));return;}
 const entries=[...(result.data.topics||[]).map(x=>({...x,kind:'topic'})),...(result.data.replies||[]).map(x=>({...x,kind:'reply'}))],reports=result.data.reports||[];
 $('moderation-link').textContent=`Moderation (${entries.length+reports.length})`;
 replaceChildren(holder,h('p',{class:'results-summary'},`${entries.length} pending topics and replies · ${reports.length} reports`),...entries.map(item=>h('article',{class:'discussion-card'},h('p',{class:'moderation-meta'},`${item.kind==='topic'?'Discussion':'Reply'} by @${item.author_handle}`),h('h3',{},item.title||'Reply'),...paragraph(item.body),h('div',{class:'moderation-actions'},...['published','rejected'].map(decision=>h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:async e=>{
  const buttons=e.target.parentElement.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
  const r=await moderateContent(client,item.kind,item.id,decision);if(!guard.isCurrent(token))return;
  message(r.error?'Moderation change failed. Try again.':decision==='published'?'Submission published.':'Submission was not published.',!!r.error);
  if(r.error)buttons.forEach(b=>b.disabled=false);else{await queue();detailKey=null;await connect();}
 }}},decision==='published'?'Publish':'Reject'))))),h('h3',{},'Reports'),...reports.map(r=>h('article',{class:'discussion-card'},h('h3',{},r.kind==='topic'?'Reported discussion':'Reported reply'),h('p',{},r.reason),r.kind==='topic'?h('a',{href:discussionUrl({topic:r.content_id}),class:'text-link'},'Read reported discussion'):null,h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:async e=>{e.target.disabled=true;const x=await moderateContent(client,r.kind,r.content_id,'rejected');if(!guard.isCurrent(token))return;e.target.disabled=false;message(x.error?'Could not hide the content.':'Content hidden.',!!x.error);if(!x.error)await connect();}}},'Hide reported content'))));
 if(!entries.length)holder.prepend(h('p',{},'No pending topics or replies.'));if(!reports.length)holder.append(h('p',{},'No reports to review.'));
}
$('refresh-discussions').addEventListener('click',connect);$('refresh-submissions').addEventListener('click',loadSubmissions);
$('forum-q').value=query;
$('forum-q').addEventListener('input',e=>{query=e.target.value;writeUrl();render();});$('forum-search').addEventListener('submit',e=>e.preventDefault());$('load-moderation').addEventListener('click',queue);
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);active=p.get('category')||'all';selected=p.get('topic');query=p.get('q')||'';$('forum-q').value=query;render();});
try{doc=await loadJSON('/data/forum.json',{validate:validateForum});topics=doc.topics;render();connect();}catch{replaceChildren($('forum-content'),h('p',{role:'alert'},'Discussions could not be loaded. Refresh to try again.'));}
