/* Community learning resources and published member discussions. */
import { loadInto, showEmpty } from '../lib/data.js';
import { h, replaceChildren, safeHref } from '../lib/dom.js';
import { validateCommunity } from '../lib/validators.js';
import {getAccountService} from '../lib/account-service.js';
import {listTopics,discussionUrl} from '../lib/discussions.js';

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

let feedRequest=0;
async function loadDiscussions(){
 const request=++feedRequest,button=$('community-refresh');button.disabled=true;
 try{
  const service=await getAccountService();
  const result=service.status==='ready'?await listTopics(service.client):{error:true};
  if(request!==feedRequest)return;
  const holder=$('community-discussions');
  if(result.error){replaceChildren(holder,h('p',{class:'status-panel'},'Member discussions could not be loaded. You can still explore the discussion guides in the forum.'));return;}
  const members=(result.data||[]).filter(t=>!t.editorial).slice(0,6);
  replaceChildren(holder,...(members.length?members.map(t=>h('article',{class:'discussion-card'},h('h3',{},h('a',{href:discussionUrl({topic:t.id})},t.title)),h('p',{class:'topic-author'},`By @${t.author_handle}`),h('p',{},t.body.length>180?t.body.slice(0,180)+'…':t.body))):[h('div',{class:'status-panel'},h('h3',{},'Start the first conversation'),h('p',{},'No member discussions have been published yet. Explore the discussion guides for ideas, then bring a focused question to the forum.'),h('a',{class:'text-link',href:'/forum.html'},'Explore discussion guides →'))]));
 }catch{if(request===feedRequest)replaceChildren($('community-discussions'),h('p',{},'Member discussions could not be loaded. Try refreshing.'));}
 finally{if(request===feedRequest)button.disabled=false;}
}
$('community-refresh').addEventListener('click',loadDiscussions);loadDiscussions();
