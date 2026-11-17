/* Community learning resources and published member discussions. */
import { loadInto, showEmpty } from '../lib/data.js';
import { h, replaceChildren, safeHref } from '../lib/dom.js';
import { validateCommunity } from '../lib/validators.js';
import {getAccountService} from '../lib/account-service.js';
import {listDiscussionGuides,starterGuides,discussionUrl} from '../lib/discussions.js';

const $ = (id) => document.getElementById(id);
const resourceView=new URLSearchParams(location.search).get('view')==='resources';
$('community-discussions-pane').hidden=resourceView;$('community-resources-pane').hidden=!resourceView;
for(const link of document.querySelectorAll('[data-community-view]')){if((link.dataset.communityView==='resources')===resourceView)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
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

if(resourceView)loadInto($('community-feed'), '/data/community.json', {
  title: 'Community resources could not be loaded.',
  validate: validateCommunity,
  onData: (d) => { posts = d.posts; render(); },
});

let guideRequest=0;
async function loadGuides(){
 const request=++guideRequest;
 const service=await getAccountService(),result=service.status==='ready'?await listDiscussionGuides(service.client):{error:true};
 if(request!==guideRequest)return;
 const holder=$('community-guides');
 if(result.error){replaceChildren(holder,h('p',{},'Discussion guides could not be loaded.'),h('button',{type:'button',class:'btn btn-secondary btn-sm',on:{click:loadGuides}},'Try again'));return;}
 const choices=starterGuides(result.data||[]);
 replaceChildren(holder,...(choices.length?choices.map(t=>h('article',{class:'discussion-card'},h('span',{class:'badge badge-muted'},'Discussion guide'),h('h3',{},h('a',{href:discussionUrl({topic:t.id})},t.title)),h('p',{},t.body.split('\n')[0]))):[h('p',{},'New discussion guides will appear here when available.')]));
}
if(resourceView)loadGuides();
