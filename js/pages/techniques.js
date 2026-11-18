/* Find a technique: progressive enhancement of the static, generated index.
   Without this script every technique group and pose link is still on the
   page. With it, visitors can search and filter, and the URL keeps
   ?q=&style=&form=&cues= so a view can be shared and Back/Forward restores it.
   No storage or account access. The only request is the optional, same-origin
   data/technique-cues.json, fetched once (bounded and shape-checked) when the
   visitor asks to also search spoken instructions; until it is in, results and
   the summary say they are named techniques only. */
import { createFinderController, selectView, summaryText, shouldReplaceInput, cuesProblem, prepareCues, DEFAULT_FINDER, CUES_URL, CUES_MAX_LENGTH } from '../lib/technique-finder.js';
import { h } from '../lib/dom.js';
import { loadJSON } from '../lib/data.js';
import { setHidden } from '../lib/focus-keep.js';

const $ = (id) => document.getElementById(id);
const controls = $('tf-controls'), input = $('tf-q'), styleSelect = $('tf-style'), formSelect = $('tf-form');
const container = $('tf-groups'), summary = $('tf-summary'), empty = $('tf-empty');
const cuesBox = $('tf-cues'), cuesStatus = $('tf-cues-status'), cuesMessage = $('tf-cues-message'), cuesRetry = $('tf-cues-retry');

/* Read the static index once into a model plus element references. */
const formOptions = [...formSelect.options].filter((o) => o.value).map((o) => ({
  id: o.value, name: o.textContent, style: o.dataset.style, terms: (o.dataset.terms || '').split('|').filter(Boolean),
}));
const groupEls = new Map(), formEls = new Map(), rowEls = new Map();
const model = { forms: formOptions, groups: [] };
for (const details of container.querySelectorAll('details.tf-group')) {
  const key = details.querySelector('.tf-name').textContent.toLowerCase();
  const countEl = details.querySelector('.tf-count');
  groupEls.set(key, { details, countEl, original: countEl.textContent });
  const group = { key, forms: [] };
  for (const block of details.querySelectorAll('.tf-form')) {
    const id = block.dataset.form, rows = [];
    const items = [];
    for (const li of block.querySelectorAll('li')) {
      const a = li.querySelector('a');
      const n = Number(new URL(a.getAttribute('href'), location.origin).searchParams.get('pose'));
      rows.push({ n, name: a.textContent.replace(/^Pose \d+ · /, ''), korean: li.querySelector('.tf-ko')?.textContent || '' });
      rowEls.set(`${key}|${id}|${n}`, li);
      items.push({ li, n, cueEl: null });
    }
    formEls.set(`${key}|${id}`, { block, items, button: null });
    group.forms.push({ id, rows });
  }
  model.groups.push(group);
}
const totals = { poses: new Set([...rowEls.keys()].map((k) => k.split('|').slice(1).join(':'))).size, forms: formOptions.length, groups: model.groups.length };
const staticOrder = [...groupEls.values()].map((g) => g.details);

let state = { ...DEFAULT_FINDER }, previous = null;
let expanded = new Set(), openedByFilter = new Set();
/* Spoken instructions: one request at a time, cached once loaded. A reply
   only updates the cache; what is shown always follows the CURRENT state, so
   a reply that lands after Back, unticking or a new filter cannot bring cues
   back into a view that no longer asks for them. */
let cueStatus = 'idle', cueIndex = null;

function loadCues() {
  if (cueStatus === 'loading' || cueStatus === 'ready') return;
  cueStatus = 'loading';
  showCueStatus();
  loadJSON(CUES_URL, { validate: cuesProblem, timeoutMs: 8000, maxLength: CUES_MAX_LENGTH })
    .then((data) => { cueIndex = prepareCues(data); cueStatus = 'ready'; })
    .catch(() => { cueStatus = 'error'; })
    .then(() => apply());
}

function showCueStatus() {
  const on = state.cues && cueStatus !== 'ready' && cueStatus !== 'idle';
  cuesMessage.textContent = cueStatus === 'error'
    ? 'Spoken instructions could not load, so results show named techniques only.'
    : 'Loading spoken instructions… Results show named techniques only for now.';
  // A focused “Try again” that just started a new attempt hands focus to this
  // message; if the whole message goes (Back, unticked), focus goes to the box.
  setHidden(cuesRetry, !(on && cueStatus === 'error'), on ? cuesStatus : cuesBox);
  setHidden(cuesStatus, !on, cuesBox);
}

/** The exact instruction under a pose found only through it, as text nodes. */
function showCue(item, text) {
  if (!text) { if (item.cueEl) item.cueEl.hidden = true; return; }
  if (!item.cueEl) {
    item.cueEl = h('span', { class: 'tf-cue' }, h('span', { class: 'tf-cue-label' }, 'Spoken instruction:'), ' ', h('span', { class: 'tf-cue-text' }));
    item.li.append(item.cueEl);
  }
  item.cueEl.lastChild.textContent = text;
  item.cueEl.hidden = false;
}

