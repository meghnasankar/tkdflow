/* Taegeuk Il Jang lesson page. One LessonPlayer state drives the canvas,
   text, Korean label, selected row, progress slider and play button. */
import { POSES, LESSON } from '../lessons/taegeuk-1-data.js';
import { LessonPlayer } from '../lib/lesson-player.js';
import { h, replaceChildren } from '../lib/dom.js';
import { prefersReducedMotion } from '../site.js';

const W = 420; const H = 460; const CX = 210;
const TRANSITION_MS = 420;
const $ = (id) => document.getElementById(id);

const canvas = $('lesson-canvas');
const ctx = canvas.getContext('2d');
const player = new LessonPlayer(POSES.length, { holdMs: Number($('speed').value), transitionMs: TRANSITION_MS });

/* ── canvas sizing: crisp on high-density screens, scales with CSS width ── */
function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ── drawing (original figure, logical 420×460 coordinates) ── */
const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
function lerpPose(a, b, t) {
  const e = ease(t);
  const out = {};
  for (const k of Object.keys(b)) out[k] = [a[k][0] + (b[k][0] - a[k][0]) * e, a[k][1] + (b[k][1] - a[k][1]) * e];
  return out;
}

function roundRect(x, y, w, hgt, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, hgt, r);
  else ctx.rect(x, y, w, hgt);
}

function draw(p, pose, index) {
  const kihap = pose.kihap;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, kihap ? '#1a0508' : '#0d1220');
  bg.addColorStop(1, kihap ? '#0a0212' : '#060910');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (kihap) {
    const glow = ctx.createRadialGradient(CX, H / 2, 20, CX, H / 2, 220);
    glow.addColorStop(0, 'rgba(200,16,46,0.28)');
    glow.addColorStop(1, 'rgba(200,16,46,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const LW = 5.5;
  const limb = (a, b, color, lw = LW) => {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(p[a][0], p[a][1]); ctx.lineTo(p[b][0], p[b][1]); ctx.stroke();
  };
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (const f of ['lf', 'rf']) { ctx.beginPath(); ctx.ellipse(p[f][0], p[f][1] + 4, 11, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  limb('lhi', 'lk', '#4a7fc1', LW + 0.5); limb('lk', 'lf', '#4a7fc1');
  limb('rhi', 'rk', '#2a4f91', LW + 0.5); limb('rk', 'rf', '#2a4f91');
  limb('lhi', 'rhi', '#5a8ad0', LW - 1); limb('neck', 'lhi', '#5a8ad0', LW + 1);
  limb('neck', 'rhi', '#5a8ad0', LW + 1); limb('ls', 'rs', '#6a9adf', LW - 1);
  const beltY = p.neck[1] * 0.3 + p.lhi[1] * 0.7;
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(p.lhi[0] + 6, beltY); ctx.lineTo(p.rhi[0] - 6, beltY); ctx.stroke();
  ctx.globalAlpha = 1;
  limb('ls', 'le', '#6aaae0'); limb('le', 'lh', '#6aaae0', LW - 0.5);
  limb('rs', 're', '#3a7ab0'); limb('re', 'rh', '#3a7ab0', LW - 0.5);
  for (const [k, col] of [['lh', '#7abbf0'], ['rh', '#4a8bc0']]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[k][0], p[k][1], 6.5, 0, Math.PI * 2); ctx.fill();
  }
  const [hx, hy] = p.head;
  const head = ctx.createRadialGradient(hx - 4, hy - 5, 3, hx, hy, 18);
  head.addColorStop(0, '#f5c89a'); head.addColorStop(1, '#d4956a');
  ctx.fillStyle = head; ctx.beginPath(); ctx.arc(hx, hy, 17, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(10, 10, 92, 30, 8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(`Pose ${index + 1}/${POSES.length}`, 18, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(W - 42, 10, 32, 30, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(pose.dir, W - 26, 31);
  if (kihap) {
    ctx.font = 'bold 26px system-ui'; ctx.fillStyle = 'rgba(255,110,110,0.95)';
    ctx.fillText('기합! KIHAP!', CX, 74);
  }
  ctx.textAlign = 'left';
}

let raf = null;
function animate(fromIndex, toIndex) {
  cancelAnimationFrame(raf);
  const to = POSES[toIndex];
  if (fromIndex === toIndex || prefersReducedMotion()) { draw(to.p, to, toIndex); return; }
  const from = POSES[fromIndex].p;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / TRANSITION_MS, 1);
    draw(lerpPose(from, to.p, t), to, toIndex);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

/* ── one render function for every state change ── */
function officialLabel(pose) {
  if (!pose.official) return null;
  const nums = pose.official;
  const base = nums.length > 1 ? `Movements ${nums[0]}–${nums.at(-1)}` : `Movement ${nums[0]}`;
  return pose.subpose ? `${base} (${pose.subpose})` : base;
}

function render({ index, from, playing }) {
  const pose = POSES[index];
  const label = officialLabel(pose);
  $('move-counter').textContent = `Pose ${index + 1} of ${POSES.length}${label ? ` · ${label} (draft numbering)` : ''}`;
  $('move-name').textContent = pose.name + (pose.kihap ? ' — kihap' : '');
  $('move-korean').textContent = pose.korean;
  $('move-desc').textContent = pose.desc;
  const range = $('lesson-progress');
  range.value = String(index);
  range.setAttribute('aria-valuetext', `Pose ${index + 1} of ${POSES.length}: ${pose.name}`);
  document.querySelectorAll('.move-row').forEach((row, i) => {
    if (i === index) row.setAttribute('aria-current', 'step');
    else row.removeAttribute('aria-current');
  });
  const list = $('move-list');
  const active = list.children[index];
  if (active) {
    const top = active.offsetTop; // .move-list is the offsetParent (position: relative)
    if (top < list.scrollTop || top + active.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - list.clientHeight / 2 + active.offsetHeight / 2;
    }
  }
  const play = $('btn-play');
  play.setAttribute('aria-label', playing ? 'Pause' : (index === POSES.length - 1 ? 'Replay from the start' : 'Play'));
  play.firstElementChild.textContent = playing ? '⏸' : '▶';
  $('btn-prev').disabled = index === 0;
  $('btn-first').disabled = index === 0;
  $('btn-next').disabled = index === POSES.length - 1;
  $('btn-last').disabled = index === POSES.length - 1;
  // Avoid announcing every pose during autoplay; announce manual changes.
  $('move-info').setAttribute('aria-live', playing ? 'off' : 'polite');
  animate(from ?? index, index);
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

function init() {
  setupCanvas();
  buildList();
  replaceChildren($('review-questions'), ...LESSON.review.openQuestions.map((q) => h('li', {}, q)));
  $('lesson-progress').max = String(POSES.length - 1);
  player.subscribe(render);
  $('btn-play').addEventListener('click', () => player.toggle());
  $('btn-next').addEventListener('click', () => player.next());
  $('btn-prev').addEventListener('click', () => player.prev());
  $('btn-first').addEventListener('click', () => player.first());
  $('btn-last').addEventListener('click', () => player.last());
  $('lesson-progress').addEventListener('input', (e) => player.select(Number(e.target.value)));
  $('speed').addEventListener('change', (e) => player.setHold(Number(e.target.value)));
  window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', () => { setupCanvas(); render({ index: player.index, playing: player.playing }); });
  render({ index: 0, from: 0, playing: false });
}

init();
