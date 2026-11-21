/* The first-play "Play lesson" button and the playback bar under the view, on all 23 lesson pages.
   Behaviour runs the real lesson page module (Taegeuk Il Jang's own path and a general form lesson) with only
   the WebGL view and the account widgets substituted, as in lesson-camera.test.mjs. The view's readiness is
   driven by the test, so loading, failure, first play and first manual navigation are checked in order.
   No browser is involved: layout is checked from the markup order and the stylesheet's rules and numbers,
   not from rendered pixels. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {installDom,settle} from './helpers/mini-dom.mjs';
import {parseInto} from './helpers/mini-html.mjs';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as T1 from '../js/animation/taegeuk-1-motion.js';
import {POSES,LESSON} from '../js/lessons/taegeuk-1-data.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const forms=JSON.parse(read('data/forms.json'));
const tiny={whole:{points:[[0,0,0],[.6,1.8,.4],[-.6,.4,-.5]],targetY:.9},arms:{points:[[0,1,0],[.3,1.8,.3]],targetY:1.35},feet:{points:[[0,0,0],[.4,.5,.3]],targetY:.3}};

const FAKE_VIEW=`import {createCameraRig} from ${JSON.stringify(new URL('../js/animation/camera-rig.js',import.meta.url).href)};
export function createLessonView(canvas,opts){const t=globalThis.__playTest;t.views++;const rig=createCameraRig({framing:t.framing});
 const view={draw(time){t.draws.push(time);},camera:{rig,changed(reason){opts.requestFrame();opts.onCamera(rig.state,reason);}},setView(){},get ready(){return t.ready;},destroy(){t.destroyed++;}};
 t.opts=opts;t.view=view;return view;}`;
// The study-progress widget is replaced by one that only records the player it is given (to restore a saved pose as it would).
const FAKE_WIDGETS='export function mountLessonLearning(o){globalThis.__playTest.player=o.player;} export function mountLessonHelp(){}';
register('data:text/javascript,'+encodeURIComponent(`export async function resolve(s,c,next){
 if(/animation\\/lesson-view\\.js$/.test(s))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(FAKE_VIEW)}),shortCircuit:true};
 if(/lib\\/(learning-ui|lesson-help-ui)\\.js$/.test(s))return {url:'data:text/javascript,'+encodeURIComponent(${JSON.stringify(FAKE_WIDGETS)}),shortCircuit:true};
 return next(s,c);}`));

const general=(()=>{const id='koryo',m=createFormMotion(JSON.parse(read(`data/lessons/${id}.json`)))   /* (clean-main port: main's lessons are unbaked; there is no clearance bake / helpers/baked.mjs on main) */;return {id,POSES:m.POSES,LESSON:m.LESSON,MOTION:m};})();
const PATHS={'taegeuk-1':{POSES,LESSON,MOTION:T1},koryo:general};

