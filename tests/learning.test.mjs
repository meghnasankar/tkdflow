import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FORM_IDS,GUEST_KEY,learningRecord,validPatch,mergePatch,applyLearningPatch,resumePose,learningUrl,createBrowserLearningStore} from '../js/lib/learning-model.js';
import {LearningState,learningMessage} from '../js/lib/learning-service.js';
const NOW='2026-11-17T12:00:00Z',id='taegeuk-1';
const row=(over={})=>({form_id:id,saved:true,last_pose:5,pose_count:20,practised:false,studied_at:NOW,updated_at:NOW,...over});
const ok=data=>({data,error:null}),tick=()=>new Promise(r=>setTimeout(r,0));
const storage=()=>{const map=new Map();return {map,getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};
const stateFor=store=>new LearningState({browserStore:createBrowserLearningStore(store),now:()=>NOW,ms:30});
test('learning IDs cover all 23 published lessons',()=>assert.deepEqual(FORM_IDS,JSON.parse(readFileSync(new URL('../data/forms.json',import.meta.url))).map(f=>f.id)));
test('untrusted saved records and patches cannot introduce routes, identity fields or invalid positions',()=>{
 for(const bad of [row({form_id:'../auth'}),row({last_pose:-1}),row({last_pose:20}),row({pose_count:0}),row({saved:'yes'}),row({last_pose:1.2})])assert.equal(learningRecord(bad),null);
 assert.deepEqual(validPatch({saved:true,user_id:'other',email:'ignored'}),{saved:true});
 for(const bad of [{last_pose:1},{pose_count:20},{last_pose:21,pose_count:20},{saved:'true'}])assert.equal(validPatch(bad),null);
 assert.equal(learningUrl('../auth',row()),'/forms.html');assert.equal(learningUrl(id,row()),'/taegeuk-1.html?resume=1#player');
 assert.equal(resumePose(row({last_pose:19}),12),11);assert.equal(resumePose(null,20),null);
});
test('bookmark changes preserve progress, and reset preserves the bookmark and can coalesce a later pose',()=>{
 const unsaved=applyLearningPatch(row(),id,{saved:false},NOW);assert.equal(unsaved.last_pose,5);
 const reset=applyLearningPatch(row({practised:true}),id,{reset:true},NOW);assert.equal(reset.saved,true);assert.equal(reset.last_pose,null);assert.equal(reset.practised,false);
 const patch=mergePatch({reset:true,saved:true},{last_pose:3,pose_count:20});assert.equal(patch.reset,true);
 const next=applyLearningPatch(row({practised:true}),id,patch,NOW);assert.equal(next.last_pose,3);assert.equal(next.practised,false);
 assert.equal(applyLearningPatch(row({saved:false}),id,{reset:true},NOW),null);
});
test('browser saves survive reload, discard malformed records and fail safely when storage is blocked',()=>{
 const s=storage(),first=createBrowserLearningStore(s);first.write([row()]);assert.equal(createBrowserLearningStore(s).read()[0].last_pose,5);
 s.map.set(GUEST_KEY,JSON.stringify({version:1,records:[row(),row({form_id:'unknown'})]}));assert.equal(createBrowserLearningStore(s).read().length,1);
 const blocked=createBrowserLearningStore(()=>{throw Error('blocked');});assert.deepEqual(blocked.read(),[]);assert.equal(blocked.write([row()]),false);assert.equal(blocked.read().length,1);
 assert.doesNotMatch(s.map.get(GUEST_KEY),/user_id|email|full_name/);
});
test('visitors save only in browser storage and receive accurate persistence wording',async()=>{
 const s=storage(),state=stateFor(s);await state.connect(null,null);state.update(id,{last_pose:4,pose_count:20,saved:true});
 assert.equal(state.get(id).last_pose,4);assert.equal(createBrowserLearningStore(s).read()[0].saved,true);assert.match(learningMessage(state.snapshot()),/browser only/);
});
test('account learning uses owner-bound RPCs and is never cached into visitor storage',async()=>{
 const s=storage(),state=stateFor(s),calls=[];
 const client={rpc:async(name,args)=>{calls.push([name,args]);return ok(name==='my_learning'?{version:1,records:[]}:{version:1,record:row({last_pose:3})});}};
 await state.connect(client,'account-a');state.update(id,{saved:true,last_pose:3,pose_count:20});await tick();
 assert.equal(calls[1][1].account_id,'account-a');assert.equal(calls[1][1].lesson_id,id);assert.equal(s.map.size,0);assert.equal(state.snapshot().pending,0);
 assert.match(learningMessage(state.snapshot()),/privately to your account/);
});
test('a failed account write remains visibly unsynced and retries without losing the intended change',async()=>{
 const state=stateFor(storage());let failed=true;
 const client={rpc:async name=>name==='my_learning'?ok({version:1,records:[row()]}):failed?{error:{code:'network'},data:null}:ok({version:1,record:row({saved:false})})};
 await state.connect(client,'a');state.update(id,{saved:false});await tick();assert.equal(state.get(id).saved,false);assert.equal(state.snapshot().pending,1);assert.match(state.snapshot().error,/not synced/);
 failed=false;await state.retry();assert.equal(state.snapshot().pending,0);assert.equal(state.snapshot().error,'');
});
test('an old in-flight response cannot expose another account’s learning after switching or signing out',async()=>{
 const s=storage(),state=stateFor(s);let release;
 const client={rpc:async(name,args)=>name==='my_learning'?ok({version:1,records:args.account_id==='a'?[row()]:[]}):new Promise(resolve=>{release=()=>resolve(ok({version:1,record:row({last_pose:8})}));})};
 await state.connect(client,'a');state.update(id,{last_pose:8,pose_count:20});await state.connect(client,'b');assert.equal(state.get(id),null);
 release();await tick();assert.equal(state.get(id),null);await state.connect(client,null);assert.equal(state.get(id),null);assert.equal(s.map.size,0);
});
test('newer queued bookmark choices survive an older progress response',async()=>{
 const state=stateFor(storage()),resolvers=[];
 const client={rpc:async name=>name==='my_learning'?ok({version:1,records:[row({saved:false})]}):new Promise(resolve=>resolvers.push(resolve))};
 await state.connect(client,'a');state.update(id,{last_pose:6,pose_count:20});state.update(id,{saved:true});
 resolvers.shift()(ok({version:1,record:row({saved:false,last_pose:6})}));await tick();assert.equal(state.get(id).saved,true);
 resolvers.shift()(ok({version:1,record:row({saved:true,last_pose:6})}));await tick();assert.equal(state.snapshot().pending,0);
});
test('a hanging read is bounded and never silently turns signed-in account state into browser state',async()=>{
 const state=stateFor(storage());await state.connect({rpc:()=>new Promise(()=>{})},'a');assert.equal(state.mode,'unavailable');assert.equal(state.update(id,{saved:true}),false);
});
test('browser import is explicit and preserves existing account study position',async()=>{
 const s=storage();createBrowserLearningStore(s).write([row({last_pose:8})]);const state=stateFor(s);let sent;
 const client={rpc:async(name,args)=>{if(name==='my_learning')return ok({version:1,records:[row({saved:false,last_pose:2})]});sent=args;return ok({version:1,record:row({last_pose:2})});}};
 await state.connect(client,'a');assert.equal(state.get(id).saved,false);state.importBrowser();await tick();assert.equal(sent.save_form,true);assert.equal(sent.pose_index,null);assert.equal(state.get(id).last_pose,2);
});
test('shared pose links override auto-resume and the player never marks practice automatically',()=>{
 const player=readFileSync(new URL('../js/pages/lesson-player.js',import.meta.url),'utf8'),ui=readFileSync(new URL('../js/lib/learning-ui.js',import.meta.url),'utf8');
 assert.match(player,/mountLessonLearning/);assert.match(ui,/!explicitPose&&!interacted/);assert.match(ui,/player.select\(resume,'resume'\)/);
 assert.doesNotMatch(ui,/practised:\s*true/);assert.match(ui,/Mark as practised/);
});


test('quota failure keeps the latest in-memory change instead of rereading an older disk snapshot',()=>{
 const s=storage();s.setItem(GUEST_KEY,JSON.stringify({version:1,records:[row({last_pose:2})]}));
 const store=createBrowserLearningStore(s);store.read();s.setItem=()=>{throw Error('quota');};
 store.write([row({last_pose:9})]);assert.equal(store.read()[0].last_pose,9);assert.equal(store.persistent,false);
});
test('clearing visitor data in another tab empties the next browser-store read',()=>{
 const s=storage(),store=createBrowserLearningStore(s);store.write([row()]);s.map.clear();assert.deepEqual(store.read(),[]);
});


test('the first browser-ready notification already includes stored progress for auto-resume',async()=>{
 const s=storage();createBrowserLearningStore(s).write([row()]);const state=stateFor(s),seen=[];
 state.subscribe(snapshot=>{if(snapshot.mode==='browser')seen.push(snapshot.records);});await state.connect(null,null);
 assert.equal(seen[0][0].last_pose,5);
});


test('known under-age visitors are not invited to sign in, and blocked storage is still described accurately',()=>{
 assert.doesNotMatch(learningMessage({mode:'browser',persistent:true,allowAccount:false}),/sign in/i);
 assert.match(learningMessage({mode:'browser',persistent:false,allowAccount:false}),/page stays open/);
});
