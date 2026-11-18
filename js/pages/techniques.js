/* Find a technique: progressive enhancement of the static, generated index.
   Without this script every technique group and pose link is still on the
   page. With it, visitors can search and filter, and the URL keeps
   ?q=&style=&form= so a view can be shared and Back/Forward restores it.
   No network, storage or account access. */
import { createFinderController, selectView, summaryText, shouldReplaceInput, DEFAULT_FINDER } from '../lib/technique-finder.js';
import { h } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const controls = $('tf-controls'), input = $('tf-q'), styleSelect = $('tf-style'), formSelect = $('tf-form');
const container = $('tf-groups'), summary = $('tf-summary'), empty = $('tf-empty');

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
      items.push({ li, n });
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
  fillForms();
}

function apply() {
  const view = selectView(model, state, { expanded });
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
      const shownRows = new Set(f ? f.shown.map((r) => r.n) : []);
      for (const { li, n } of ref.items) li.hidden = !shownRows.has(n);
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
  summary.textContent = summaryText(view, state, totals);
}

const controller = createFinderController({
  win: window,
  forms: formOptions,
  onChange: (next) => {
    if (!previous || next.q !== previous.q || next.style !== previous.style || next.form !== previous.form) expanded = new Set();
    previous = state = next;
    syncControls();
    apply();
  },
});

input.addEventListener('input', () => controller.type(input.value));
controls.addEventListener('submit', (e) => { e.preventDefault(); controller.choose({ q: input.value }); });
styleSelect.addEventListener('change', () => controller.choose({ style: styleSelect.value }));
formSelect.addEventListener('change', () => controller.choose({ form: formSelect.value }));
const clear = () => { controller.choose({ ...DEFAULT_FINDER }); input.focus(); };
$('tf-clear').addEventListener('click', clear);
$('tf-empty-clear').addEventListener('click', clear);

controls.hidden = false;
controller.start();
