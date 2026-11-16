import {LessonTimeline} from '../animation/lesson-timeline.js';
import {createLessonView} from '../animation/lesson-view.js';
import {officialLabel,poseDescription,poseUrl,poseLinkProblemText,handlePlayerKey,createPoseHistory,createLifecyclePause,copyText,copyStatusText} from '../lib/lesson-nav.js';
import {h,replaceChildren} from '../lib/dom.js';
export function mountLesson({POSES,LESSON,MOTION}){
const {DURATION}=MOTION,lessonPath=`/${LESSON.id}.html`;
const $=id=>document.getElementById(id),canvas=$('lesson-canvas'),player=new LessonTimeline(MOTION);
let raf=null,lastNow=0,view=null;
function requestFrame(){if(raf===null)raf=requestAnimationFrame(tick);}
function tick(now){raf=null;const dt=lastNow?Math.min(.1,(now-lastNow)/1000):0;lastNow=now;if(player.playing)player.advance(dt);view?.draw(player.time);if(player.playing)requestFrame();else lastNow=0;}
function settleCanvas(){view?.draw(player.time);}
view=createLessonView(canvas,{motion:MOTION,requestFrame,onReady(){$('character-loading').hidden=true;},onError(){$('character-loading').hidden=true;canvas.hidden=true;$('lesson-fallback').hidden=false;}});
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
  if(cause==='play')lastNow=0;
  const pose=POSES[index],label=officialLabel(pose),changed=index!==previousIndex;
  canvas.setAttribute('aria-label',poseDescription(pose,index,POSES.length));
  canvas.dataset.playing=String(playing);
  $('lesson-progress').value=String(time);
  $('lesson-progress').setAttribute('aria-valuetext',`${time.toFixed(2)} of ${DURATION.toFixed(2)} seconds, pose ${index+1}: ${pose.name}`);
  $('lesson-clock').textContent=`${time.toFixed(2)} / ${DURATION.toFixed(2)} s`;
  if (changed || previousPlaying!==playing || (cause!=='tick'&&cause!=='rate')) {
    const link=$('pose-link');link.href=poseUrl(window.location.origin,index,lessonPath);link.textContent=`Link to pose ${index+1}`;
    if(status.kind==='problem'&&MANUAL_CAUSES.has(cause))setStatus('');
    if((status.kind==='copy'||status.kind==='copy-failed')&&status.pose!==index)setStatus('');
    $('move-counter').textContent=`Pose ${index+1} of ${POSES.length}${label?` · ${label} (draft numbering)`:''}`;
    $('move-name').textContent=pose.name+(pose.kihap?' — kihap':'');
    $('move-korean').textContent=pose.korean;$('move-desc').textContent=pose.desc;
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

function onRegionKey(e) {
  const native=['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||e.target?.isContentEditable;
  if(!native&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing&&['ArrowLeft','ArrowRight'].includes(e.key)){
    e.preventDefault();if(e.shiftKey)player[e.key==='ArrowLeft'?'prev':'next']();else player.step(e.key==='ArrowLeft'?-1:1);return;
  }
  handlePlayerKey(e,e.currentTarget,player);
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
  replaceChildren($('review-questions'), ...LESSON.review.openQuestions.map((q) => h('li', {}, q)));
  $('lesson-progress').max = String(DURATION);
  player.subscribe(render);
  $('btn-play').addEventListener('click', () => player.toggle());
  $('btn-next').addEventListener('click', () => player.next());
  $('btn-prev').addEventListener('click', () => player.prev());
  $('btn-first').addEventListener('click', () => player.first());
  $('btn-last').addEventListener('click', () => player.last());
  $('lesson-progress').addEventListener('input', (e) => player.seek(Number(e.target.value)));
  $('speed').addEventListener('change', (e) => player.setRate(Number(e.target.value)));
  $('player-region').addEventListener('keydown', onRegionKey);
  $('frame-prev').addEventListener('click',()=>player.step(-1));
  $('frame-next').addEventListener('click',()=>player.step(1));
  document.querySelectorAll('[data-lesson-view]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-lesson-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));view.setView(button.dataset.lessonView);}));
  $('study-view').addEventListener('click',()=>setStudy(!document.body.classList.contains('lesson-study')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('lesson-study')){setStudy(false);$('study-view').focus();}});
  $('pose-link').addEventListener('click', onPoseLinkClick);
  $('btn-copy-link').addEventListener('click', onCopyClick);
  render({ index:0,from:0,playing:false,cause:'init',time:0 });
  poseHistory.start(); // applies ?pose=N (paused) and listens for back/forward
  lifecycle.start();
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',e=>{if(e.matches)player.pause();});
}

init();

}
