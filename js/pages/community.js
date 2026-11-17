/* community.html — preview with labelled learning resources and discussion routes. */
import { loadInto, showEmpty } from '../lib/data.js';
import { h, replaceChildren, safeHref } from '../lib/dom.js';
import { validateCommunity } from '../lib/validators.js';

const $ = (id) => document.getElementById(id);
let posts = [];
let active = 'all';


function render() {
  const categories = [...new Set(posts.map((p) => p.category))];
  const focusKey = document.activeElement?.dataset?.fk;
  replaceChildren($('community-nav'), ...['all', ...categories].map((c) => h('button', {
    type: 'button', class: 'category-btn', 'aria-pressed': String(active === c), 'data-fk': c, on: { click: () => { active = c; render(); } },
  }, c === 'all' ? 'All' : c, h('span', { class: 'count' }, String(c === 'all' ? posts.length : posts.filter((p) => p.category === c).length)))));
  if (focusKey) document.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`)?.focus();

  const shown = posts.filter((p) => active === 'all' || p.category === active);
  $('community-summary').textContent = `${shown.length} resource${shown.length === 1 ? '' : 's'}.`;
  if (!shown.length) { showEmpty($('community-feed'), 'No resources in this category.'); return; }
  replaceChildren($('community-feed'), ...shown.map((p) => h('article', { class: 'example-card' },
    h('div', { class: 'example-meta' }, h('span', { class: 'badge badge-navy' }, p.kind)),
    h('h3', {}, h('a', {href:safeHref(p.url)}, p.title)),
    h('p', {}, p.body),
    h('div', { class: 'example-meta' }, ...p.tags.map((t) => h('span', { class: 'badge badge-muted' }, t))))));
}

loadInto($('community-feed'), '/data/community.json', {
  title: 'Community resources could not be loaded.',
  validate: validateCommunity,
  onData: (d) => { posts = d.posts; render(); },
});
