/* Private study state uses animation pose indexes, never a claim of skill. */
export const FORM_IDS = Object.freeze(["taegeuk-1", "taegeuk-2", "taegeuk-3", "taegeuk-4", "taegeuk-5", "taegeuk-6", "taegeuk-7", "taegeuk-8", "koryo", "keumgang", "taebaek", "pyongwon", "sipjin", "jitae", "chon-ji", "dan-gun", "do-san", "won-hyo", "yul-gok", "joong-gun", "songahm-1", "songahm-2", "songahm-3"]);
export const GUEST_KEY='tkdflow.learning.browser.v1';
export function learningRecord(raw) {
 if(!raw||!FORM_IDS.includes(raw.form_id)||typeof raw.saved!=='boolean'||typeof raw.practised!=='boolean')return null;
 const hasPose=raw.last_pose!==null&&raw.last_pose!==undefined;
 if(hasPose&&(!Number.isInteger(raw.last_pose)||!Number.isInteger(raw.pose_count)||raw.pose_count<1||raw.pose_count>200||raw.last_pose<0||raw.last_pose>=raw.pose_count))return null;
 const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
 return {form_id:raw.form_id,saved:raw.saved,last_pose:hasPose?raw.last_pose:null,pose_count:hasPose?raw.pose_count:null,practised:raw.practised,studied_at:date(raw.studied_at),updated_at:date(raw.updated_at)};
}
export function validPatch(patch) {
 if(!patch||typeof patch!=='object')return null;
 const clean={};
 for(const key of ['saved','practised','reset'])if(Object.hasOwn(patch,key)){if(typeof patch[key]!=='boolean')return null;clean[key]=patch[key];}
 if(Object.hasOwn(patch,'last_pose')||Object.hasOwn(patch,'pose_count')){
  if(!Number.isInteger(patch.last_pose)||!Number.isInteger(patch.pose_count)||patch.pose_count<1||patch.pose_count>200||patch.last_pose<0||patch.last_pose>=patch.pose_count)return null;
  clean.last_pose=patch.last_pose;clean.pose_count=patch.pose_count;
 }
 return Object.keys(clean).length?clean:null;
}
export function mergePatch(previous,next) {
 if(next.reset)return {...(previous.saved===undefined?{}:{saved:previous.saved}),...next};
 return {...previous,...next};
}
export function applyLearningPatch(record,id,patch,now=new Date().toISOString()) {
 const row=record||{form_id:id,saved:false,last_pose:null,pose_count:null,practised:false,studied_at:null,updated_at:null};
 const next={...row,updated_at:now};
 if(patch.saved!==undefined)next.saved=patch.saved;
 if(patch.reset){next.last_pose=null;next.pose_count=null;next.practised=false;next.studied_at=null;}
 {
  if(patch.last_pose!==undefined){next.last_pose=patch.last_pose;next.pose_count=patch.pose_count;next.studied_at=now;}
  if(patch.practised!==undefined){next.practised=patch.practised;next.studied_at=now;}
 }
 return next.saved||next.last_pose!==null||next.practised?next:null;
}
export function resumePose(record,count) {
 return !record||!Number.isInteger(record.last_pose)||!Number.isInteger(count)||count<1?null:Math.max(0,Math.min(count-1,record.last_pose));
}
export function learningUrl(id,record) {
 if(!FORM_IDS.includes(id))return '/forms.html';
 return `/${id}.html${record?.last_pose!==null&&record?.last_pose!==undefined?'?resume=1#player':''}`;
}
export function createBrowserLearningStore(source=()=>globalThis.localStorage) {
 let memory=[],persistent=true,dirty=false;
 const storage=()=>typeof source==='function'?source():source;
 const clean=rows=>[...new Map(rows.map(learningRecord).filter(Boolean).map(row=>[row.form_id,row])).values()].slice(0,FORM_IDS.length);
 return {
  read(){if(!dirty)try{const target=storage();if(!target)throw Error('No storage');const raw=target.getItem(GUEST_KEY);if(raw){const data=JSON.parse(raw);memory=data.version===1&&Array.isArray(data.records)?clean(data.records):[];}else memory=[];}catch{persistent=false;}return memory.map(row=>({...row}));},
  write(rows){memory=clean(rows);try{const target=storage();if(!target)throw Error('No storage');target.setItem(GUEST_KEY,JSON.stringify({version:1,records:memory}));persistent=true;dirty=false;}catch{persistent=false;dirty=true;}return persistent;},
  get persistent(){return persistent;},
 };
}
