/* Home page: counts and featured forms come from the real data files. */
import { ACCOUNTS } from '../config.js';
import { accountsConfigured } from '../lib/account-service.js';
import { loadJSON } from '../lib/data.js';
import { destinationFor } from '../lib/catalog.js';
import { filterEvents } from '../lib/events.js';
import { validateForms, validateEvents } from '../lib/validators.js';
import { h, replaceChildren, safeGradient } from '../lib/dom.js';

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
    replaceChildren(list, ...picks.map((f) => h('li', {},
      h('a', { class: 'form-mini-card', href: destinationFor(f) },
        h('div', { class: 'form-mini-visual', style: { background: safeGradient(f.bgGradient, '') || null }, 'aria-hidden': 'true' }, f.emoji || ''),
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
      $('events-teaser').textContent = `${upcoming.length} verified upcoming event${upcoming.length === 1 ? '' : 's'} listed, each with the organiser’s official page.`;
    }
  } catch { /* the static teaser text stays accurate */ }
}

function cta() {
  if (!accountsConfigured() || !ACCOUNTS.signupEnabled) return;
  $('cta-title').textContent = 'Create a free account';
  $('cta-text').textContent = 'Create and edit your member profile. Free, with no ads.';
  replaceChildren($('cta-actions'),
    h('a', { href: '/auth.html?mode=register', class: 'btn btn-primary btn-lg' }, 'Create a free account'),
    h('a', { href: '/about.html', class: 'btn btn-lg btn-ghost-dark' }, 'About TKDflow'));
}

forms();
events();
cta();