/** Mount a real lesson page. `ready` is the character's state when the page wires up (normally still loading). */
async function page(id='taegeuk-1',{search='',ready=false}={}){
 const env=installDom({url:`https://tkdflow.com/${id}.html${search}`}),html=read(`${id}.html`);
 parseInto(env.doc,env.doc.body,html.slice(html.indexOf('<main'),html.indexOf('</main>')+7));
 Object.assign(globalThis,{requestAnimationFrame:fn=>setTimeout(()=>fn(performance.now()),0),cancelAnimationFrame:clearTimeout,HTMLButtonElement:globalThis.HTMLElement,scrollY:0,scrollTo(){}});
 env.win.scrollTo=()=>{};
 const t=globalThis.__playTest={framing:tiny,ready,views:0,destroyed:0,draws:[]};
 const {mountLesson}=await import(`../js/pages/lesson-player.js?run=${Math.random()}`);
 await mountLesson(PATHS[id]);
 const $=i=>env.doc.getElementById(i),region=$('player-region');
 const press=(k,o={})=>{const target=o.target||region,e=env.event('keydown',{key:k,bubbles:true,...o});e.target=target;target.dispatchEvent(e);return e;};
 const click=el=>el.dispatchEvent(env.event('click',{bubbles:true}));
 const load=()=>{t.ready=true;t.opts.onReady();};
 const playing=()=>$('lesson-canvas').dataset.playing==='true';
 const offered=()=>!$('lesson-start').hidden;
 const time=()=>Number($('lesson-progress').value);
 const pose=()=>Number($('move-counter').textContent.match(/^Pose (\d+)/)?.[1]);
 const camera=()=>({...t.view.camera.rig.state});
 const stop=async()=>{if(playing())click($('btn-play'));await new Promise(r=>setTimeout(r,400));await settle(2);env.restore();};   // (lets the camera announcement settle)
 return {env,t,$,region,press,click,load,playing,offered,time,pose,camera,stop};
}
const until=async(ok,ms=3000)=>{const end=Date.now()+ms;while(!ok()){if(Date.now()>end)return false;await new Promise(r=>setTimeout(r,5));}return true;};

for(const id of Object.keys(PATHS)){
 test(`${id}: "Play lesson" appears only once the character is ready, never plays by itself, and the first play removes it for good`,async()=>{
  const p=await page(id);
  try{
   assert.equal(p.offered(),false,'not offered while the character loads');
   assert.equal(p.$('character-loading').hidden,false);
   p.load();
   assert.equal(p.offered(),true,'offered once ready');assert.equal(p.$('character-loading').hidden,true);
   const start=p.$('btn-start');
   assert.equal(start.disabled,false);assert.equal(start.getAttribute('type'),'button');
   assert.equal(start.getAttribute('aria-label'),'Play lesson');assert.match(start.textContent,/Play lesson/);
   await settle(3);assert.equal(p.playing(),false,'no autoplay');assert.equal(p.time(),0);
   start.focus();p.click(start);
   assert.equal(p.playing(),true,'the button starts the lesson');assert.equal(p.offered(),false,'and goes away');
   assert.equal(p.env.doc.activeElement,p.$('btn-play'),'keyboard focus moves to the bar’s Play/Pause, not to the page');
   assert.equal(p.$('btn-play').getAttribute('aria-label'),'Pause');
   assert.ok(await until(()=>p.time()>0),'the clock runs');
   p.click(p.$('btn-play'));const paused=p.time();
   assert.equal(p.playing(),false);assert.equal(p.offered(),false,'pausing to study leaves the view uncovered');
   await settle(3);assert.equal(p.time(),paused,'the paused pose holds');
   p.click(p.$('btn-play'));assert.equal(p.playing(),true,'the bar resumes');assert.ok(await until(()=>p.time()>paused),'from where it paused');
   p.click(p.$('btn-play'));
   assert.equal(p.t.views,1,'one view for the whole visit');assert.equal(p.t.destroyed,0);
   assert.equal(p.env.doc.querySelectorAll('audio').length,2,'no extra audio engines');
  }finally{await p.stop();}
 });
}

test('at the end of the form the overlay stays away: the bar offers Replay from the start, which restarts from pose 1',async()=>{
 const p=await page('taegeuk-1');
 try{
  p.load();p.click(p.$('btn-start'));p.click(p.$('btn-play'));
  const end=T1.DURATION,slider=p.$('lesson-progress');slider.value=String(end-.05);slider.dispatchEvent(p.env.event('input',{bubbles:true}));
  p.click(p.$('btn-play'));
  assert.ok(await until(()=>!p.playing()),'plays to the end and stops');
  assert.equal(p.time(),end);assert.equal(p.offered(),false);
  assert.equal(p.$('btn-play').getAttribute('aria-label'),'Replay from the start');
  p.click(p.$('btn-play'));assert.equal(p.playing(),true);assert.ok(p.time()<1,'restarted from the beginning');assert.equal(p.offered(),false);
 }finally{await p.stop();}
});

