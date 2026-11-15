/* forum.html — preview of the planned forum with example topics only. */
import { loadInto, showEmpty } from '../lib/data.js';
import { normalize } from '../lib/catalog.js';
import { h, replaceChildren } from '../lib/dom.js';
import { validateForum } from '../lib/validators.js';

const $ = (id) => document.getElementById(id);
let data = null;
let active = new URLSearchParams(location.search).get('category') || 'all';
let query = '';


function render() {
  const known = data.categories.some((c) => c.id === active);
  if (!known) active = 'all';
  const q = normalize(query);
  const visible = data.categories.filter((c) => active === 'all' || c.id === active);
  const total = data.categories.reduce((n, c) => n + c.examples.length, 0);

  const focusKey = document.activeElement?.dataset?.fk;
  replaceChildren($('category-nav'),
    h('button', { type: 'button', class: 'category-btn', 'aria-pressed': String(active === 'all'), 'data-fk': 'all', on: { click: () => select('all') } },
      h('span', { 'aria-hidden': 'true' }, '🏠'), 'All categories', h('span', { class: 'count' }, String(total))),
    ...data.categories.map((c) => h('button', {
      type: 'button', class: 'category-btn', 'aria-pressed': String(active === c.id), 'data-fk': c.id, on: { click: () => select(c.id) },
    }, h('span', { 'aria-hidden': 'true' }, c.icon || ''), c.title, h('span', { class: 'count' }, String(c.examples.length)))));
  if (focusKey) document.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`)?.focus();

  let shown = 0;
  const blocks = visible.map((c) => {
    const items = c.examples.filter((t) => !q || normalize(t).includes(q));
    shown += items.length;
    if (q && !items.length) return null;
    return h('section', { class: 'topic-block', 'aria-label': c.title },
      h('div', { class: 'topic-head' }, h('span', { 'aria-hidden': 'true' }, c.icon || ''),
        h('div', {}, h('h3', {}, c.title), h('p', {}, c.description))),
      items.length
        ? h('ul', { class: 'topic-list' }, ...items.map((t) => h('li', {}, h('span', { class: 'sample-label' }, 'Example'), h('span', {}, t))))
        : h('p', { class: 'topic-empty topic-list' }, 'No example topics in this category yet.'));
  }).filter(Boolean);

  $('forum-summary').textContent = q
    ? `${shown} example topic${shown === 1 ? '' : 's'} match “${query.trim()}”.`
    : `${shown} example topic${shown === 1 ? '' : 's'}${active === 'all' ? '' : ' in this category'}.`;
  if (!blocks.length) showEmpty($('forum-content'), 'No example topics match your search.');
  else replaceChildren($('forum-content'), ...blocks);
}

function select(id) {
  active = id;
  const url = new URL(location.href);
  if (id === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', id);
  history.replaceState(null, '', url);
  render();
}

$('forum-q').addEventListener('input', (e) => { query = e.target.value; if (data) render(); });
$('forum-search').addEventListener('submit', (e) => e.preventDefault());
loadInto($('forum-content'), '/data/forum.json', {
  title: 'The forum preview could not be loaded.',
  validate: validateForum,
  onData: (d) => { data = d; render(); },
});
