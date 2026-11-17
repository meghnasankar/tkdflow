/* forms.html controller — one state object drives search, style tabs,
   belt/difficulty/lesson filters, sorting, counts and the URL. */
import {
  ORGS, LEVELS, SORTS, applyState, facetCounts, stateFromParams, stateToParams, isDefaultState, DEFAULT_STATE,
} from '../lib/catalog.js';
import {icon} from '../lib/icons.js';
import {renderFilterChips} from '../lib/filter-chips.js';
import { validateForms } from '../lib/validators.js';
import { BELT_FAMILIES } from '../lib/belts.js';
import { loadInto, showEmpty } from '../lib/data.js';
import { h, replaceChildren, safeGradient, safeClass, BADGE_CLASSES } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
let forms = [];
let loaded = false;
let state = stateFromParams(location.search);
let searchTimer;

function setState(patch, { replaceUrl = false } = {}) {
  clearTimeout(searchTimer);
  state = { ...state, q: $('search').value, ...patch };
  const params = stateToParams(state).toString();
  const url = params ? `?${params}` : location.pathname;
  if (location.pathname + location.search !== location.pathname + (params ? `?${params}` : '')) history[replaceUrl ? 'replaceState' : 'pushState'](null, '', url);
  $('search').value = state.q;
  $('sort').value = state.sort;
  render();
}

function difficultyDots(level, label) {
  return h('div', { class: 'difficulty' },
    h('span', { class: 'sr-only' }, `Difficulty ${level} of 5: ${label}`),
    ...[1, 2, 3, 4, 5].map((i) => h('span', { class: `dot${i <= level ? ' filled' : ''}`, 'aria-hidden': 'true' })),
    h('span', { class: 'label', 'aria-hidden': 'true' }, label));
}

function card(f) {
  const tags = f.tags.map((t, i) => h('span', { class: `badge ${safeClass(f.tagStyles?.[i], BADGE_CLASSES, 'badge-navy')}` }, t.startsWith('⬛') ? icon('belt') : null, t.replace(/^⬛\s*/,'')));
  const action = f.lessonUrl
    ? h('a', { class: 'btn btn-gold btn-sm', href: f.lessonUrl }, 'Open lesson', h('span', { class: 'sr-only' }, `: ${f.name}`))
    : h('span', { class: 'badge badge-muted' }, 'Lesson not available yet');
  return h('article', { class: `form-card${f.lessonUrl ? ' has-lesson' : ''}` },
    h('div', { class: 'form-card-visual' },
      f.thumbnail
        ? h('img', { src: f.thumbnail.src, width: f.thumbnail.width, height: f.thumbnail.height,
          alt: f.thumbnail.alt, loading: 'lazy', decoding: 'async' })
        : icon('forms')),
    h('div', { class: 'form-card-body' },
      h('div', { class: 'form-tag-row' }, ...tags),
      h('h3', {}, f.name),
      h('p', { class: 'kr-name' }, h('span', { lang: 'ko' }, f.koreanName), f.meaning ? ` — ${f.meaning}` : ''),
      difficultyDots(f.difficulty, f.difficultyLabel),
      h('p', { class: 'meta-line' }, `${f.moves} movements · ${f.beltLabel}`),
      h('p', { class: 'description' }, f.description)),
    h('div', { class: 'form-card-footer' }, h('span', {}, f.organization), action));
}

function renderOrgTabs() {
  const counts = facetCounts(forms, state, 'org');
  replaceChildren($('org-tabs'), ...ORGS.map((o) => h('button', {
    type: 'button', class: 'org-tab', 'aria-pressed': String(state.org === o.id), 'data-fk': `org:${o.id}`,
    on: { click: () => setState({ org: o.id }) },
  }, o.label, ' ', h('span', { class: 'count' }, `(${counts[o.id] || 0})`))));
}

function radioGroup(container, name, options, current, counts, onChange) {
  replaceChildren(container, ...options.map((o) => {
    const n = counts[o.id] || 0;
    const input = h('input', {
      type: 'radio', name, value: o.id, checked: current === o.id, 'data-fk': `${name}:${o.id}`,
      disabled: n === 0 && current !== o.id && o.id !== 'all',
      on: { change: () => onChange(o.id) },
    });
    return h('label', {}, input,
      o.color ? h('span', { class: 'swatch', style: { background: o.color }, 'aria-hidden': 'true' }) : null,
      h('span', { class: 'text' }, o.label),
      h('span', { class: 'count' }, h('span', { class: 'sr-only' }, ', '), String(n), h('span', { class: 'sr-only' }, n === 1 ? ' form' : ' forms')));
  }));
}

