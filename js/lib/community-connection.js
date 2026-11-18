/* Community connection: decides, before any network call, whether this tab
   reads Community publicly or through the account service.

   - A known under-13 result for this tab (age screen INELIGIBLE) means PUBLIC
     mode: published topics, guides and replies are read statelessly; the
     account service is never started, no stored session is restored, and no
     account, posting, reporting or moderator control is offered.
   - Otherwise ACCOUNT mode keeps the existing behaviour: session check,
     posting access, the published feed, a selected topic outside the first
     page, and a sign-in listener.
   - A page restored from the back/forward cache after the age screen recorded
     INELIGIBLE (pageShown with persisted=true) switches to public mode: late
     account responses are discarded, the sign-in listener is unsubscribed (and
     ignored even if the SDK still calls it), private state is cleared and the
     feed is re-read publicly. Nobody is signed out and no stored session is
     touched.
   Every await is followed by a request check, so a slower older response can
   never overwrite newer state. Dependencies are injected for tests. */
import {INELIGIBLE} from './age-gate.js';
import {SessionGuard} from './auth-flows.js';
import {mergePublishedTopics} from './discussions.js';
import {canonicalUuid} from './public-discussions.js';

const NO_ACCESS=Object.freeze({adult:false,moderator:false});

export function createCommunityConnection({eligibility,account,publicReader,staticTopics=[],selected=()=>null,onState=()=>{},guard=new SessionGuard(),schedule=fn=>setTimeout(fn,0)}){
 let request=0,subscription=null,client=null,session=null,access=NO_ACCESS;
 const state={mode:null,feedState:'loading',topics:staticTopics,topicLoadError:null,notice:'loading',loading:false};
 const snapshot=()=>({...state,session,access,client,mode:state.mode});
 const publish=(extra={})=>onState(snapshot(),extra);
 const ineligible=()=>eligibility.read()===INELIGIBLE;
 /** Invalidate every token the page holds (report, compose, replies, queue). */
 const invalidate=()=>{if(!guard.switchTo(null))guard.generation+=1;};
 function unsubscribe(){const current=subscription;subscription=null;if(current){current.live=false;try{current.handle?.unsubscribe?.();}catch{/* already gone */}}}
 /** Stop an EXISTING client's automatic token refresh when this tab turns
  *  public. It never creates a client, never signs out and never touches the
  *  stored session, so other tabs keep working. Each client is stopped once. */
 const suspended=new WeakSet();
 function suspend(existing){
  const auth=existing?.auth;
  if(!auth||typeof auth.stopAutoRefresh!=='function'||suspended.has(existing))return;
  suspended.add(existing);
  try{Promise.resolve(auth.stopAutoRefresh()).catch(()=>{});}catch{/* best effort */}
 }
 function dropAccount(){
  const hadPrivate=Boolean(client||session||access.adult||access.moderator||subscription);
  const prior=client;
  unsubscribe();client=null;session=null;access=NO_ACCESS;invalidate();
  if(prior)suspend(prior);
  return hadPrivate;
 }
 function subscribe(){
  if(subscription||!client?.auth?.onAuthStateChange)return;
  const mine={live:true,handle:null};subscription=mine;
  const result=client.auth.onAuthStateChange((event,nextSession)=>{
   if(!mine.live||ineligible())return;          // never restart the account client for an under-13 tab
   if(!['SIGNED_IN','SIGNED_OUT'].includes(event)||nextSession?.user?.id===guard.userId)return;
   request++;guard.switchTo(nextSession?.user?.id||null);session=nextSession;access=NO_ACCESS;
   state.loading=true;                          // stays loading until the scheduled reconnect finishes
   publish({privateCleared:true});schedule(connect);
  });
  mine.handle=result?.data?.subscription||null;
 }
 async function withSelected(read,current){
  const raw=selected();if(!raw)return true;
  const id=canonicalUuid(raw)||raw;                // deep links may use upper-case UUIDs
  if(state.topics.some(t=>String(t.id).toLowerCase()===id))return true;
  const one=await read(id);if(!current())return false;
  if(one.data)state.topics=[...state.topics,...mergePublishedTopics(staticTopics,[one.data])];else if(one.error)state.topicLoadError=id;
  return true;
 }
 async function connectPublic(req,current){
  const cleared=dropAccount();
  state.mode='public';publish({privateCleared:cleared});
  const feed=await publicReader.topics();if(!current())return;
  state.topicLoadError=null;
  if(feed.error){state.feedState='unavailable';state.notice='public-unavailable';publish({feedDone:true});return;}
  state.feedState='ready';state.topics=mergePublishedTopics(staticTopics,feed.data||[]);
  if(!await withSelected(id=>publicReader.topic(id),current))return;
  state.notice='public-ready';publish({feedDone:true});
 }
 async function connectAccount(req,current){
  state.mode='account';
  // After every wait: stop if superseded; switch to public reading if this
  // tab's age screen now says under 13 (a page restored by Back).
  const halt=()=>!current()||ineligible(),switchOrStop=()=>current()&&ineligible()?connect():undefined;
  const svc=await account.getService();
  if(halt()){
   // The service finished after this tab turned public: quiet the client it
   // created instead of using it (no session read, no listener).
   if(ineligible()&&svc?.status==='ready')suspend(svc.client);
   return switchOrStop();
  }
  if(svc.status!=='ready'){state.feedState='unavailable';state.notice='service-unavailable';publish({feedDone:true});return;}
  client=svc.client;
  const result=await account.currentSession(client);if(halt())return switchOrStop();
  if(result.error){guard.switchTo(null);session=null;access=NO_ACCESS;state.notice='session-error';publish({privateCleared:true,feedDone:true});return;}
  const next=result.session;
  if(guard.switchTo(next?.user?.id||null))publish({privateCleared:true});
  session=next;subscribe();
  const token=guard.token();access=NO_ACCESS;
  if(session){const r=await account.discussionAccess(client);if(halt())return switchOrStop();if(!guard.isCurrent(token))return;if(!r.error)access=r.data||NO_ACCESS;}
  const feed=await account.listTopics(client);if(halt())return switchOrStop();if(!guard.isCurrent(token))return;
  state.topicLoadError=null;
  if(feed.error){state.feedState='unavailable';state.notice='account-feed-unavailable';publish({feedDone:true});return;}
  state.feedState='ready';state.topics=mergePublishedTopics(staticTopics,feed.data||[]);
  if(!await withSelected(id=>account.publishedTopic(client,id),()=>guard.isCurrent(token)&&!halt()))return switchOrStop();
  state.notice='account-ready';publish({feedDone:true});
 }
 /** Every start (refresh, sign-in callback, back/forward restore) sets
  *  `loading`; only the newest request clears it, however it ends. */
 async function connect(){
  const req=++request,current=()=>req===request;
  state.loading=true;publish();
  try{return await (ineligible()?connectPublic(req,current):connectAccount(req,current));}
  finally{if(current()){state.loading=false;publish();}}
 }
 /** Replies for the topic, read the way the current mode allows. */
 function replies(topicId){
  if(state.mode==='public')return publicReader.replies(topicId);
  if(client)return account.listReplies(client,topicId);
  return Promise.resolve({data:null,error:{code:'unavailable'}});
 }
 return {
  connect,replies,guard,
  get request(){return request;},
  get state(){return snapshot();},
  /** pageshow handler. Only a page restored from the back/forward cache needs a recheck. */
  pageShown(event){
   if(!event?.persisted||!ineligible()||state.mode==='public')return null;
   request++;dropAccount();state.mode='public';state.notice='loading';state.loading=true;
   publish({privateCleared:true});
   return connect();
  },
 };
}

/** Which page controls a connection state may show. Public mode shows none. */
export function communityControls(state){
 const member=state.mode==='account'&&Boolean(state.session);
 return {
  composer:state.mode==='account'&&Boolean(state.access?.adult),
  moderation:state.mode==='account'&&Boolean(state.access?.moderator),
  report:member,submissions:member,
  signIn:state.mode==='account'&&!state.session,
 };
}

export const NOTICES=Object.freeze({
 loading:'Loading discussions…',
 'public-ready':'Published discussions are open to read. Accounts aren’t available for you, so posting and reporting are off.',
 'public-unavailable':'Discussion guides are available. Published member discussions could not be reached; refresh to try again.',
 'account-ready':'Read freely. Adult members can submit topics and replies for moderation; younger accounts stay private.',
 'account-feed-unavailable':'Discussion guides are available. Member discussions could not be reached; refresh to try again.',
 'service-unavailable':'Discussion guides are available. Member discussions could not be connected; try refreshing.',
 'session-error':'We could not check your sign-in. Refresh to try again; discussion guides remain available.',
});
