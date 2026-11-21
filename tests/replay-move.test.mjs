/* Replay move: one move, once, on the lesson's single clock, then pause on its pose.
   Clock tests drive LessonTimeline.advance() directly (no timers). The window
   is checked against all 23 real lessons with their narration and effects:
   it starts at the move's start, never cuts that move's speech or effect,
   caps a silent hold at 1 s, keeps the ready pose's whole hold, plays the
   last pose to the end, and always stops on the replayed pose. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LessonTimeline,replayWindow} from '../js/animation/lesson-timeline.js';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as original from '../js/animation/taegeuk-1-motion.js';
import {narratedMotion} from '../js/animation/narrated-motion.js';
import {playerKeyAction,handlePlayerKey} from '../js/lib/lesson-nav.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),json=p=>JSON.parse(read(p));
const forms=json('data/forms.json');
const baseFor=id=>id==='taegeuk-1'?original:createFormMotion(json(`data/lessons/${id}.json`));
const lessons=forms.map(f=>{const d=json(`data/narration/${f.id}.json`);return {id:f.id,url:f.lessonUrl,motion:narratedMotion(baseFor(f.id),d,f.id),narration:d};});
const events=player=>{const log=[];player.subscribe(e=>log.push(e));return log;};
const run=(player,seconds,step=1/60)=>{for(let t=0;t<seconds&&player.playing;t+=step)player.advance(step);};

test('a replay plays once from the move’s start and pauses exactly on its stop, on the same clock',()=>{
 const {motion,narration}=lessons.find(l=>l.id==='koryo'),player=new LessonTimeline(motion),log=events(player);
 const i=5,w=replayWindow(motion,i,narration);
 player.select(9);player.playMove(i,w);
 assert.equal(player.time,w.start);assert.equal(player.playing,true);assert.equal(log.at(-1).cause,'move-replay');
 run(player,30);
 assert.equal(player.playing,false);assert.equal(player.time,w.stop);assert.equal(player.index,i,'paused on the replayed pose');
 assert.equal(log.at(-1).cause,'move-ended');assert.equal(log.filter(e=>e.cause==='move-ended').length,1,'once');
 player.play();run(player,2);
 assert.ok(player.time>w.stop,'Play afterwards continues the form as normal');
});

test('Pause keeps the bounded stop; speed changes keep it; seek, pose change and frame step clear it',()=>{
 const {motion,narration}=lessons.find(l=>l.id==='taegeuk-1'),i=4,w=replayWindow(motion,i,narration);
 let p=new LessonTimeline(motion);p.playMove(i,w);run(p,(w.stop-w.start)/3);p.pause();p.setRate(.5);p.play();run(p,60);
 assert.equal(p.time,w.stop,'resumed replay still stops on the pose');assert.equal(p.index,i);
 for(const clear of [q=>q.seek(w.start+.1),q=>q.select(i),q=>q.step(1),q=>q.next()]){
  p=new LessonTimeline(motion);p.playMove(i,w);run(p,.05);clear(p);p.play();run(p,(w.stop-w.start)+3);
  assert.ok(p.stopAt===null&&(p.time>w.stop||!p.playing&&p.atEnd||p.playing),'manual navigation cancels the stop');
  assert.ok(p.time>w.stop||p.index!==i,'play continued past the old stop');
 }
});

test('normal Play is unchanged: without a replay the clock runs through every move to the end',()=>{
 const {motion}=lessons.find(l=>l.id==='taegeuk-1'),p=new LessonTimeline(motion);
 p.select(3);p.play();run(p,motion.DURATION+5,1/30);
 assert.equal(p.atEnd,true);assert.equal(p.stopAt,null);
});

test('in all 23 lessons the window stops on the replayed pose without cutting its sound, capping silent holds at 1 s',()=>{
 let capped=0;
 for(const {id,motion,narration} of lessons){
  const C=motion.CHAPTERS,n=C.length;
  for(let i=0;i<n;i++){
   const w=replayWindow(motion,i,narration);
   assert.equal(w.start,i===0?0:C[i].start,`${id} ${i} starts at the move's start`);
   assert.equal(motion.indexAtTime(w.stop),i,`${id} ${i} stops on its own pose`);
   assert.ok(w.stop>=C[i].at||i<n-1&&w.stop===C[i+1].start-1e-3,`${id} ${i} reaches the pose`);
   if(i===n-1){assert.equal(w.stop,motion.DURATION,`${id} last pose plays to the end`);continue;}
   assert.ok(w.stop<C[i+1].start,`${id} ${i} stops before the next move`);
   const sounds=[narration.cues[i]?.end,...(narration.effects||[]).filter(e=>e.pose===i).map(e=>e.end)].filter(Number.isFinite);
   for(const end of sounds)assert.ok(w.stop>=Math.min(end,C[i+1].start-1e-3),`${id} ${i} never cuts its speech or effect`);
   if(i===0)assert.equal(w.stop,C[1].start-1e-3,`${id} ready pose keeps its whole hold`);
   else{
    const loud=Math.max(C[i].at,...sounds);
    assert.ok(w.stop<=Math.max(C[i].at+1,loud)+1e-9,`${id} ${i} silent hold capped at 1 s`);
    assert.ok(w.stop>=Math.min(C[i+1].start-1e-3,C[i].at+1)-1e-9,`${id} ${i} keeps up to 1 s of its hold`);
    if(C[i+1].start-1e-3>Math.max(C[i].at+1,loud))capped++;
   }
  }
 }
 assert.ok(capped>0,'some long silent holds are actually capped');
});

test('R replays inside the player only, once per press, never with modifiers or in a field',()=>{
 const region={tagName:'DIV'},key=(k,o={})=>({key:k,target:region,...o});
 assert.equal(playerKeyAction(key('r'),region),'replay');assert.equal(playerKeyAction(key('R'),region),'replay');
 for(const o of [{shiftKey:true},{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true}])assert.equal(playerKeyAction(key('r',o),region),null);
 assert.equal(playerKeyAction({key:'r',target:{tagName:'INPUT'}},region),null);
 let n=0;const player={replay:()=>n++},e=o=>({...key('r',o),preventDefault(){}});
 handlePlayerKey(e(),region,player);handlePlayerKey(e({repeat:true}),region,player);
 assert.equal(n,1,'a held key does not restart the replay');
});

test('all 23 lesson pages offer Replay move in the playback controls, the R hint and a separate status',()=>{
 for(const {url} of lessons){
  const html=read(url),controls=html.slice(html.indexOf('<div class="lesson-controls"'),html.indexOf('</div>',html.indexOf('<div class="lesson-controls"')));
  assert.match(controls,/<button type="button" class="lesson-ctrl lesson-replay" id="btn-replay-move"><span aria-hidden="true">↺<\/span><span class="replay-label">Replay move<\/span><\/button>/,url);
  assert.match(html,/<kbd>R<\/kbd> replay the current move once/,url);
  assert.match(html,/<span class="sr-only" id="replay-status" role="status"><\/span>/,url);
  assert.notEqual(html.indexOf('id="replay-status"'),html.indexOf('id="voice-status"'));
 }
 const page=read('js/pages/lesson-player.js');
 assert.match(page,/\$\('replay-status'\)/);assert.doesNotMatch(page.match(/function replayStatus[^]*?\n}/)[0],/voice-status/,'replay never writes the voice error status');
 assert.match(read('start-here.html'),/R to replay the current move once/);
});

test('Study view keeps every playback control, with the Replay move label visible (phone and short screens)',()=>{
 // (The bar's row layout and target sizes are checked in lesson-play-start.test.mjs.)
 const css=read('css/lesson.css'),block=q=>{const start=css.indexOf(q);assert.ok(start>=0,q);return css.slice(start,css.indexOf('\n}\n',start));};
 const cells=(read('koryo.html').match(/<div class="lesson-controls"[^]*?<\/div>/)[0].match(/<button |<label /g)||[]).length;
 assert.equal(cells,9,'all nine playback controls are in the bar');
 for(const q of ['@media(max-width:400px){','@media(min-width:560px) and (max-height:560px){']){
  assert.doesNotMatch(block(q),/replay-label[^{]*\{[^}]*(clip-path|width: 1px|display: none)/,`${q} keeps the Replay move label visible`);
 }
});
