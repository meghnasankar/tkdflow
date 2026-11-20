/* Home page: counts and featured forms come from the real data files. */
import { ACCOUNTS } from '../config.js';
import { accountsConfigured } from '../lib/account-service.js';
import { loadJSON } from '../lib/data.js';
import { destinationFor } from '../lib/catalog.js';
import { filterEvents } from '../lib/events.js';
import { validateForms, validateEvents } from '../lib/validators.js';
import {getLearningService,learningMessage} from '../lib/learning-service.js';
import {learningCard} from '../lib/learning-ui.js';
import {icon} from '../lib/icons.js';
import {createCtaRenderer} from '../lib/home-cta.js';
import { h, replaceChildren } from '../lib/dom.js';

const FEATURED = ['taegeuk-1', 'taegeuk-4', 'koryo', 'keumgang', 'chon-ji', 'do-san', 'songahm-1', 'taebaek'];
const $ = (id) => document.getElementById(id);

async function forms() {
  const list = $('featured-forms');
  try {
    const data = await loadJSON('/data/forms.json', { validate: validateForms });
    const set = (k, v) => { document.querySelector(`[data-stat="${k}"]`).textContent = String(v); };
    set('forms', data.length);
    set('styles', new Set(data.map((f) => f.category)).size);
    set('lessons', data.filter((f) => f.lessonUrl).length);
    const picks = FEATURED.map((id) => data.find((f) => f.id === id)).filter(Boolean);
    const learning=getLearningService();
    learning.subscribe(state=>{const records=new Map(state.records.map(r=>[r.form_id,r]));const recent=data.filter(f=>records.get(f.id)?.last_pose!=null&&!records.get(f.id).practised).sort((a,b)=>(records.get(b.id).studied_at||'').localeCompare(records.get(a.id).studied_at||'')).slice(0,3);$('home-learning').hidden=!recent.length;$('home-learning-status').textContent=learningMessage(state);$('home-learning-cards').replaceChildren(...recent.map(f=>learningCard(f,records.get(f.id),state,learning)));});
    replaceChildren(list, ...picks.map((f) => h('li', {},
      h('a', { class: 'form-mini-card', href: destinationFor(f) },
        h('div', { class: 'form-mini-visual', 'aria-hidden': 'true' }, f.thumbnail ? h('img',{src:f.thumbnail.src,width:f.thumbnail.width,height:f.thumbnail.height,alt:'',loading:'lazy',decoding:'async'}) : icon('forms')),
        h('div', { class: 'form-mini-body' },
          h('h3', {}, f.name),
          h('p', { class: 'sub' }, h('span', { lang: 'ko' }, f.koreanName), ` · ${f.organization} · ${f.difficultyLabel}`),
          h('span', { class: 'go' }, f.lessonUrl ? 'Open lesson →' : 'View in library →'))))));
  } catch (error) {
    replaceChildren(list, h('li', { class: 'status-panel status-error', role: 'alert' },
      'Featured forms could not be loaded. ', h('a', { href: '/forms.html', class: 'text-link' }, 'Open the library')));
  }
}

async function events() {
  try {
    const doc = await loadJSON('/data/competitions.json', { validate: validateEvents });
    const upcoming = filterEvents(doc.events, { status: 'upcoming' }).filter((e) => e.source);
    if (upcoming.length) {
      $('events-state').textContent = 'Available';
      $('events-state').className = 'feature-state available';
      $('events-teaser').textContent = `${upcoming.length} upcoming or announced event${upcoming.length === 1 ? '' : 's'} listed, each with the organizer’s official page.`;
    }
  } catch { /* the static teaser text stays accurate */ }
}

/* Closing banner follows the shared learning service, which already tracks
   sign-in, sign-out, token expiry, other tabs and the age screen through the
   one account client. Loading shows the neutral library banner immediately. */
function cta() {
  getLearningService().subscribe(createCtaRenderer((next) => {
    $('cta-title').textContent = next.title;
    $('cta-text').textContent = next.text;
    replaceChildren($('cta-actions'), ...next.actions.map((a) => h('a', { href: a.href, class: `btn btn-lg ${a.primary ? 'btn-primary' : 'btn-ghost-dark'}` }, a.label)));
  }, () => ({ configured: accountsConfigured(), signupEnabled: ACCOUNTS.signupEnabled })));
}

forms();
events();
cta();
