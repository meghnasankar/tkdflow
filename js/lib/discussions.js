import {bounded} from './account-ops.js';
export const TOPIC_COLUMNS='id,category,title,body,author_handle,editorial,status,created_at';
export const REPLY_COLUMNS='id,topic_id,body,author_handle,status,created_at';
export function discussionProblem({title='',body='',category},categories,{reply=false}={}){
 const errors={};if(!reply&&(title.trim().length<8||title.trim().length>160))errors.title='Use 8–160 characters for the title.';
 if(body.trim().length<(reply?10:20)||body.trim().length>(reply?4000:8000))errors.body=reply?'Use 10–4,000 characters.':'Use 20–8,000 characters.';
 if(!reply&&!categories.includes(category))errors.category='Choose a category.';return Object.keys(errors).length?errors:null;
}
/* Paging: topics newest first and replies oldest first, by the full keyset
   (created_at, id), so any number of rows sharing one timestamp is walked
   exactly once. Cursor values are the server's own strings: a timestamp is
   never parsed into a Date (that would round microseconds to milliseconds). */
export const PAGE=50;
const KEYSET_TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const KEYSET_ID=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
/** The keyset of a row exactly as the server sent it, or null if either part is unsafe. */
export function cursorOf(row){
 const at=row?.created_at,id=row?.id;
 return typeof at==='string'&&KEYSET_TIME.test(at)&&typeof id==='string'&&KEYSET_ID.test(id)?{created_at:at,id:id.toLowerCase()}:null;
}
/** PostgREST logical filter for the rows after `cursor` ('desc' = older, 'asc' = newer).
 *  The timestamp is double-quoted: '.', ':' and ',' are reserved in these values.
 *  Returns the inner list for the SDK's .or(); a REST URL wraps it in parentheses. */
export function keysetFilter(cursor,dir){
 const c=cursorOf(cursor);if(!c)return null;
 const op=dir==='asc'?'gt':'lt';
 return `created_at.${op}."${c.created_at}",and(created_at.eq."${c.created_at}",id.${op}.${c.id})`;
}
/** Split a fetched PAGE+1 rows into this page, whether more exist and the next
 *  cursor. The cursor comes from the raw rows consumed, before any row is
 *  dropped as invalid, so a bad row never makes the next page skip posts. */
export function pageOf(raw,keep=r=>r){
 const consumed=raw.slice(0,PAGE),hasMore=raw.length>PAGE;
 let cursor=null;for(let i=consumed.length-1;i>=0&&!cursor;i--)cursor=cursorOf(consumed[i]);
 if(hasMore&&!cursor)return {data:null,error:{code:'cursor',message:'Older discussions could not be loaded.'},hasMore:false,cursor:null};
 const data=consumed.map(keep).filter(Boolean);
 return {data,error:null,hasMore,cursor,dropped:consumed.length-data.length};
}
/** Append a later page to rows already shown, skipping ids already present (for
 *  example a deep-linked topic loaded on its own). */
