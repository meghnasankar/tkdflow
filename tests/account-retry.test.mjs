/* The shared account start-up: one attempt per page, and an explicit retry that
   only restarts an attempt that has finished as unavailable. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServiceCache} from '../js/lib/account-service.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function starter(results){let n=0;const start=()=>Promise.resolve(results[Math.min(n++,results.length-1)]);start.count=()=>n;return start;}

test('an unavailable start-up is retried once on request, and the result becomes the shared one',async()=>{
 const start=starter([{status:'unavailable'},{status:'ready',client:'c1'}]),cache=createServiceCache(start);
 assert.equal((await cache.get()).status,'unavailable');
 assert.equal((await cache.get()).status,'unavailable','plain get keeps the result');assert.equal(start.count(),1);
 const [a,b]=await Promise.all([cache.retry(),cache.retry()]);
 assert.equal(a.client,'c1');assert.equal(a,b,'simultaneous retries share one attempt');assert.equal(start.count(),2);
 assert.equal((await cache.get()).client,'c1','everyone now gets the ready client');
});

test('a ready client, switched-off accounts and a start-up in progress are never restarted',async()=>{
 const ready=starter([{status:'ready',client:'c1'},{status:'ready',client:'c2'}]),r=createServiceCache(ready);
 await r.get();assert.equal((await r.retry()).client,'c1');assert.equal(ready.count(),1);
 const off=starter([{status:'disabled'}]),o=createServiceCache(off);
 await o.get();await o.retry();assert.equal(off.count(),1);
 const gate=deferred();let n=0;const slow=createServiceCache(()=>{n++;return gate.promise;});
 const p1=slow.get(),p2=slow.retry();assert.equal(p1,p2,'a retry while starting returns the same attempt');assert.equal(n,1);
 gate.resolve({status:'unavailable'});await p1;
});
