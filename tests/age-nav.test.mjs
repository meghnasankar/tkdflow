/* Header in a known under-13 tab: one neutral "About accounts" link.
   Each scenario runs the real site.js and age-gate.js in its OWN process
   (tests/helpers/age-nav-scenario.mjs), so the page-wide shared store always
   starts empty: a blocked-storage case can never pass because an earlier case
   left a result behind, and the product needs no test-only reset. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function run(name){
 const r=spawnSync(process.execPath,['tests/helpers/age-nav-scenario.mjs',name],{cwd:ROOT,encoding:'utf8',timeout:20000});
 assert.ok(!r.error&&!r.signal&&r.status===0,`${name} ran (${r.status}) ${(r.stderr||'').slice(0,300)}`);
 return JSON.parse(r.stdout);
}
const ABOUT=[{text:'About accounts',href:'/start-here.html#sh-community',resolved:'/start-here.html#sh-community'}];
const GUEST=[{text:'Log in',href:'/auth.html',resolved:'/auth.html'},{text:'Join free',href:'/auth.html?mode=register',resolved:'/auth.html?mode=register'}];

test('a known under-13 tab shows only About accounts, even with a stored session, without reading that session',()=>{
 const r=run('initial-ineligible-session');
 assert.deepEqual(r.initial,ABOUT,'root-absolute; resolves from /companions/… too');
 assert.equal(r.initialSessionReads,0,'the stored session is not even read');
});

test('accounts switched off or signup off do not bring account links back for that tab',()=>{
 const r=run('initial-ineligible-accounts-off');
 assert.deepEqual(r.initial,ABOUT);
 assert.equal(r.offChanged,false);assert.equal(r.signupOffChanged,false,'same visible state: nothing redrawn');
 assert.deepEqual(r.after,ABOUT);
});

test('an under-13 answer recorded on the same page switches the header at once, moving focus only from a replaced link',()=>{
 const r=run('guest-then-answer');
 assert.deepEqual(r.initial,GUEST,'unscreened visitors keep today’s links');
 assert.equal(r.recorded,'ineligible');
 assert.deepEqual(r.after,ABOUT);
 assert.equal(r.focusOnNew,true,'focus that was on “Log in” moves to “About accounts”');
 assert.equal(r.afterAdult,'ineligible','the result is sticky');
 assert.equal(r.sameNodeAfterAdult,true);assert.equal(r.rerender,false);
 const other=run('guest-answer-focus-elsewhere');
 assert.deepEqual(other.after,ABOUT);
 assert.equal(other.focusStayed,true,'focus elsewhere on the page is never moved');
});

test('unrelated session changes and back/forward restores keep the same About node and focus, still without reading the session',()=>{
 const r=run('ineligible-dedupe');
 assert.equal(r.sameNodeAfterStorage,true);assert.equal(r.focusKept,true);
 assert.equal(r.sameNodeAfterPageshow,true);assert.deepEqual(r.after,ABOUT);
 assert.equal(r.sessionReadsTotal,0);
});

test('with session storage blocked, the shared store still switches the header (a separate store would not)',()=>{
 for(const name of ['blocked-getter','blocked-setitem']){
  const r=run(name);
  assert.deepEqual(r.initial,GUEST,`${name}: starts as an unscreened guest in a fresh process`);
  assert.equal(r.recorded,'ineligible',name);
  assert.deepEqual(r.after,ABOUT,`${name}: header follows the shared, memory-only result`);
  assert.equal(r.separateStoreReads,null,`${name}: a second, separate store cannot see it — why the header must share the store`);
  assert.deepEqual(r.afterPageshow,ABOUT,`${name}: still About after a back/forward restore of the same page`);
 }
});

test('eligible and unscreened tabs keep today’s root-absolute links',()=>{
 const r=run('eligible-member');
 assert.deepEqual(r.member,[{text:'My profile',href:'/profile.html',resolved:'/profile.html'}]);
 assert.deepEqual(r.guest,GUEST);
});

test('the sign-in page records into the shared store; the header never signs out, writes credentials or starts the account library',()=>{
 const auth=read('js/pages/auth.js');
 assert.match(auth,/const eligibility = sharedEligibilityStore\(\);/);
 assert.doesNotMatch(auth,/createEligibilityStore\(/,'no private store on the page that records answers');
 const site=read('js/site.js');
 assert.doesNotMatch(site,/getAccountService|initAccountService|createClient|signOut|removeItem|\.clear\(|setItem/,'header is read-only');
 const gate=read('js/lib/age-gate.js');
 assert.doesNotMatch(gate,/export function (reset|clear)|__test|forTesting/i,'no reset or test hook in the product');
 assert.ok(site.indexOf("sharedEligibilityStore().read() === INELIGIBLE ? 'age'")<site.indexOf('hasStoredSession(cfg)'),'the age result is checked before any session read');
});

test('every age writer records into the header’s shared store (sign-in page and profile hold alike)',()=>{
 const files=['js/pages','js/lib'].flatMap(d=>readdirSync(new URL(`../${d}`,import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>`${d}/${f}`)).concat('js/site.js');
 const writers=files.filter(f=>f!=='js/lib/age-gate.js'&&/\.record\(/.test(read(f)));
 assert.deepEqual(writers.sort(),['js/pages/auth.js','js/pages/profile.js'],'the known writers (update this list deliberately if a new writer is added)');
 for(const f of writers){
  const src=read(f);
  assert.match(src,/const eligibility = sharedEligibilityStore\(\);/,`${f} records through the shared store`);
  assert.doesNotMatch(src,/createEligibilityStore\(/,`${f} keeps no private store whose memory the header could not see`);
 }
 for(const name of ['page-writer','page-writer-blocked']){
  const r=run(name);
  assert.equal(r.sameModule,true,`${name}: a js/pages/ writer and the header share one age-gate module`);
  assert.deepEqual(r.initial,GUEST,`${name}: fresh process starts unscreened`);
  assert.equal(r.recorded,'ineligible');assert.deepEqual(r.after,ABOUT,`${name}: the header follows a page writer at once`);
  assert.equal(r.focusOnNew,true);
 }
});