test('starting by any other control (bar Play, K, Space on the player, R replay) also removes the overlay; the start button can only start',async()=>{
 const starts={
  'bar Play':p=>p.click(p.$('btn-play')),
  'K key':p=>p.press('k'),
  'Space on the player':p=>p.press(' '),
  'R replay':p=>p.press('r')};
 for(const [how,go] of Object.entries(starts)){
  const p=await page('koryo');
  try{
   p.load();assert.equal(p.offered(),true,how);
   go(p);assert.equal(p.playing(),true,how);assert.equal(p.offered(),false,`${how}: the overlay is gone`);
   p.click(p.$('btn-start'));assert.equal(p.playing(),true,`${how}: a stray start-button click never pauses`);
  }finally{await p.stop();}
 }
});

test('picking a pose, frame or moment yourself removes the overlay for good, without playing, moving the camera or touching anything else',async()=>{
 const routes={
  'Next pose button':p=>p.click(p.$('btn-next')),
  'Last pose button':p=>p.click(p.$('btn-last')),
  'next frame button':p=>p.click(p.$('frame-next')),
  'time slider':p=>{const s=p.$('lesson-progress');s.value='3';s.dispatchEvent(p.env.event('input',{bubbles:true}));},
  'movement list':p=>p.click(p.env.doc.querySelectorAll('.move-row')[5]),
  '→ (frame)':p=>p.press('ArrowRight'),
  'Shift+→ (pose)':p=>p.press('ArrowRight',{shiftKey:true}),
  'End (last pose)':p=>p.press('End')};
 for(const [how,go] of Object.entries(routes)){
  const p=await page('koryo');
  try{
   p.load();assert.equal(p.offered(),true,how);
   const before=p.camera(),speed=p.$('speed').value;
   go(p);
   assert.equal(p.offered(),false,`${how}: removed`);assert.equal(p.playing(),false,`${how}: nothing starts`);
   assert.ok(p.time()>0,`${how}: the chosen moment is shown`);
   assert.deepEqual(p.camera(),before,`${how}: camera unchanged`);assert.equal(p.$('speed').value,speed);
   p.click(p.$('btn-play'));p.click(p.$('btn-play'));assert.equal(p.offered(),false,`${how}: still away after a later pause`);
   assert.equal(p.t.views,1);
  }finally{await p.stop();}
 }
});

test('the idle first pose keeps the overlay: speed, camera, focus and a restored study position do not remove it',async()=>{
 const p=await page('koryo');
 try{
  p.load();
  const speed=p.$('speed');speed.value='0.5';speed.dispatchEvent(p.env.event('change',{bubbles:true}));
  p.press('d');p.env.doc.querySelector('[data-lesson-focus="feet"]').dispatchEvent(p.env.event('click'));
  p.t.player.select(3,'resume');   // what the study-progress widget does on arrival with a saved position
  assert.equal(p.offered(),true,'still offered');assert.equal(p.pose(),4,'on the restored pose');assert.equal(p.playing(),false);
  const cam=p.camera();p.click(p.$('btn-start'));
  assert.equal(p.playing(),true);assert.equal(p.pose(),4,'plays on from it');
  assert.deepEqual({az:p.camera().azimuth,focus:p.camera().focus},{az:cam.azimuth,focus:'feet'},'camera and Footwork kept');
  assert.equal(speed.value,'0.5','speed kept');assert.equal(p.t.views,1,'the view was not rebuilt');
 }finally{await p.stop();}
});

test('a link to a pose after the first never shows the overlay; a link to pose 1 is the idle first pose and keeps it',async()=>{
 const p=await page('koryo',{search:'?pose=4'});
 try{
  p.load();assert.equal(p.offered(),false,'never offered on ?pose=4');assert.equal(p.pose(),4);assert.equal(p.playing(),false,'no autoplay');
 }finally{await p.stop();}
 const q=await page('taegeuk-1',{search:'?pose=1'});
 try{q.load();assert.equal(q.offered(),true,'?pose=1');}finally{await q.stop();}
});