function renderFilters() {
  radioGroup($('belt-options'), 'belt',
    [{ id: 'all', label: 'Any belt' }, ...BELT_FAMILIES.map((b) => ({ id: b.id, label: b.label, color: b.color }))],
    state.belt, facetCounts(forms, state, 'belt'), (belt) => setState({ belt }));
  radioGroup($('level-options'), 'level', LEVELS, state.level, facetCounts(forms, state, 'level'), (level) => setState({ level }));
  $('lesson-only').checked = state.lesson;
  const active = ['org', 'belt', 'level'].filter((k) => state[k] !== 'all').length + (state.lesson ? 1 : 0) + (state.q.trim() ? 1 : 0);
  $('filter-count').textContent = active ? `(${active} active)` : '';
  $('clear-filters').hidden = isDefaultState({ ...state, sort: DEFAULT_STATE.sort });
  const selections = [];
  if (state.q.trim()) selections.push({key:'q',label:`Search: ${state.q.trim()}`});
  if (state.org !== 'all') selections.push({key:'org',label:ORGS.find(o=>o.id===state.org).label});
  if (state.belt !== 'all') selections.push({key:'belt',label:`Belt: ${BELT_FAMILIES.find(b=>b.id===state.belt).label}`});
  if (state.level !== 'all') selections.push({key:'level',label:`Difficulty: ${LEVELS.find(l=>l.id===state.level).label}`});
  if (state.lesson) selections.push({key:'lesson',label:'Step-by-step lessons'});
  renderFilterChips($('forms-active-filters'),selections,key=>setState({[key]:DEFAULT_STATE[key]}),clearAll);
}

function renderResults() {
  const results = applyState(forms, state);
  const grid = $('forms-grid');
  if (!forms.length) {
    $('results-summary').textContent = 'Showing 0 of 0 forms.';
    showEmpty(grid, 'The forms catalogue is empty right now. Please check back later.');
    return;
  }
  $('results-summary').textContent = `Showing ${results.length} of ${forms.length} forms` +
    (state.q.trim() ? ` matching “${state.q.trim()}”` : '') + '.';
  if (!results.length) {
    showEmpty(grid, 'No forms match these filters.',
      h('button', { type: 'button', class: 'btn btn-secondary btn-sm', on: { click: clearAll } }, 'Clear search and filters'));
    return;
  }
  if (state.sort !== 'curriculum') {
    replaceChildren(grid, h('div', { class: 'forms-grid' }, ...results.map(card)));
    return;
  }
  const groups = new Map();
  for (const f of results) {
    if (!groups.has(f.series)) groups.set(f.series, []);
    groups.get(f.series).push(f);
  }
  let lastHeader = null;
  const nodes = [];
  for (const [series, list] of groups) {
    const first = list[0];
    if (first.seriesHeader !== lastHeader) {
      nodes.push(h('div', { class: 'style-header', style: { background: safeGradient(first.seriesBg, '') || null } },
        icon('belt'),
        h('div', {}, h('h3', {}, first.seriesHeader), h('p', {}, first.seriesDesc))));
      lastHeader = first.seriesHeader;
    }
    nodes.push(h('h4', { class: 'series-title' }, series), h('div', { class: 'forms-grid' }, ...list.map(card)));
  }
  replaceChildren(grid, ...nodes);
}

function render() {
  if (!loaded) return;
  // Controls are rebuilt on every change; keep keyboard focus on the same control.
  const focusKey = document.activeElement?.dataset?.fk;
  renderOrgTabs();
  renderFilters();
  renderResults();
  if (focusKey) document.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`)?.focus();
}

function clearAll() {
  $('search').value = '';
  setState({ ...DEFAULT_STATE, sort: state.sort });
  $('search').focus();
}

function setupControls() {
  replaceChildren($('sort'), ...SORTS.map((s) => h('option', { value: s.id }, s.label)));
  $('sort').value = state.sort;
  $('sort').addEventListener('change', (e) => setState({ sort: e.target.value }));
  $('search').value = state.q;
  $('search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setState({ q: e.target.value },{replaceUrl:true}), 150);
  });
  $('search-form').addEventListener('submit', (e) => { e.preventDefault(); setState({ q: $('search').value }); });
  $('lesson-only').addEventListener('change', (e) => setState({ lesson: e.target.checked }));
  $('clear-filters').addEventListener('click', clearAll);
  // Filters start collapsed on small screens so results are reachable without a long scroll.
  if (window.matchMedia('(max-width: 860px)').matches) $('filters').open = false;
  window.addEventListener('popstate',()=>{
    clearTimeout(searchTimer); state=stateFromParams(location.search);
    $('search').value=state.q; $('sort').value=state.sort; render();
  });
}

setupControls();
loadInto($('forms-grid'), '/data/forms.json', {
  title: 'The forms library could not be loaded.',
  validate: validateForms,
  onData: (data) => {
    forms = data;
    loaded = true;
    const lessons = data.filter((f) => f.lessonUrl).length;
    const styles = new Set(data.map((f) => f.category)).size;
    $('hero-summary').textContent = `${data.length} forms catalogued across ${styles} styles · ${lessons} interactive lesson${lessons === 1 ? '' : 's'} so far.`;
    render();
  },
});
