/* The page harnesses must not depend on how fast this machine's timers are.
   PR 28's CI failed only on a runner whose zero-delay timers fired later than
   the harness's immediate-only waits: a reconnect scheduled with
   setTimeout(fn,0) had not run, and its late timer then redrew the NEXT test's
   document. These tests pin the fix. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {settle} from './helpers/mini-dom.mjs';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
/** Preload that makes every zero/short timer fire no sooner than `ms`. */
const slowTimers=ms=>`data:text/javascript,const t=globalThis.setTimeout;globalThis.setTimeout=(f,d=0,...a)=>t(f,Math.max(Number(d)||0,${ms}),...a);`;

test('settle() runs zero-delay timers queued before it, even when timers are slow',async()=>{
 const real=globalThis.setTimeout;
 globalThis.setTimeout=(f,d=0,...a)=>real(f,Math.max(Number(d)||0,15),...a);
 try{
  let ran=false;
  setTimeout(()=>{ran=true;},0);          // what a page does to schedule a reconnect
  await settle(1);
  assert.equal(ran,true,'the earlier timer has run by the end of one settle round');
 }finally{globalThis.setTimeout=real;}
});

test('the Events and Community page harnesses pass with slow timers, as on a slower CI runner',()=>{
 const env={...process.env};delete env.NODE_TEST_CONTEXT;   // a fresh, independent test run
 const result=spawnSync(process.execPath,[`--import=${slowTimers(5)}`,'--test','tests/community-focus.test.mjs','tests/events-focus.test.mjs'],
  {cwd:ROOT,encoding:'utf8',timeout:120000,env});
 const failed=(result.stdout.match(/ℹ fail (\d+)/)||[])[1];
 assert.ok(!result.error&&!result.signal,`the run finished (${result.error?.code||result.signal||''})`);
 assert.equal(failed,'0',`no harness test fails with slow timers:\n${result.stdout.split('\n').filter(l=>/^✖|Error/.test(l)).slice(0,6).join('\n')}`);
 assert.equal(result.status,0,`the child test run exited cleanly (status ${result.status})`);
});
