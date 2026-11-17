import {bounded} from './account-ops.js';
export const TOPIC_COLUMNS='id,category,title,body,author_handle,editorial,status,created_at';
export const REPLY_COLUMNS='id,topic_id,body,author_handle,status,created_at';
export function discussionProblem({title='',body='',category},categories,{reply=false}={}){
 const errors={};if(!reply&&(title.trim().length<8||title.trim().length>160))errors.title='Use 8–160 characters for the title.';
 if(body.trim().length<(reply?10:20)||body.trim().length>(reply?4000:8000))errors.body=reply?'Use 10–4,000 characters.':'Use 20–8,000 characters.';
 if(!reply&&!categories.includes(category))errors.category='Choose a category.';return Object.keys(errors).length?errors:null;
}
export const listTopics=client=>bounded(()=>client.from('discussion_topics').select(TOPIC_COLUMNS).eq('status','published').order('created_at',{ascending:false}).limit(100),{label:'Discussions'});
export const listReplies=(client,id)=>bounded(()=>client.from('discussion_replies').select(REPLY_COLUMNS).eq('topic_id',id).eq('status','published').order('created_at').limit(100),{label:'Replies'});
export const discussionAccess=client=>bounded(()=>client.rpc('discussion_access'),{label:'Posting access'});
export const submitTopic=(client,{title,body,category})=>bounded(()=>client.rpc('submit_discussion',{topic_title:title.trim(),topic_body:body.trim(),topic_category:category}),{label:'Submitting topic'});
export const submitReply=(client,id,body)=>bounded(()=>client.rpc('reply_discussion',{parent_topic:id,reply_body:body.trim()}),{label:'Submitting reply'});
export const reportContent=(client,kind,id,reason)=>bounded(()=>client.rpc('report_discussion',{content_kind:kind,target_id:id,report_reason:reason.trim()}),{label:'Reporting content'});
export const moderationQueue=client=>bounded(()=>client.rpc('discussion_queue'),{label:'Moderation queue'});
export const moderateContent=(client,kind,id,decision)=>bounded(()=>client.rpc('moderate_discussion',{content_kind:kind,target_id:id,decision}),{label:'Moderating content'});

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
 return '/forum.html'+(params.size?'?'+params:'');
}
