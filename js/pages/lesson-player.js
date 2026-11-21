import {mountLessonLearning} from '../lib/learning-ui.js';
import {mountLessonHelp} from '../lib/lesson-help-ui.js';
import {LessonTimeline,replayWindow} from '../animation/lesson-timeline.js';
import {createLessonView} from '../animation/lesson-view.js';
import {officialLabel,poseDescription,poseUrl,poseLinkProblemText,handlePlayerKey,createPoseHistory,createLifecyclePause,copyText,copyStatusText} from '../lib/lesson-nav.js';
import {h,replaceChildren} from '../lib/dom.js';
import {loadJSON} from '../lib/data.js';
import {narratedMotion,narrationProblem} from '../animation/narrated-motion.js';
import {turnFact} from '../lib/technique-facts.js';
import {createLessonAudio} from '../lib/lesson-audio.js';
import {cameraKeyAction,applyCameraAction,BUTTON_ACTIONS} from '../animation/camera-input.js';
export async function mountLesson({POSES,LESSON,MOTION}){
let narration=null;
try{narration=await loadJSON(`/data/narration/${LESSON.id}.json`,{timeoutMs:6000,validate:data=>narrationProblem(data,MOTION,LESSON.id)});MOTION=narratedMotion(MOTION,narration,LESSON.id);}catch{/* The visual study aid remains usable when recorded voice is unavailable. */}
const {DURATION}=MOTION,lessonPath=`/${LESSON.id}.html`;
const $=id=>document.getElementById(id),canvas=$('lesson-canvas'),player=new LessonTimeline(MOTION);
let raf=null,lastNow=0,view=null;
const voiceButton=$('voice-toggle'),audio=$('lesson-audio'),effectsButton=$('effects-toggle'),effectsAudio=$('lesson-effects');
let voiceOn=true;
if(narration){audio.src=narration.audioSrc;audio.load();}
if(narration?.effectsSrc){effectsAudio.src=narration.effectsSrc;effectsAudio.volume=.65;effectsAudio.load();}
const effects=createLessonAudio(narration?.effectsSrc?effectsAudio:null,{onFail(){effectsButton.textContent='No effects';effectsButton.disabled=true;effectsButton.setAttribute('aria-pressed','false');requestFrame();}});
effectsButton.disabled=!narration?.effectsSrc;effectsButton.textContent=narration?.effectsSrc?'Effects on':'No effects';effectsButton.setAttribute('aria-pressed',String(!!narration?.effectsSrc));
const voice=createLessonAudio(narration?audio:null,{onFail(){voiceButton.textContent='No voice';voiceButton.disabled=true;voiceButton.setAttribute('aria-pressed','false');$('voice-status').textContent='Voice could not load. The animation and captions remain available.';requestFrame();}});
voice.setEnabled(voiceOn);
voiceButton.disabled=!narration;
voiceButton.textContent=narration?(voiceOn?'Voice on':'Voice off'):'No voice';
voiceButton.setAttribute('aria-pressed',String(!!narration&&voiceOn));
let replaySelection=false;
function requestFrame(){if(raf===null)raf=requestAnimationFrame(tick);}
function tick(now){raf=null;const dt=lastNow?Math.min(.1,(now-lastNow)/1000):0;lastNow=now;const ready=voice.update({time:player.time,playing:player.playing,rate:player.rate});const effectsReady=effects.update({time:player.time,playing:player.playing,rate:player.rate});if(player.playing&&ready&&effectsReady)player.advance(dt);view?.draw(player.time);if(player.playing)requestFrame();else lastNow=0;}
function settleCanvas(){view?.draw(player.time);}
/* ── first play: a large "Play lesson" button over the viewer, offered only once the character is ready.
   It runs the same toggle as the bar's Play. It goes away for good once playback first starts (by any
   control or key), or once the learner picks a pose or a moment themselves (pose, frame or time controls, or
   a link to a pose after the first), so a pose being studied is never covered. The first, idle pose keeps it,
   including a saved study position restored on arrival. Only the button takes pointer events.
   On a 3D failure it is never offered: the view never reports ready. (Clean-main port: the repair-era showAnimationUnavailable() is not on main.) ── */
const startOverlay=$('lesson-start'),startButton=$('btn-start');
const INSPECT_CAUSES=new Set(['select','next','prev','first','last','seek','frame']);
let startDismissed=false,viewReady=false;
function offerStart(){if(startOverlay)startOverlay.hidden=startDismissed||!viewReady||!!startButton?.disabled;}
function dismissStart(){
 if(startDismissed)return;startDismissed=true;if(!startOverlay)return;
 const hadFocus=startOverlay.contains(document.activeElement);startOverlay.hidden=true;
 if(hadFocus)$('btn-play').focus({preventScroll:true});   // keyboard users land on the bar's Play/Pause, right below the view
}
view=createLessonView(canvas,{motion:MOTION,requestFrame,onCamera:cameraChanged,onReady(){$('character-loading').hidden=true;viewReady=true;offerStart();},onError(){$('character-loading').hidden=true;canvas.hidden=true;$('lesson-fallback').hidden=false;cameraControls().forEach(control=>{control.disabled=true;});if(startButton)startButton.disabled=true;if(startOverlay)startOverlay.hidden=true;}});   // (clean-main port of the Play change to animation-unavailable.js: never offer "Play lesson" for an animation that can't play)
/* ── camera: focus buttons, camera buttons and keys; announced once it settles ── */
function cameraControls(){return document.querySelectorAll('[data-lesson-focus],[data-camera]');}
let cameraNote=null;
function cameraChanged(state,reason){
 document.querySelectorAll('[data-lesson-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lessonFocus===state.focus)));
 if(reason==='drag')return;
 clearTimeout(cameraNote);cameraNote=setTimeout(()=>{const el=$('camera-status');if(el&&view?.camera)el.textContent=view.camera.rig.label();},350);
}
function cameraAction(action){const cam=view?.camera;if(!cam||!applyCameraAction(cam.rig,action))return false;cam.changed('action');return true;}
let studyScroll=0;
function setStudy(on){if(on)studyScroll=scrollY;document.body.classList.toggle('lesson-study',on);$('study-view').setAttribute('aria-pressed',String(on));$('study-view').textContent=on?'Exit study view':'Study view';if(!on)window.scrollTo({top:studyScroll,behavior:'instant'});requestFrame();}
/* ── status line: deep-link problems and copy results ── */
let status = { kind: null, pose: null };
function setStatus(text, kind = null, pose = null) {
  $('player-status').textContent = text;
  status = { kind: text ? kind : null, pose };
  if (kind !== 'copy-failed') $('copy-fallback').hidden = true;
}
const MANUAL_CAUSES = new Set(['next', 'prev', 'first', 'last', 'select', 'play', 'advance', 'seek', 'frame']);

/* ── one render function for every state change ── */
let previousIndex=-1,previousPlaying=null;
function render({index,playing,cause,time}) {
  if(playing||INSPECT_CAUSES.has(cause)||(cause==='link'&&index>0))dismissStart();
  if(cause==='play'||cause==='move-replay')lastNow=0;   // a (re)started replay never uses an old frame's delta
  if(['select','next','prev','first','last','link'].includes(cause))replaySelection=true;
  else if(['play','seek','frame','move-replay','move-ended'].includes(cause))replaySelection=false;
  replayStatus(cause,index);
  voice.update({time,playing,rate:player.rate});effects.update({time,playing,rate:player.rate});
  const pose=POSES[index],label=officialLabel(pose),turn=narration?.cues[index]?.turn||turnFact(MOTION.referencePlans?.[index]),changed=index!==previousIndex;
  canvas.setAttribute('aria-label',poseDescription(pose,index,POSES.length));
  canvas.dataset.playing=String(playing);
  $('lesson-progress').value=String(time);
  $('lesson-progress').setAttribute('aria-valuetext',`${time.toFixed(2)} of ${DURATION.toFixed(2)} seconds, pose ${index+1}: ${pose.name}`);
  $('lesson-clock').textContent=`${time.toFixed(2)} / ${DURATION.toFixed(2)} s`;
  if (changed || previousPlaying!==playing || (cause!=='tick'&&cause!=='rate')) {
    const link=$('pose-link');link.href=poseUrl(window.location.origin,index,lessonPath);link.textContent=`Link to pose ${index+1}`;
    if(status.kind==='problem'&&MANUAL_CAUSES.has(cause))setStatus('');
    if((status.kind==='copy'||status.kind==='copy-failed')&&status.pose!==index)setStatus('');
    $('move-counter').textContent=`Pose ${index+1} of ${POSES.length}${label?` · ${label}`:''}${turn?` · ${turn.side==='left'?'↶':'↷'} Turn ${turn.side} ${turn.degrees}°`:''}`;
    $('move-name').textContent=pose.name+(pose.kihap?' — kihap':'');
    $('move-korean').textContent=pose.korean;$('move-desc').textContent=pose.desc;
    $('voice-instruction').textContent=narration?.cues[index]?.text||'';
    document.querySelectorAll('.move-row').forEach((row,i)=>{if(i===index)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');});
    const list=$('move-list'),active=list.children[index];
    if(active){const top=active.offsetTop;if(top<list.scrollTop||top+active.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=top-list.clientHeight/2+active.offsetHeight/2;}
    const play=$('btn-play');play.setAttribute('aria-label',playing?'Pause':player.atEnd?'Replay from the start':'Play');
    play.setAttribute('aria-pressed',String(playing));play.firstElementChild.textContent=playing?'⏸':'▶';$('play-label').textContent=playing?'Pause':'Play';
    const focused=document.activeElement;
    $('btn-prev').disabled=$('btn-first').disabled=index===0;
    $('btn-next').disabled=$('btn-last').disabled=index===POSES.length-1;
    if(focused instanceof HTMLButtonElement&&focused.disabled)play.focus({preventScroll:true});
    $('move-info').setAttribute('aria-live',playing?'off':'polite');
  }
  previousIndex=index;previousPlaying=playing;requestFrame();
}

function buildList() {
  replaceChildren($('move-list'), ...POSES.map((pose, i) => {
    const label = officialLabel(pose);
    return h('li', {},
      h('button', { type: 'button', class: 'move-row', on: { click: () => player.select(i) } },
        h('span', { class: 'move-num', 'aria-hidden': 'true' }, pose.official ? pose.official.join('–') : (i === 0 ? 'R' : 'E')),
        h('span', { class: 'move-row-body' },
          h('span', { class: 'move-row-name' }, pose.name, pose.kihap ? h('span', { class: 'kihap-badge' }, '기합 kihap') : null,
            h('span', { class: 'sr-only' }, label ? `, ${label}` : '')),
          h('span', { class: 'move-row-kr', lang: 'ko' }, pose.korean)),
        h('span', { class: 'move-row-dir', 'aria-hidden': 'true' }, pose.dir)));
  }));
}

const poseHistory = createPoseHistory({
  win: window,
  path: lessonPath,
  player,
  count: POSES.length,
  onProblem: (problem) => {
    if (problem) setStatus(poseLinkProblemText(problem, POSES.length), 'problem');
    else if (status.kind === 'problem') setStatus('');
  },
});
const lifecycle = createLifecyclePause({ doc: document, win: window, player, onHide: settleCanvas });
/* Replay move: the current move once, on the same clock as voice and effects, then pause on its pose. */
function replayMove(){player.playMove(player.index,replayWindow(MOTION,player.index,{cues:narration?.cues||[],effects:narration?.effects||[]}));}
function replayStatus(cause,index){
  const el=$('replay-status');if(!el)return;
  if(cause==='move-replay')el.textContent=`Replaying pose ${index+1}: ${POSES[index].name}.`;
  else if(cause==='move-ended')el.textContent=`Paused on pose ${index+1}: ${POSES[index].name}.`;
  else if(MANUAL_CAUSES.has(cause))el.textContent='';
}
function togglePlayback(){if(!player.playing&&replaySelection&&indexForReplay())player.seek(MOTION.CHAPTERS[player.index].start,'replay-move');player.toggle();}
const keyboardPlayer={prev:()=>player.prev(),next:()=>player.next(),first:()=>player.first(),last:()=>player.last(),toggle:togglePlayback,replay:replayMove};

function onRegionKey(e) {
  const camera=cameraKeyAction(e);
  if(camera&&cameraAction(camera)){e.preventDefault();return;}
  const native=['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||e.target?.isContentEditable;
  if(!native&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing&&['ArrowLeft','ArrowRight'].includes(e.key)){
    e.preventDefault();if(e.shiftKey)player[e.key==='ArrowLeft'?'prev':'next']();else player.step(e.key==='ArrowLeft'?-1:1);return;
  }
  handlePlayerKey(e,e.currentTarget,keyboardPlayer);
}

function onPoseLinkClick(e) {
  // Let modified clicks (new tab/window, download) behave natively.
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const index = player.index;
  poseHistory.push(index);
  setStatus(`This page’s address now links to pose ${index + 1}.`, 'copy', index);
}

let copying = false;
async function onCopyClick() {
  if (copying) return;
  copying = true;
  const index = player.index;
  const url = poseUrl(window.location.origin, index, lessonPath);
  try {
    const result = await copyText(url, { clipboard: navigator.clipboard });
    if (player.index !== index) return; // pose changed while copying; nothing to report
    setStatus(copyStatusText(result, index + 1), result.ok ? 'copy' : 'copy-failed', index);
    if (!result.ok) {
      const field = $('pose-url');
      field.value = url;
      $('copy-fallback').hidden = false;
      field.focus();
      field.select();
    }
  } finally {
    copying = false;
  }
}

function init() {
  buildList();

  $('lesson-progress').max = String(DURATION);
  player.subscribe(render);
  $('btn-play').addEventListener('click',togglePlayback);
  startButton?.addEventListener('click',()=>{if(!player.playing)togglePlayback();});   // only ever starts playback
  $('btn-replay-move')?.addEventListener('click',replayMove);
  $('btn-next').addEventListener('click', () => player.next());
  $('btn-prev').addEventListener('click', () => player.prev());
  $('btn-first').addEventListener('click', () => player.first());
  $('btn-last').addEventListener('click', () => player.last());
  $('lesson-progress').addEventListener('input', (e) => player.seek(Number(e.target.value)));
  $('speed').addEventListener('change', (e) => player.setRate(Number(e.target.value)));
  $('player-region').addEventListener('keydown', onRegionKey);
  $('frame-prev').addEventListener('click',()=>player.step(-1));
  $('frame-next').addEventListener('click',()=>player.step(1));
  document.querySelectorAll('[data-lesson-focus]').forEach(button=>button.addEventListener('click',()=>cameraAction({type:'focus',focus:button.dataset.lessonFocus})));
  document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>cameraAction(BUTTON_ACTIONS[button.dataset.camera])));
  $('study-view').addEventListener('click',()=>setStudy(!document.body.classList.contains('lesson-study')));
  effectsButton.addEventListener('click',()=>{const on=!effects.enabled;effects.setEnabled(on);effectsButton.textContent=on?'Effects on':'Effects off';effectsButton.setAttribute('aria-pressed',String(on));effects.update({time:player.time,playing:player.playing,rate:player.rate});requestFrame();});
  voiceButton.addEventListener('click',()=>{voiceOn=!voice.enabled;voice.setEnabled(voiceOn);voiceButton.textContent=voiceOn?'Voice on':'Voice off';voiceButton.setAttribute('aria-pressed',String(voiceOn));voice.update({time:player.time,playing:player.playing,rate:player.rate});requestFrame();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('lesson-study')){setStudy(false);$('study-view').focus();}});
  $('pose-link').addEventListener('click', onPoseLinkClick);
  $('btn-copy-link').addEventListener('click', onCopyClick);
  render({ index:0,from:0,playing:false,cause:'init',time:0 });
  poseHistory.start(); // applies ?pose=N (paused) and listens for back/forward
  mountLessonLearning({id:LESSON.id,title:LESSON.title||document.querySelector('h1').textContent,count:POSES.length,player});
  mountLessonHelp({id:LESSON.id,title:lessonTitle(),count:POSES.length,player,poseName:i=>POSES[i]?.name||''});
  lifecycle.start();
  viewReady||=!!view?.ready;offerStart();   // (also covers a character that was ready before the page finished wiring up)
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',e=>{if(e.matches)player.pause();});
}

init();

function lessonTitle(){return LESSON.title||document.querySelector('h1')?.firstChild?.textContent?.trim()||'this lesson';}
function indexForReplay(){return !!narration&&(voice.enabled||effects.enabled)&&player.index>0&&!player.atEnd;}
}