function fillForms() {
  const keep = formOptions.some((f) => f.id === state.form && (!state.style || f.style === state.style)) ? state.form : '';
  formSelect.replaceChildren(h('option', { value: '' }, 'All forms'),
    ...formOptions.filter((f) => !state.style || f.style === state.style)
      .map((f) => h('option', { value: f.id, selected: f.id === keep }, f.name)));
  formSelect.value = keep;
}

function syncControls() {
  if (shouldReplaceInput(input.value, state.q)) input.value = state.q;
  styleSelect.value = state.style;
  cuesBox.checked = state.cues;
  fillForms();
}

function apply() {
  // Groups are reordered by moving their elements; keep keyboard focus on the
  // same result link if a move (not a hide) would otherwise drop it.
  const active = document.activeElement;
  const hadFocus = active && active !== document.body && container.contains(active);
  const view = selectView(model, state, { expanded, cues: cueIndex });
  const shown = new Set(view.groups.map((g) => g.key));
  // Order: exact group-name match first, otherwise the static alphabetical order.
  const order = view.filtered ? [...view.groups.map((g) => groupEls.get(g.key).details), ...staticOrder.filter((d) => !shown.has(d.querySelector('.tf-name').textContent.toLowerCase()))] : staticOrder;
  if (order.some((d, i) => container.children[i] !== d)) container.append(...order);
  for (const [key, { details, countEl, original }] of groupEls) {
    const g = view.groups.find((x) => x.key === key);
    details.hidden = !g;
    if (!g) continue;
    countEl.textContent = view.filtered ? `${g.poses} matching pose${g.poses === 1 ? '' : 's'} · ${g.forms.length} form${g.forms.length === 1 ? '' : 's'}` : original;
    if (view.filtered) {
      if (g.open && !details.open) { details.open = true; openedByFilter.add(key); }
    } else if (openedByFilter.has(key)) { details.open = false; }
    const visibleForms = new Map(g.forms.map((f) => [f.id, f]));
    for (const block of details.querySelectorAll('.tf-form')) {
      const f = visibleForms.get(block.dataset.form), ref = formEls.get(`${key}|${block.dataset.form}`);
      block.hidden = !f;
      const shownRows = new Map(f ? f.shown.map((r) => [r.n, r]) : []);
      for (const item of ref.items) {
        const row = shownRows.get(item.n);
        item.li.hidden = !row;
        showCue(item, row?.cue);
      }
      if (f && f.hidden) {
        const name = formOptions.find((x) => x.id === f.id)?.name || f.id;
        const label = `Show all ${f.rows.length} poses in ${name}`;
        if (!ref.button) {
          ref.button = h('button', { type: 'button', class: 'link-btn tf-show-all', on: { click: () => {
            expanded.add(`${key}|${f.id}`);
            const firstHidden = ref.items.find(({ li }) => li.hidden)?.li;
            apply();
            firstHidden?.querySelector('a')?.focus();
          } } });
          block.append(ref.button);
        }
        ref.button.textContent = label;
        ref.button.hidden = false;
      } else if (ref.button) ref.button.hidden = true;
    }
  }
  if (!view.filtered) openedByFilter = new Set();
  empty.hidden = !(view.filtered && !view.groups.length);
  $('tf-library').href = `/forms.html${state.q.trim() ? `?q=${encodeURIComponent(state.q.trim())}` : ''}`;
  summary.textContent = summaryText(view, state, totals, cueStatus);
  showCueStatus();
  if (hadFocus && document.activeElement !== active && active.isConnected && !active.closest('[hidden]')) active.focus({ preventScroll: true });
}

const controller = createFinderController({
  win: window,
  forms: formOptions,
  onChange: (next) => {
    if (!previous || next.q !== previous.q || next.style !== previous.style || next.form !== previous.form || next.cues !== previous.cues) expanded = new Set();
    previous = state = next;
    syncControls();
    if (state.cues) loadCues();
    apply();
  },
});

input.addEventListener('input', () => controller.type(input.value));
controls.addEventListener('submit', (e) => { e.preventDefault(); controller.choose({ q: input.value }); });
styleSelect.addEventListener('change', () => controller.choose({ style: styleSelect.value }));
formSelect.addEventListener('change', () => controller.choose({ form: formSelect.value }));
cuesBox.addEventListener('change', () => controller.choose({ cues: cuesBox.checked }));
// Re-render at once so the live summary says "loading" with the status line,
// not the earlier failure, for the whole retry.
cuesRetry.addEventListener('click', () => { if (state.cues && cueStatus === 'error') { cueStatus = 'idle'; loadCues(); apply(); } });
// Clear resets the search and filters; ticking spoken instructions is a search
// option, not a filter, so it is kept.
const clear = () => { controller.choose({ ...DEFAULT_FINDER, cues: state.cues }); input.focus(); };
$('tf-clear').addEventListener('click', clear);
$('tf-empty-clear').addEventListener('click', clear);

controls.hidden = false;
controller.start();
