/* Community learning resources and published member discussions. Discussion
   guides are public editorial content, so they are read statelessly for every
   visitor (public-discussions.js): this view never starts the account service. */
import { loadInto, showEmpty } from '../lib/data.js';
import { h, replaceChildren, safeHref } from '../lib/dom.js';
import {icon} from '../lib/icons.js';
import { validateCommunity } from '../lib/validators.js';
import {starterGuides,discussionUrl} from '../lib/discussions.js';
import {publicGuides} from '../lib/public-discussions.js';
import { resourceState, resourceQuery, resourceMatches, MAX_QUERY } from '../lib/community-resources.js';

const $ = (id) => document.getElementById(id);
const resourceView=new URLSearchParams(location.search).get('view')==='resources';
$('community-discussions-pane').hidden=resourceView;$('community-resources-pane').hidden=!resourceView;
for(const link of document.querySelectorAll('[data-community-view]')){if((link.dataset.communityView==='resources')===resourceView)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
let posts = [];
let state = { category: 'all', q: '' }, navBuilt = false, loaded = false;
const cardFor = (p) => h('article', { class: 'example-card' },
    h('div', { class: 'example-meta' }, icon({'Study guide':'forms','Events calendar':'calendar','Founder story':'person','Discussion guide':'community','Competition guide':'trophy','Personal organizer':'clipboard'}[p.kind] || 'forms'), h('span', { class: 'badge badge-navy' }, p.kind)),
    h('h3', {}, h('a', {href:safeHref(p.url)}, p.title)),
    h('p', {}, p.body),
    h('div', { class: 'example-meta' }, ...p.tags.map((t) => h('span', { class: 'badge badge-muted' }, t))));

/* The category buttons are built once and updated in place, so keyboard focus
   stays on them; the search field keeps its own value. State lives in the
   address: a category click adds a history entry, typing replaces it. */
function buildNav(categories) {
  replaceChildren($('community-nav'), ...['all', ...categories].map((c) => h('button', {
    type: 'button', class: 'category-btn', 'aria-pressed': 'false', 'data-category': c,
    on: { click: () => setState({ category: c }, { push: true }) },
  }, c === 'all' ? 'All' : c, h('span', { class: 'count' }, ''))));
  navBuilt = true;
}
function render(note = '') {
  const categories = [...new Set(posts.map((p) => p.category))];
  if (!navBuilt) buildNav(categories);
  const searched = posts.filter((p) => resourceMatches(p, state.q));
  for (const button of $('community-nav').children) {
    const c = button.dataset.category;
    button.setAttribute('aria-pressed', String(state.category === c));
    button.querySelector('.count').textContent = String(c === 'all' ? searched.length : searched.filter((p) => p.category === c).length);
  }
  const shown = searched.filter((p) => state.category === 'all' || p.category === state.category);
  const q = state.q.trim(), filtered = Boolean(q) || state.category !== 'all';
  $('resources-clear').hidden = !filtered;
  $('community-summary').textContent = [note,
    !filtered ? `${shown.length} resource${shown.length === 1 ? '' : 's'}.`
      : `${shown.length} of ${posts.length} resources${state.category !== 'all' ? ` in ${state.category}` : ''}${q ? ` ${shown.length === 1 ? 'matches' : 'match'} “${q}”` : ''}.`].filter(Boolean).join(' ');
  if (!shown.length) { showEmpty($('community-feed'), q ? 'No resources match this search.' : 'No resources in this category.'); return; }
  replaceChildren($('community-feed'), ...shown.map(cardFor));
}
function setState(patch, { push = false } = {}) {
  state = { ...state, ...patch };
  const url = `${location.pathname}${resourceQuery(state)}`;
  if (location.pathname + location.search !== url) history[push ? 'pushState' : 'replaceState'](null, '', url);
  // Typing before the resources arrive only updates the address; the first
  // render (with every category) happens when the data is ready.
  if (loaded) render();
}
function fromAddress() {
  const r = resourceState(location.search, [...new Set(posts.map((p) => p.category))]);
  state = { category: r.category, q: r.q };
  if ($('resources-q').value !== state.q) $('resources-q').value = state.q;
  render(!r.unknownCategory ? '' : state.q.trim() ? 'That category isn’t listed, so all categories are searched.' : 'That category isn’t listed, so all resources are shown.');
}

if(resourceView)loadInto($('community-feed'), '/data/community.json', {
  title: 'Community resources could not be loaded.',
  validate: validateCommunity,
  onData: (d) => { posts = d.posts; loaded = true; fromAddress(); },
});
if (resourceView) {
  $('resources-search').addEventListener('submit', (e) => e.preventDefault());
  $('resources-q').addEventListener('input', (e) => setState({ q: e.target.value.slice(0, MAX_QUERY) }));
  $('resources-clear').addEventListener('click', () => { $('resources-q').value = ''; setState({ category: 'all', q: '' }, { push: true }); $('resources-q').focus(); });
  window.addEventListener('popstate', () => { if (posts.length) fromAddress(); });
}

let guideRequest=0;
async function loadGuides(){
 const request=++guideRequest;
 const result=await publicGuides();
 if(request!==guideRequest)return;
 const holder=$('community-guides');
 if(result.error){replaceChildren(holder,h('p',{},'Discussion guides could not be loaded.'),h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:loadGuides}},'Try again'));return;}
 const choices=starterGuides(result.data||[]);
 replaceChildren(holder,...(choices.length?choices.map(t=>h('article',{class:'discussion-card'},h('span',{class:'badge badge-muted'},'Discussion guide'),h('h3',{},h('a',{href:discussionUrl({topic:t.id})},t.title)),h('p',{},t.body.split('\n')[0]))):[h('p',{},'New discussion guides will appear here when available.')]));
}
if(resourceView)loadGuides();