test('keyboard: a key that picks a pose while the start button has focus moves focus to the bar’s Play, never to the page',async()=>{
 for(const [key,o] of [['ArrowRight',{}],['Home',{}],['ArrowRight',{shiftKey:true}]]){
  const p=await page('taegeuk-1');
  try{
   p.load();const start=p.$('btn-start');start.focus();
   p.press(key,{...o,target:start});
   assert.equal(p.offered(),false,`${key}: removed`);assert.equal(p.playing(),false);
   assert.equal(p.env.doc.activeElement,p.$('btn-play'),`${key}: focus on Play/Pause`);
  }finally{await p.stop();}
 }
});

test('Space and Enter on the start button are left to the browser (one activation, no double toggle); fields and the slider keep their keys',async()=>{
 const p=await page('taegeuk-1');
 try{
  p.load();const start=p.$('btn-start');start.focus();
  for(const key of [' ','Enter']){const e=p.press(key,{target:start});assert.equal(e.defaultPrevented,false,`${JSON.stringify(key)} not taken by the player`);}
  assert.equal(p.playing(),false,'the key itself did not toggle playback');
  p.click(start);assert.equal(p.playing(),true,'the native activation plays once');
  p.click(p.$('btn-play'));
  for(const target of [p.$('lesson-progress'),p.$('pose-url'),p.$('speed')]){
   for(const key of [' ','k']){const e=p.press(key,{target});assert.equal(e.defaultPrevented,false,`${target.id} keeps ${JSON.stringify(key)}`);}
  }
  assert.equal(p.playing(),false,'typing never toggles playback');
 }finally{await p.stop();}
});

test('if the character or the 3D view fails, "Play lesson" is never offered, even after a late ready signal',async()=>{
 for(const order of [['error'],['ready','error'],['error','ready']]){
  const p=await page('taegeuk-1');
  try{
   for(const step of order){if(step==='ready')p.load();else p.t.opts.onError();}
   assert.equal(p.offered(),false,order.join(' then '));
   assert.equal(p.$('btn-start').disabled,true,`${order}: disabled as well as hidden`);
   assert.equal(p.$('lesson-fallback').hidden,false,'the written lesson and Try again are shown instead');
  }finally{await p.stop();}
 }
 const q=await page('koryo',{ready:true});
 try{assert.equal(q.offered(),true,'a character already ready when the page wires up is offered at once');}finally{await q.stop();}
});

