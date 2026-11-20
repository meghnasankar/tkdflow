/* Referee practice page: watch an exchange in the 3D arena and make the call beside it. A scenario bar
   (previous/next, count, focus mode), the arena with playback and camera controls, a compact panel with the
   officials' evidence, the answers, feedback from the rules engine (js/referee/rules.js) naming who decides and the
   article that says so, and a text description of each exchange. Progress stays in this browser (progress.js). */
import {SCENARIOS, scenarioById} from '../referee/scenarios.js';
import {PROFILES, decide} from '../referee/rules.js';
import {createArena} from '../referee/arena.js';
import {createProgress, progressText, savedNote} from '../referee/progress.js';

const $ = id => document.getElementById(id);
const NAMES = {blue: 'Chung (blue)', red: 'Hong (red)'};
const BY = {PSS: 'the PSS (electronic scoring sensors)', judges: 'the judges', 'PSS + judges': 'the PSS and the judges together', referee: 'the center referee'};
const IDS = SCENARIOS.map(s => s.id);

export const clockText = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.round(Math.max(0, s)) % 60).padStart(2, '0')}`;
export const outcomeText = o => o.blue || o.red ? [o.blue ? `${NAMES.blue} +${o.blue}` : '', o.red ? `${NAMES.red} +${o.red}` : ''].filter(Boolean).join(', ') : 'no points';
export const countText = (i, n) => `Scenario ${i + 1} of ${n}`;

let arena = null, current = null, progress = null, focusReturn = 0;
function el(tag, attrs = {}, text) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; }
function storage() { try { return window.localStorage; } catch { return null; } }

function renderProgress() {
  const answers = progress.answers;
  $('rf-progress').textContent = progressText(answers, SCENARIOS.length);
  $('rf-saved-note').textContent = savedNote(progress.status);
  $('rf-reset').disabled = !Object.keys(answers).length;
}

function renderList() {
  const ol = $('rf-scenarios'), answers = progress.answers; ol.replaceChildren();
  SCENARIOS.forEach((s, i) => {
    const li = el('li'), b = el('button', {type: 'button', class: 'rf-item', 'data-id': s.id});
    if (current?.id === s.id) b.setAttribute('aria-current', 'true');
    const mark = answers[s.id] === true ? '✓' : answers[s.id] === false ? '✗' : '';
    b.append(el('span', {class: 'rf-item-profile'}, `${i + 1} · ${PROFILES[s.profile].short}`), el('span', {class: 'rf-item-title'}, s.title),
      el('span', {class: 'rf-item-mark', 'aria-label': mark === '✓' ? 'answered correctly' : mark ? 'answered, not correct' : ''}, mark));
    b.addEventListener('click', () => select(s.id, true)); li.append(b); ol.append(li);
  });
  renderProgress();
}

function select(id, focus = false) {
  current = scenarioById(id) || SCENARIOS[0];
  const url = new URL(location.href); url.searchParams.set('scenario', current.id); history.replaceState(null, '', url);
  $('rf-profile').textContent = PROFILES[current.profile].name;
  $('rf-title').textContent = current.title;
  $('rf-count').textContent = countText(SCENARIOS.indexOf(current), SCENARIOS.length);
  $('rf-ev-clock').textContent = `${clockText(current.clock)} left in the round`;
  $('rf-ev-pss').textContent = current.evidence.pss; $('rf-ev-judges').textContent = current.evidence.judges;
  const steps = $('rf-steps'); steps.replaceChildren(...current.steps.map(t => el('li', {}, t)));
  const opts = $('rf-options'); opts.replaceChildren(...current.options.map((o, i) => { const b = el('button', {type: 'button', class: 'btn btn-secondary btn-sm rf-option', 'data-index': i}, o.label); b.addEventListener('click', () => answer(i)); return b; }));
  $('rf-feedback').hidden = true; $('rf-feedback').replaceChildren();
  arena?.load(current); updateTime(0);
  renderList();
  if (focus) {   // move keyboard and screen-reader focus to the new scenario and bring its heading below the sticky header
    const h = $('rf-title'), smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    h.focus({preventScroll: true}); $('rf-head').scrollIntoView({block: 'start', behavior: smooth ? 'smooth' : 'auto'});
  }
}
const step = d => { const i = SCENARIOS.indexOf(current); select(SCENARIOS[(i + d + SCENARIOS.length) % SCENARIOS.length].id, true); };

function answer(i) {
  const s = current, d = decide(s.profile, s.facts), picked = s.options[i], right = picked.outcome.blue === d.blue && picked.outcome.red === d.red;
  progress.setResult(s.id, right);
  for (const b of document.querySelectorAll('.rf-option')) { const o = s.options[b.dataset.index]; b.disabled = true; if (o.outcome.blue === d.blue && o.outcome.red === d.red) b.classList.add('is-correct'); else if (b.dataset.index == i) b.classList.add('is-wrong'); }
  const fb = $('rf-feedback'); fb.replaceChildren();
  fb.append(el('p', {class: 'rf-verdict ' + (right ? 'is-right' : 'is-wrong')}, right ? 'Correct.' : 'Not quite.'));
  fb.append(el('p', {class: 'rf-result'}, `Scoreboard: ${outcomeText(d)}.`));
  const ul = el('ul', {class: 'rf-reasons'});
  for (const a of d.awards) { const li = el('li'); li.append(el('strong', {}, `${NAMES[a.to]} +${a.points}`), document.createTextNode(` — ${a.why.replace(/^Gam-jeom to (blue|red)/, (m, c) => `Gam-jeom to ${NAMES[c]}`)}, decided by ${BY[a.by]}. `), el('span', {class: 'rf-cite'}, a.cite)); ul.append(li); }
  for (const w of d.warnings) { const li = el('li'); li.append(el('strong', {}, w.label || 'No points'), document.createTextNode(` — ${w.why} (${BY[w.by]}). `), el('span', {class: 'rf-cite'}, w.cite)); ul.append(li); }
  if (!d.awards.length && !d.warnings.length) ul.append(el('li', {}, 'Nothing here is a scoring technique or a prohibited act, so the scoreboard does not change.'));
  fb.append(ul);
  const src = PROFILES[s.profile].source, p = el('p', {class: 'rf-source'}), a = el('a', {href: src.url, rel: 'noopener'}, src.title);
  p.append(document.createTextNode('Source: '), a, document.createTextNode(` (${src.publisherNote}).`)); fb.append(p);
  fb.hidden = false; renderList();
}

function updateTime(t) {
  if (!current) return;
  $('rf-clock').textContent = clockText(current.clock + (current.tc - t));
  $('rf-time').textContent = `${t.toFixed(2)} s`;
  $('rf-scrub').value = String(Math.round(t / current.duration * 1000));
}

/* Focus mode: the practice area fills the window and the rest of the page is hidden (as the lesson Study view
   does). Escape or the toggle leaves it, restoring the scroll position and returning focus to the toggle. */
export function setFocusMode(on) {
  const b = $('rf-focus');
  if (on) focusReturn = scrollY;
  document.body.classList.toggle('rf-focus', on);
  b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Exit focus mode' : 'Focus mode';
  if (!on) window.scrollTo({top: focusReturn, behavior: 'instant'});
  else $('rf-practice').scrollTop = 0;
}

/* Reset: an inline confirmation (not a browser dialog). Focus goes to the safe choice; Escape keeps progress. */
function openConfirm() { $('rf-confirm').hidden = false; $('rf-reset').setAttribute('aria-expanded', 'true'); $('rf-confirm-no').focus(); }
function closeConfirm(message) {
  $('rf-confirm').hidden = true; $('rf-reset').setAttribute('aria-expanded', 'false');
  if (message) $('rf-announce').textContent = message;
  ($('rf-reset').disabled ? $('rf-title') : $('rf-reset')).focus({preventScroll: true});
}

function init() {
  progress = createProgress(storage(), IDS);
  renderList();
  try {
    arena = createArena($('rf-canvas'), {
      onReady() { $('rf-status').textContent = ''; },   // the arena redraws itself; a scrub made while loading is kept
      onError() { $('rf-status').textContent = 'The 3D fighters could not load. The description below has everything needed to answer.'; $('rf-steps-box').open = true; },
      onFrame({time, playing}) { updateTime(time); $('rf-play').textContent = playing ? 'Pause' : 'Play'; }
    });
    $('rf-status').textContent = 'Loading the fighters…';
  } catch {
    $('rf-status').textContent = 'This browser can’t show the 3D arena. The description below has everything needed to answer.';
    $('rf-steps-box').open = true;
  }
  const start = new URLSearchParams(location.search).get('scenario');
  select(scenarioById(start)?.id || SCENARIOS[0].id);
  $('rf-play').addEventListener('click', () => { if (!arena) return; arena.state.playing ? arena.pause() : arena.play(); });
  $('rf-replay').addEventListener('click', () => arena?.replay());
  $('rf-speed').addEventListener('change', e => arena?.setRate(Number(e.target.value)));
  arena?.setRate(Number($('rf-speed').value));
  $('rf-scrub').addEventListener('input', e => { if (!arena) return; arena.seek(Number(e.target.value) / 1000 * current.duration); });
  for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => arena?.setView(b.dataset.view));
  for (const b of document.querySelectorAll('[data-zoom]')) b.addEventListener('click', () => { const z = b.dataset.zoom; if (!arena) return; z === 'reset' ? arena.resetView() : arena.zoom(z === 'in' ? 1.25 : .8); });
  $('rf-next').addEventListener('click', () => step(1));
  $('rf-next-top').addEventListener('click', () => step(1));
  $('rf-prev').addEventListener('click', () => step(-1));
  $('rf-focus').addEventListener('click', () => setFocusMode(!document.body.classList.contains('rf-focus')));
  $('rf-reset').addEventListener('click', openConfirm);
  $('rf-confirm-no').addEventListener('click', () => closeConfirm('Progress kept.'));
  $('rf-confirm-yes').addEventListener('click', () => {
    const ok = progress.clear(); select(current.id); closeConfirm(ok ? 'Practice progress cleared from this browser.' : 'Practice progress cleared for this visit.');
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('rf-confirm').hidden) { e.preventDefault(); closeConfirm('Progress kept.'); return; }
    if (document.body.classList.contains('rf-focus')) { e.preventDefault(); setFocusMode(false); $('rf-focus').focus(); }
  });
}
if (typeof document !== 'undefined' && document.getElementById('rf-canvas')) init();
