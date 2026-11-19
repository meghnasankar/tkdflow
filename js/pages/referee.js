/* Referee practice page: scenario list, 3D replay controls, evidence, a text alternative of each exchange, and
   feedback from the rules engine (js/referee/rules.js) naming who decides and the article that says so. */
import {SCENARIOS, scenarioById} from '../referee/scenarios.js';
import {PROFILES, decide} from '../referee/rules.js';
import {createArena} from '../referee/arena.js';

const $ = id => document.getElementById(id);
const STORE = 'tkdflow.refereePractice.v1';
const NAMES = {blue: 'Chung (blue)', red: 'Hong (red)'};
const BY = {PSS: 'the PSS (electronic scoring sensors)', judges: 'the judges', 'PSS + judges': 'the PSS and the judges together', referee: 'the centre referee'};

function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* per-browser convenience only */ } }
export const clockText = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.round(Math.max(0, s)) % 60).padStart(2, '0')}`;
export const outcomeText = o => o.blue || o.red ? [o.blue ? `${NAMES.blue} +${o.blue}` : '', o.red ? `${NAMES.red} +${o.red}` : ''].filter(Boolean).join(', ') : 'no points';

let arena = null, current = null, answers = load();
function el(tag, attrs = {}, text) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; }

function renderList() {
  const ol = $('rf-scenarios'); ol.replaceChildren();
  for (const s of SCENARIOS) {
    const li = el('li'), b = el('button', {type: 'button', class: 'rf-item', 'data-id': s.id});
    if (current?.id === s.id) b.setAttribute('aria-current', 'true');
    const mark = answers[s.id] === true ? '✓' : answers[s.id] === false ? '✗' : '';
    b.append(el('span', {class: 'rf-item-profile'}, PROFILES[s.profile].short), el('span', {class: 'rf-item-title'}, s.title), el('span', {class: 'rf-item-mark', 'aria-label': mark === '✓' ? 'answered correctly' : mark ? 'answered, not correct' : ''}, mark));
    b.addEventListener('click', () => select(s.id, true)); li.append(b); ol.append(li);
  }
  const done = Object.keys(answers).length, right = Object.values(answers).filter(Boolean).length;
  $('rf-progress').textContent = done ? `${right} of ${done} answered correctly` : `${SCENARIOS.length} to try`;
}

function select(id, focus = false) {
  current = scenarioById(id) || SCENARIOS[0];
  const url = new URL(location.href); url.searchParams.set('scenario', current.id); history.replaceState(null, '', url);
  $('rf-profile').textContent = PROFILES[current.profile].name;
  $('rf-title').textContent = current.title;
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

function answer(i) {
  const s = current, d = decide(s.profile, s.facts), picked = s.options[i], right = picked.outcome.blue === d.blue && picked.outcome.red === d.red;
  answers[s.id] = right; save(answers);
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

function init() {
  renderList();
  try {
    arena = createArena($('rf-canvas'), {
      onReady() { $('rf-status').textContent = ''; },   // the arena redraws itself; a scrub made while loading is kept
      onError() { $('rf-status').textContent = 'The 3D fighters could not load. The description below has everything needed to answer.'; },
      onFrame({time, playing}) { updateTime(time); $('rf-play').textContent = playing ? 'Pause' : 'Play'; }
    });
    $('rf-status').textContent = 'Loading the fighters…';
  } catch {
    $('rf-status').textContent = 'This browser can’t show the 3D arena. The description below has everything needed to answer.';
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
  $('rf-next').addEventListener('click', () => { const i = SCENARIOS.indexOf(current); select(SCENARIOS[(i + 1) % SCENARIOS.length].id, true); });
}
if (typeof document !== 'undefined' && document.getElementById('rf-canvas')) init();
