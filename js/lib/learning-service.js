/* Private account state stays in memory; only visitor state uses browser storage. */
import {bounded,currentSession} from './account-ops.js';
import {getAccountService,initAccountService,hasStoredSession} from './account-service.js';
import {createEligibilityStore,INELIGIBLE} from './age-gate.js';
import {FORM_IDS,GUEST_KEY,learningRecord,validPatch,mergePatch,applyLearningPatch,createBrowserLearningStore} from './learning-model.js';
export class LearningState {
 constructor({browserStore=createBrowserLearningStore(),now=()=>new Date().toISOString(),ms=8000}={}) {
  this.browserStore=browserStore;this.now=now;this.ms=ms;this.mode='loading';this.owner=null;this.client=null;
  this.records=new Map();this.pending=new Map();this.listeners=new Set();this.generation=0;this.worker=null;this.error='';this.allowAccount=true;
 }
 snapshot(){return {generation:this.generation,allowAccount:this.allowAccount,mode:this.mode,records:[...this.records.values()].map(row=>({...row})),pending:this.pending.size+(this.worker?1:0),error:this.error,persistent:this.browserStore.persistent};}
 subscribe(fn){this.listeners.add(fn);fn(this.snapshot());return()=>this.listeners.delete(fn);}
 emit(){const state=this.snapshot();for(const fn of this.listeners)fn(state);}
 get(id){const row=this.records.get(id);return row?{...row}:null;}
 async connect(client,owner) {
  const generation=++this.generation;this.client=client;this.owner=owner;this.pending.clear();this.worker=null;this.records.clear();this.error='';
  this.mode='loading';this.emit();
  if(!owner){for(const row of this.browserStore.read())this.records.set(row.form_id,row);this.mode='browser';this.emit();return;}
  const result=await bounded(()=>client.rpc('my_learning',{account_id:owner}),{ms:this.ms,label:'Learning list'});
  if(generation!==this.generation)return;
  if(result.error||result.data?.version!==1||!Array.isArray(result.data.records)){
   this.mode='unavailable';this.error='Your saved learning could not load. Please retry, or finish your profile if setup is incomplete.';this.emit();return;
  }
  for(const raw of result.data.records){const row=learningRecord(raw);if(row)this.records.set(row.form_id,row);}
  this.mode='account';this.emit();
 }
 unavailable(){++this.generation;this.owner=null;this.records.clear();this.pending.clear();this.worker=null;this.mode='unavailable';this.error='Your sign-in could not be checked. Retry to load your saved learning.';this.emit();}
 update(id,patch) {
  const clean=validPatch(patch);
  if(!FORM_IDS.includes(id)||!clean||!['browser','account'].includes(this.mode))return false;
  const next=applyLearningPatch(this.records.get(id),id,clean,this.now());
  if(next)this.records.set(id,next);else this.records.delete(id);
  if(this.mode==='browser'){this.browserStore.write([...this.records.values()]);this.emit();return true;}
  this.pending.set(id,mergePatch(this.pending.get(id)||{},clean));this.emit();
  if(!this.error)this.drain();return true;
 }
 async drain() {
  if(this.worker||this.mode!=='account'||!this.pending.size)return;
  const token={},generation=this.generation,owner=this.owner;this.worker=token;this.error='';this.emit();
  try {
   while(this.pending.size&&generation===this.generation){
    const [id,patch]=this.pending.entries().next().value;this.pending.delete(id);
    const result=await bounded(()=>this.client.rpc('set_learning',{
     account_id:owner,lesson_id:id,save_form:patch.saved??null,pose_index:patch.last_pose??null,pose_total:patch.pose_count??null,
     practise:patch.practised??null,reset_progress:patch.reset||false,
    }),{ms:this.ms,label:'Saving learning'});
    if(generation!==this.generation)return;
    const row=learningRecord(result.data?.record);
    if(result.error||result.data?.version!==1||(result.data.record!==null&&(!row||row.form_id!==id))){
     this.pending.set(id,mergePatch(patch,this.pending.get(id)||{}));
     this.error='Changes have not synced. Keep this page open and retry.';break;
    }
    const newer=this.pending.get(id),visible=newer?applyLearningPatch(row,id,newer,this.now()):row;
    if(visible)this.records.set(id,visible);else this.records.delete(id);
    this.emit();
   }
  }finally{if(this.worker===token){this.worker=null;this.emit();}}
 }
 async retry(){if(this.mode==='account'){this.error='';return this.drain();}if(!this.owner)return this.start?.();return this.connect(this.client,this.owner);}
 async refresh(){if(this.mode==='unavailable'||this.pending.size||this.worker)return this.retry();return this.connect(this.client,this.owner);}
 browserRecords(){return this.browserStore.read();}
 importBrowser(){
  if(this.mode!=='account')return;
  for(const row of this.browserRecords()){
   const current=this.get(row.form_id),patch={saved:!!(current?.saved||row.saved)};
   if(current?.last_pose==null&&row.last_pose!==null){patch.last_pose=row.last_pose;patch.pose_count=row.pose_count;}
   if(row.practised&&!current?.practised)patch.practised=true;
   this.update(row.form_id,patch);
  }
 }
}
let singleton;
export function getLearningService(){
 if(singleton)return singleton;
 const learning=singleton=new LearningState();
 let attempts=0,subscription=null;
 async function start(){
  if(createEligibilityStore().read()===INELIGIBLE){learning.allowAccount=false;await learning.connect(null,null);return;}
  subscription?.unsubscribe();
  const service=learning.client?{status:'ready',client:learning.client}:await (++attempts===1?getAccountService():initAccountService());
  if(service.status!=='ready'){if(hasStoredSession())learning.unavailable();else await learning.connect(null,null);return;}
  const client=service.client;let authObserved=false;
  subscription=client.auth.onAuthStateChange((event,session)=>{
   if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED','TOKEN_REFRESHED'].includes(event))return;
   authObserved=true;
   setTimeout(()=>{const id=session?.user?.id||null;if(id!==learning.owner||(event==='USER_UPDATED'&&learning.mode==='unavailable'))learning.connect(client,id);},0);
  }).data?.subscription;
  const result=await currentSession(client);
  if(authObserved)return;
  if(result.error){learning.client=client;learning.unavailable();return;}
  await learning.connect(client,result.session?.user?.id||null);
 }
 learning.start=start;start();
 window.addEventListener('storage',event=>{if(event.key===GUEST_KEY&&learning.mode==='browser')learning.connect(learning.client,null);});
 return learning;
}
export function learningMessage(state) {
 if(state.error)return state.error;
 if(state.mode==='loading')return 'Loading your learning…';
 if(state.mode==='account')return state.pending?'Saving to your private account…':'Saved privately to your account · available across devices.';
 if(state.mode==='browser'&&!state.persistent)return 'Browser storage is unavailable. Changes last only while this page stays open.';
 if(state.mode==='browser'&&state.allowAccount===false)return 'Saved on this browser only. Public lessons work without an account.';
 if(state.mode==='browser')return 'Saved on this browser only. Sign in to use private account saves across devices.';
 return 'Your learning list is unavailable. Retry to load it.';
}
