/* competitions.html — listings with status computed from dates. */
import {
  DEFAULT_FILTERS, LEVELS, filterEvents, eventStatus, registrationState, createTicker, currentMonth, needsTicking,
} from '../lib/events.js';
import { validateEvents } from '../lib/validators.js';
import { loadInto, showEmpty } from '../lib/data.js';
import { h, replaceChildren, safeHref } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const LABELS = {
  style: { wt: 'WT / Kukkiwon', itf: 'ITF', ata: 'ATA', open: 'Open / all styles' },
  level: { local: 'Local / regional', national: 'National', international: 'International', unspecified: 'Level not classified' },
  type: { poomsae: 'Poomsae', patterns: 'Patterns (tul)', sparring: 'Sparring', breaking: 'Breaking', 'special-techniques': 'Special techniques', 'power-test': 'Power test' },
};
const REG_TEXT = {
  'event-finished': 'The listed dates have passed.',
  'registration-closed': 'Registration has closed.',
  unverified: 'No official source on file — check with the organiser.',
  'see-organiser': 'Check the organiser’s page for registration.',
};
let doc = null;
let filters = { ...DEFAULT_FILTERS };
const ticker = createTicker(() => render(), { intervalMs: 30000 });

// Dates are calendar dates in the event's own time zone; format them as such.
const fmtDate = (iso) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${iso}T00:00:00Z`));

function options(select, values, labels, allLabel) {
  replaceChildren(select, h('option', { value: 'all' }, allLabel),
    ...values.map((v) => h('option', { value: v }, labels?.[v] || v)));
}

function card(ev, now) {
  const status = eventStatus(ev, now);
  const reg = registrationState(ev, now);
  const href = safeHref(ev.source);
  const dates = ev.start === ev.end ? fmtDate(ev.start) : `${fmtDate(ev.start)} – ${fmtDate(ev.end)}`;
  return h('article', { class: `event-card ${status}` },
    h('div', { class: 'strip', 'aria-hidden': 'true' }),
    h('div', { class: 'event-body' },
      h('div', { class: 'example-meta' },
        h('span', { class: `badge ${status === 'past' ? 'badge-muted' : 'badge-gold'}` }, status === 'past' ? 'Past' : status === 'ongoing' ? 'Happening now' : 'Upcoming'),
        ev.source ? h('span', { class: 'badge badge-green' }, 'Official source') : h('span', { class: 'sample-label' }, 'Unverified'),
        h('span', { class: 'badge badge-navy' }, LABELS.level[ev.level] || ev.level),
        h('span', { class: 'badge badge-navy' }, LABELS.style[ev.style] || ev.style)),
      h('h3', {}, ev.name),
      h('dl', { class: 'event-meta' },
        h('div', {}, h('dt', {}, 'Dates'), h('dd', {}, dates)),
        h('div', {}, h('dt', {}, 'Location'), h('dd', {}, ev.location)),
        ev.organiserClass ? h('div', {}, h('dt', {}, 'Organiser’s class'), h('dd', {}, ev.organiserClass)) : null,
        h('div', {}, h('dt', {}, 'Event types'), h('dd', {}, (ev.eventTypes || []).map((t) => LABELS.type[t] || t).join(', ') || 'Not stated')),
        h('div', {}, h('dt', {}, 'Last checked'), h('dd', {}, ev.lastChecked ? fmtDate(ev.lastChecked) : 'Never verified'))),
      h('div', { class: 'event-footer' },
        h('span', {},
          REG_TEXT[reg] || ''),
        href
          ? h('a', { class: 'btn btn-gold btn-sm', href, rel: 'noopener noreferrer', target: '_blank' }, 'Organiser’s official page',
            h('span', { class: 'sr-only' }, ' (opens in a new tab)'))
          : null)));
}

function render() {
  if (!doc) return;
  const now = new Date();
  const list = filterEvents(doc.events, filters, now);
  document.querySelectorAll('[data-status]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.status === filters.status)));
  const scope = { upcoming: 'upcoming', past: 'past', all: '' }[filters.status];
  $('events-summary').textContent = `${list.length} ${scope ? `${scope} ` : ''}event${list.length === 1 ? '' : 's'}` +
    (filters.month ? ` in ${filters.month}` : '') + '.';
  if (!list.length) {
    const pastCount = filterEvents(doc.events, { ...filters, status: 'past' }, now).length;
    showEmpty($('events-list'),
      filters.status === 'upcoming' ? 'No upcoming events match. Verified listings will appear here when they are added.' : 'No events match these filters.',
      filters.status === 'upcoming' && pastCount
        ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm', on: { click: () => setFilter({ status: 'past' }) } }, `View ${pastCount} archived listing${pastCount === 1 ? '' : 's'}`)
        : null);
  } else {
    replaceChildren($('events-list'), ...list.map((ev) => card(ev, now)));
  }
  // One shared timer while ANY event can still change state (start, end or
  // registration close) — including ongoing ones and ones in other tabs.
  if (needsTicking(doc.events, now)) ticker.start(); else ticker.stop();
}

function setFilter(patch) {
  filters = { ...filters, ...patch };
  render();
}

function setup() {
  const ev = doc.events;
  const uniq = (key) => [...new Set(ev.map((e) => e[key]))].sort();
  options($('ev-style'), uniq('style'), LABELS.style, 'All styles');
  options($('ev-level'), LEVELS.filter((l) => ev.some((e) => e.level === l)), LABELS.level, 'All levels');
  options($('ev-country'), uniq('country'), null, 'All countries');
  options($('ev-type'), [...new Set(ev.flatMap((e) => e.eventTypes || []))].sort(), LABELS.type, 'All event types');
  for (const [id, key] of [['ev-style', 'style'], ['ev-level', 'level'], ['ev-country', 'country'], ['ev-type', 'type']]) {
    $(id).addEventListener('change', (e) => setFilter({ [key]: e.target.value }));
  }
  $('ev-month').addEventListener('change', (e) => setFilter({ month: e.target.value }));
  $('ev-q').addEventListener('input', (e) => setFilter({ q: e.target.value }));
  $('ev-this-month').addEventListener('click', () => { $('ev-month').value = currentMonth(); setFilter({ month: currentMonth() }); });
  $('event-filters').addEventListener('submit', (e) => e.preventDefault());
  $('event-filters').addEventListener('reset', () => setTimeout(() => setFilter({ ...DEFAULT_FILTERS, status: filters.status }), 0));
  document.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => setFilter({ status: b.dataset.status })));
  $('events-reviewed').textContent = `Listings last reviewed ${fmtDate(doc.lastReviewed)}.`;
}

document.addEventListener('visibilitychange', () => { if (document.hidden) ticker.stop(); else render(); });
loadInto($('events-list'), '/data/competitions.json', {
  title: 'Event listings could not be loaded.',
  validate: validateEvents,
  onData: (d) => { doc = d; setup(); render(); },
});