export const appendPage=(rows,page)=>{const seen=new Set(rows.map(r=>String(r.id).toLowerCase()));return [...rows,...page.filter(r=>!seen.has(String(r.id).toLowerCase()))];};
function paged(query,dir,after,label){
 if(after&&!cursorOf(after))return Promise.resolve({data:null,error:{code:'cursor',message:'Older discussions could not be loaded.'},hasMore:false,cursor:null});
 return bounded(()=>{let q=query();if(after)q=q.or(keysetFilter(after,dir));return q.order('created_at',{ascending:dir==='asc'}).order('id',{ascending:dir==='asc'}).limit(PAGE+1);},{label})
  .then(r=>r.error?{data:null,error:r.error,hasMore:false,cursor:null}:pageOf(Array.isArray(r.data)?r.data:[]));
}
export const listTopics=(client,{after=null}={})=>paged(()=>client.from('discussion_topics').select(TOPIC_COLUMNS).eq('status','published'),'desc',after,'Discussions');
export const listReplies=(client,id,{after=null}={})=>paged(()=>client.from('discussion_replies').select(REPLY_COLUMNS).eq('topic_id',id).eq('status','published'),'asc',after,'Replies');
export const discussionAccess=client=>bounded(()=>client.rpc('discussion_access'),{label:'Posting access'});
export const submitTopic=(client,{title,body,category})=>bounded(()=>client.rpc('submit_discussion',{topic_title:title.trim(),topic_body:body.trim(),topic_category:category}),{label:'Submitting topic'});
export const submitReply=(client,id,body)=>bounded(()=>client.rpc('reply_discussion',{parent_topic:id,reply_body:body.trim()}),{label:'Submitting reply'});
export const reportContent=(client,kind,id,reason)=>bounded(()=>client.rpc('report_discussion',{content_kind:kind,target_id:id,report_reason:reason.trim()}),{label:'Reporting content'});
export const moderationQueue=client=>bounded(()=>client.rpc('discussion_queue'),{label:'Moderation queue'});
export const moderateContent=(client,kind,id,decision)=>bounded(()=>client.rpc('moderate_discussion',{content_kind:kind,target_id:id,decision}),{label:'Moderating content'});
export const resolveReport=(client,id,decision)=>bounded(()=>client.rpc('resolve_discussion_report',{report_id:id,report_decision:decision}),{label:'Reviewing report'});
export const listDiscussionGuides=client=>bounded(()=>client.from('discussion_topics').select(TOPIC_COLUMNS).eq('status','published').eq('editorial',true).order('created_at',{ascending:false}).limit(20),{label:'Discussion guides'});
export function publishedTopic(client,id){
 if(!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id||''))return Promise.resolve({data:null,error:null});
 return bounded(()=>client.from('discussion_topics').select(TOPIC_COLUMNS).eq('id',id).eq('status','published').maybeSingle(),{label:'Discussion'});
}
export function mergePublishedTopics(guides,rows){
 const reference=new Map(guides.map(t=>[t.id,t]));
 return rows.filter(t=>t.status==='published').map(t=>({...reference.get(t.id),...t}));
}
export function starterGuides(topics){
 const selected=[];for(const category of ['forms-discussion','technique-qa','competitions']){const topic=topics.find(t=>t.editorial&&t.category===category);if(topic)selected.push(topic);}
 return selected;
}
export async function copyDiscussionLink(origin,id,clipboard=globalThis.navigator?.clipboard){
 if(!clipboard?.writeText)return false;
 try{await clipboard.writeText(new URL(discussionUrl({topic:id}),origin).href);return true;}catch{return false;}
}
export function reportDecisionMessage(result){
 if(result?.already_reviewed)return 'This report was already reviewed.';
 if(result?.content_unavailable)return 'Report closed. The content is no longer available.';
 return result?.resolution==='hidden'?'Content hidden and its open reports closed.':'Report closed. The content was kept as it was.';
}

// RLS exposes nonpublic rows only to their author; never select author UUIDs.
export async function reviewSubmissions(client){
 const [topics,replies]=await Promise.all([
  bounded(()=>client.from('discussion_topics').select(TOPIC_COLUMNS).neq('status','published').order('created_at',{ascending:false}).limit(30),{label:'Your topics'}),
  bounded(()=>client.from('discussion_replies').select(REPLY_COLUMNS).neq('status','published').order('created_at',{ascending:false}).limit(30),{label:'Your replies'}),
 ]);
 return topics.error||replies.error?{error:true,data:null}:{error:null,data:[...(topics.data||[]).map(t=>({...t,kind:'topic'})),...(replies.data||[]).map(t=>({...t,kind:'reply'}))].sort((a,b)=>b.created_at.localeCompare(a.created_at))};
}
export function discussionUrl({category='all',query='',topic=null}={}){
 const params=new URLSearchParams();if(category!=='all')params.set('category',category);if(query.trim())params.set('q',query.trim());if(topic)params.set('topic',topic);
 return '/community.html'+(params.size?'?'+params:'');
}