/* ── markup and stylesheet ── */
const PRIMARY=['btn-prev','btn-play','btn-next'],SECONDARY=['btn-first','frame-prev','frame-next','btn-last','btn-replay-move','speed'];
const controlsOf=html=>html.match(/<div class="lesson-controls"[^]*?<\/div>/)[0];
test('all 23 lesson pages: start button over the view; timeline and bar follow the view, then the current move; DOM order is the visual order',async()=>{
 assert.equal(forms.length,23);
 for(const {lessonUrl:url} of forms){
  const html=read(url),region=html.slice(html.indexOf('id="player-region"'),html.indexOf('<audio'));
  const wrap=region.slice(region.indexOf('<div class="canvas-wrap">'),region.indexOf('<div class="progress-wrap">'));
  assert.match(wrap,/<div class="lesson-start" id="lesson-start" hidden>\s*<button type="button" class="lesson-start-button" id="btn-start" aria-label="Play lesson"><svg class="lesson-start-icon"[^>]*aria-hidden="true" focusable="false">[^]*?<\/svg><span class="lesson-start-label">Play lesson<\/span><\/button>\s*<\/div>/,`${url}: overlay inside the view`);
  const at=s=>{const i=region.indexOf(s);assert.ok(i>0,`${url}: ${s}`);return i;};
  const order=['<canvas id="lesson-canvas"','id="lesson-start"','<div class="progress-wrap">','<div class="lesson-controls"','<div class="move-info"','<p class="player-keys"'].map(at);
  assert.deepEqual([...order].sort((a,b)=>a-b),order,`${url}: view, Play lesson, timeline, playback bar, current move, key help`);
  assert.equal((html.match(/id="btn-start"/g)||[]).length,1);assert.equal((html.match(/lesson-play/g)||[]).length,1,`${url}: one Play/Pause in the bar`);
  assert.doesNotMatch(html,/\bautoplay\b/,`${url}: nothing autoplays`);
  const ids=[...controlsOf(html).matchAll(/<(?:button|select) [^>]*id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,[...PRIMARY,...SECONDARY],`${url}: primary row first, then the secondary controls`);
  assert.match(controlsOf(html),/id="btn-play" aria-label="Play"><span aria-hidden="true">▶<\/span><span id="play-label">Play<\/span>/,`${url}: Play keeps its visible label`);
 }
 // Keyboard order on a real page: Tab reaches the start button, the time slider, then the bar in the order it is seen.
 const env=installDom({url:'https://tkdflow.com/koryo.html'}),html=read('koryo.html');
 try{
  parseInto(env.doc,env.doc.body,html.slice(html.indexOf('<main'),html.indexOf('</main>')+7));
  const region=env.doc.getElementById('player-region');
  const tab=region.querySelectorAll('button,select,input,a').filter(e=>!e.closest('.lesson-view-toolbar')).map(e=>e.id);
  assert.deepEqual(tab.slice(0,2+PRIMARY.length+SECONDARY.length),['btn-start','lesson-progress',...PRIMARY,...SECONDARY]);
 }finally{env.restore();}
});

/* A small reader for this stylesheet: every rule with the media query it sits in. */
const css=read('css/lesson.css');
function rules(text){
 const out=[],stack=[];let sel='',i=0;
 for(const m of text.replace(/\/\*[^]*?\*\//g,'').matchAll(/([^{}]*)([{}])/g)){
  i++;if(m[2]==='{'){const s=m[1].trim();if(s.startsWith('@'))stack.push(s);else{sel=s;stack.push(null);}continue;}
  const top=stack.pop();if(top===null)out.push({media:stack.filter(Boolean).join(' '),selector:sel,body:m[1].trim()});
 }
 return out;
}
const RULES=rules(css),SHORT='@media(min-width:560px) and (max-height:560px)',PHONE='@media(max-width:400px)';
const prop=(r,name)=>r.body.match(new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+)`))?.[1]?.trim();

test('stylesheet: Play/Pause stays labeled and large in every layout, Study view included; nothing in the bar is visually hidden',()=>{
 const HIDES=/clip-path|clip:|width: 1px|display: none|visibility: hidden|font-size: 0|opacity: 0\b/;
 for(const r of RULES.filter(r=>/play-label|lesson-play|replay-label|speed-label|#btn-|#frame-/.test(r.selector)))
  assert.doesNotMatch(r.body,HIDES,`${r.media||'all'} ${r.selector}: never visually hidden`);
 const playHeights=RULES.filter(r=>/(^|[ ,])\.lesson-play( |,|$)/.test(r.selector)&&prop(r,'height')).map(r=>[r.media||'all',parseFloat(prop(r,'height'))]);
 assert.ok(playHeights.some(([m])=>m===SHORT),'short landscape Study sets its own Play height');
 for(const [m,h] of playHeights)assert.ok(h>=44,`${m}: Play is ${h}px tall`);
 assert.match(css,/\.lesson-play \{ border-radius: 999px; width: auto; min-width: 132px; height: 52px;/,'the shared large Play');
});

test('stylesheet: every playback target is at least 44 × 44 px; only short landscape Study compacts the secondary controls',()=>{
 const target=/\.lesson-ctrl|\.lesson-play|\.speed-select|#btn-|#frame-/;
 const primary=/\.lesson-play|#btn-prev|#btn-next|#btn-play/;
 let checked=0;
 for(const r of RULES.filter(r=>target.test(r.selector)&&!/:hover|:disabled/.test(r.selector))){
  for(const name of ['width','height','min-width','min-height']){
   const v=prop(r,name);if(!v||!/^\d+(\.\d+)?px$/.test(v))continue;checked++;
   const px=parseFloat(v),secondaryOnly=!primary.test(r.selector)&&!/(^|[ ,])\.lesson-ctrl( |,|$)/.test(r.selector);
   const min=r.media===SHORT&&secondaryOnly?36:44;
   assert.ok(px>=min,`${r.media||'all'} ${r.selector} ${name}: ${px}px (at least ${min})`);
  }
 }
 assert.ok(checked>=8,'the sizes were actually read');
 assert.doesNotMatch(css,/\.lesson-ctrl:not\(\.lesson-play\)[^{]*\{[^}]*width: 40px/,'no 40 px phone squeeze');
});

test('stylesheet: one shared two-tier bar; the rows fit a 320 px phone with 44 px targets, in the page and in Study view',()=>{
 const styles=read('styles.css'),phonePad=parseFloat(styles.match(/@media \(max-width: 480px\) \{[^]*?\.container \{ padding: 0 (\d+)px; \}/)[1]);
 const bar=RULES.find(r=>r.selector==='.lesson-controls'&&/padding: 8px 12px 14px/.test(r.body)),barPad=12,gap=parseFloat(prop(bar,'gap'));
 assert.match(css,/\.lesson-controls \{ display: flex; align-items: center; justify-content: center; flex-wrap: wrap;/,'a wrapping, centered flex row');
 assert.match(css,/\n\.lesson-controls::after \{ content: ""; order: 1; flex-basis: 100%; height: 0; \}/,'the row break, shared by page and Study view');
 // The secondary controls sit after the break (order 2) and the primary ones before it (default 0): exactly the markup's split.
 const ORDER=/(^|[;\s])order:/,second=RULES.find(r=>/(^|[;\s])order: 2/.test(r.body)&&!r.media);
 assert.deepEqual(second.selector.split(',').map(s=>s.trim().replace('.lesson-controls > ','')),['#btn-first','#frame-prev','#frame-next','#btn-last','#btn-replay-move','.speed-label']);
 assert.ok(!RULES.some(r=>ORDER.test(r.body)&&r!==second&&!/::after/.test(r.selector)),'no other reordering, so tab order is the seen order');
 const ctrl=44,play=132,primaryRow=ctrl+play+ctrl+2*gap;
 const pageWidth=320-2*phonePad-2-2*barPad;               // container padding, card border, bar padding
 const studyWidth=320-2*8-2-2*10;                          // Study card inset 8 px on phones, bar padding 10 px
 assert.ok(primaryRow<=pageWidth,`page: Previous | Play | Next is ${primaryRow}px of ${pageWidth}px`);
 assert.ok(primaryRow<=studyWidth,`Study: ${primaryRow}px of ${studyWidth}px`);
 assert.ok(4*ctrl+3*gap<=pageWidth,'First, frame steps and Last fit one secondary row');
 assert.match(css,/\.lesson-study \.player-card \{ inset: 8px;/);assert.match(css,/\.lesson-study \.lesson-controls \{ padding: 4px 10px 8px; \}/);
 assert.ok(!RULES.some(r=>r.selector.includes('.lesson-controls')&&/display: grid/.test(r.body)),'no fixed grid that would clip or squeeze controls');
 const phone=RULES.filter(r=>r.media===PHONE&&/lesson-play|lesson-ctrl|lesson-controls/.test(r.selector));
 assert.deepEqual(phone.map(r=>r.selector),['.lesson-study .lesson-play'],'phone Study only makes Play a little shorter');
 assert.equal(prop(phone[0],'height'),'48px');
});

test('stylesheet: short landscape Study keeps Previous | labeled Play | Next at 44 px; the compact secondary group follows on the same line when it fits',()=>{
 const short=RULES.filter(r=>r.media===SHORT);
 assert.ok(short.some(r=>r.selector==='.lesson-study .lesson-controls::after'&&/display: none/.test(r.body)),'no forced break on short screens');
 const playRule=short.find(r=>r.selector==='.lesson-study .lesson-play');assert.equal(prop(playRule,'height'),'44px');
 assert.ok(!short.some(r=>/#play-label|replay-label/.test(r.selector)&&/clip|width: 1px/.test(r.body)),'labels stay visible');
 assert.match(css,/grid-template-rows: auto minmax\(min\(140px, 20svh\), 1fr\) auto auto auto;/,'the canvas keeps its minimum row; the card scrolls only if text is very large');
});

test('stylesheet: only the start button takes pointer events, the target is large, contrast holds, and motion respects the user setting',()=>{
 const rule=sel=>RULES.find(r=>r.selector===sel&&!r.media);
 assert.match(rule('.lesson-start').body,/position: absolute; inset: 0;[^]*pointer-events: none;/,'the layer lets drags through to the canvas');
 assert.match(rule('.lesson-start-button').body,/pointer-events: auto;/);
 assert.match(css,/\.lesson-start\[hidden\] \{ display: none; \}/);
 const heights=RULES.filter(r=>r.selector==='.lesson-start-button'&&prop(r,'min-height')).map(r=>parseFloat(prop(r,'min-height')));
 assert.ok(heights.length>=2&&heights.every(h=>h>=44),`touch target at least 44 px in every layout (${heights})`);
 assert.match(rule('.lesson-start-button:focus-visible').body,/outline: 3px solid var\(--focus\);[^]*var\(--focus-halo\)/,'two-tone focus ring kept despite the shadow');
 assert.ok(!RULES.some(r=>r.selector.includes('lesson-start')&&/animation/.test(r.body)),'no looping animation');
 assert.ok(RULES.some(r=>r.media==='@media (prefers-reduced-motion: no-preference)'&&r.selector==='.lesson-start-button'&&/transition/.test(r.body)),'the hover transition is only for users who allow motion');
 assert.doesNotMatch(rule('.lesson-start-button').body,/transition|transform/);
 const styles=read('styles.css'),hex=n=>styles.match(new RegExp(`--${n}:\\s*(#[0-9A-Fa-f]{6})`))[1];
 const lum=h=>{const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;};
 const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);};
 assert.match(rule('.lesson-start-button').body,/background: var\(--red\); color: var\(--white\);/);
 assert.ok(ratio(hex('white'),hex('red'))>=4.5,'label text on the button');
 assert.ok(ratio(hex('red'),'#e8edf1')>=3,'button against the view’s background');
 assert.ok(ratio(hex('white'),hex('red-dark'))>=4.5,'hover');
});

test('Study view: its five-row grid still gives the view the flexible row after the move',()=>{
 assert.match(css,/\.lesson-study \.player-region \{[^}]*grid-template-rows: auto minmax\(min\(140px, 25svh\), 1fr\) auto auto auto;/);
 const html=read('koryo.html'),region=html.slice(html.indexOf('id="player-region"'),html.indexOf('<audio'));
 const children=[...region.matchAll(/\n {8}<(div|p|h2) class="([^"]+)"/g)].map(m=>m[2]).filter(c=>!/sr-only|player-keys/.test(c));
 assert.deepEqual(children,['lesson-view-toolbar','canvas-wrap','progress-wrap','lesson-controls','move-info'],'the view is the second (flexible) row');
});
