/* Public Community reading without an account client: published topics,
   editorial guides and published replies, read statelessly with the public
   project key (see public-read.js). Requests name exactly the public columns
   that the database grants to anonymous readers, and every row is reduced to
   that allowlist and checked against the table's own constraints before use.
   The server's row security already limits anonymous reads to published
   topics, and to published replies of published topics. */
import {ACCOUNTS} from '../config.js';
import {publicBase,publicRequest} from './public-read.js';
import {TOPIC_COLUMNS,REPLY_COLUMNS,PAGE,cursorOf,keysetFilter,pageOf,guideWording} from './discussions.js';

/** The categories allowed by discussion_topics' check constraint. */
export const CATEGORIES=Object.freeze(['technique-qa','forms-discussion','sparring','training','competitions','grading-testing','general']);
export const UUID=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
/** Lower-case form of a valid UUID (PostgreSQL returns UUIDs lower-case), else null. */
export const canonicalUuid=v=>typeof v==='string'&&UUID.test(v)?v.toLowerCase():null;
const TOPIC_KEYS=TOPIC_COLUMNS.split(','),REPLY_KEYS=REPLY_COLUMNS.split(',');
const MESSAGES={unavailable:'Discussions are unavailable.',failed:'Discussions could not load.',timeout:'Discussions timed out'};

const length=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.trim().length<=max;
const isDate=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s));
const handle=s=>typeof s==='string'&&s.length>0&&s.length<=80;
const pick=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));

export function publicTopicRow(row){
 if(!row||typeof row!=='object')return null;
 const t=pick(row,TOPIC_KEYS);
 return t.status==='published'&&UUID.test(t.id||'')&&CATEGORIES.includes(t.category)&&length(t.title,8,160)&&length(t.body,20,8000)
  &&handle(t.author_handle)&&typeof t.editorial==='boolean'&&isDate(t.created_at)?guideWording(t):null;
}
export function publicReplyRow(row,topicId){
 if(!row||typeof row!=='object')return null;
 const r=pick(row,REPLY_KEYS);
 return r.status==='published'&&UUID.test(r.id||'')&&canonicalUuid(r.topic_id)===canonicalUuid(topicId)&&length(r.body,10,4000)&&handle(r.author_handle)&&isDate(r.created_at)?r:null;
}

export function publicUrl(table,filters,cfg=ACCOUNTS){
 const base=publicBase(cfg);
 if(!base||!['discussion_topics','discussion_replies'].includes(table))return null;
 const params=new URLSearchParams({select:table==='discussion_topics'?TOPIC_COLUMNS:REPLY_COLUMNS,...filters});
 return `${base}/rest/v1/${table}?${params}`;
}

async function rows(url,check,opts){
 const result=await publicRequest(url,{...opts,messages:MESSAGES});
 if(result.error)return {data:null,error:result.error};
 if(!Array.isArray(result.data))return {data:null,error:{code:'shape',message:MESSAGES.failed}};
 const valid=result.data.map(check).filter(Boolean);
 return {data:valid,error:null,dropped:result.data.length-valid.length};
}

/** One page of a published list, by keyset (see discussions.js). */
async function page(table,filters,dir,check,opts){
 const after=opts.after||null;
 if(after&&!cursorOf(after))return {data:null,error:{code:'cursor',message:MESSAGES.failed},hasMore:false,cursor:null};
 const keyset=after?{or:`(${keysetFilter(after,dir)})`}:{};
 const url=publicUrl(table,{...filters,...keyset,order:`created_at.${dir},id.${dir}`,limit:String(PAGE+1)},opts.cfg);
 const result=await publicRequest(url,{...opts,messages:MESSAGES});
 if(result.error)return {data:null,error:result.error,hasMore:false,cursor:null};
 if(!Array.isArray(result.data))return {data:null,error:{code:'shape',message:MESSAGES.failed},hasMore:false,cursor:null};
 return pageOf(result.data,check);
}
export const publicTopics=(opts={})=>page('discussion_topics',{status:'eq.published'},'desc',publicTopicRow,opts);
export const publicGuides=(opts={})=>rows(publicUrl('discussion_topics',{status:'eq.published',editorial:'eq.true',order:'created_at.desc',limit:'20'},opts.cfg),publicTopicRow,opts);

/** One published topic, or data:null when it is absent (pending, hidden or deleted). */
export async function publicTopic(raw,opts={}){
 const id=canonicalUuid(raw);if(!id)return {data:null,error:null};
 const result=await rows(publicUrl('discussion_topics',{id:`eq.${id}`,status:'eq.published',limit:'1'},opts.cfg),publicTopicRow,opts);
 return result.error?result:{data:result.data.find(t=>canonicalUuid(t.id)===id)||null,error:null};
}

export function publicReplies(raw,opts={}){
 const topicId=canonicalUuid(raw);if(!topicId)return Promise.resolve({data:[],error:null,hasMore:false,cursor:null});
 return page('discussion_replies',{topic_id:`eq.${topicId}`,status:'eq.published'},'asc',r=>publicReplyRow(r,topicId),opts);
}
