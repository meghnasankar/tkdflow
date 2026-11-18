/* Compare two forms side by side. Reads the catalogue and the companion-
   generated counts; the pair lives in the address (?a=&b=) so it can be shared.
   Selects are never rebuilt after the first render, so focus stays on them;
   only the cards change. Nothing is ranked or declared equivalent. */
import { loadJSON } from '../lib/data.js';
import { validateForms } from '../lib/validators.js';
import { h, replaceChildren } from '../lib/dom.js';
import { ORGS } from '../lib/catalog.js';
import { copyText } from '../lib/lesson-nav.js';
import { parseCompare, compareQuery, factRows, sharedLines, formLinks, factsProblem } from '../lib/form-compare.js';

const $ = (id) => document.getElementById(id);
let forms = [], byId = new Map(), facts = null, pair = { a: null, b: null }, copyRequest = 0;

const MESSAGES = {
  unknown: 'That link named a form that isn’t in the library, so it was left out.',
  long: 'That link named a form that isn’t in the library, so it was left out.',
  same: 'Both choices were the same form, so only one is shown. Choose a second form.',
  repeated: 'That link listed a form more than once; the first one is used.',
};

function options(select, emptyLabel) {
  const groups = ORGS.filter((o) => o.id !== 'all').map((o) => h('optgroup', { label: o.label },
    ...forms.filter((f) => f.category === o.id).map((f) => h('option', { value: f.id }, f.name))));
  replaceChildren(select, h('option', { value: '' }, emptyLabel), ...groups);
}

function card(form, slot) {
  const t = form.thumbnail;
  return h('article', { class: 'cf-card', 'aria-labelledby': `cf-title-${slot}` },
    t ? h('img', { class: 'cf-thumb', src: t.src, width: t.width, height: t.height, alt: t.alt, loading: 'lazy', decoding: 'async' }) : null,
    h('h2', { id: `cf-title-${slot}` }, form.name),
    h('p', { class: 'cf-korean', lang: 'ko' }, form.koreanName),
    form.meaning ? h('p', { class: 'cf-meaning' }, form.meaning) : null,
    form.description ? h('p', { class: 'cf-desc' }, form.description) : null,
    h('dl', { class: 'cf-facts' }, ...factRows(form, facts).flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
    h('p', { class: 'cf-links' }, ...formLinks(form).map((l) => h('a', { class: 'text-link', href: l.href }, l.text))));
}

function render(problems = []) {
  const a = byId.get(pair.a) || null, b = byId.get(pair.b) || null;
  if ($('cf-a').value !== (pair.a || '')) $('cf-a').value = pair.a || '';
  if ($('cf-b').value !== (pair.b || '')) $('cf-b').value = pair.b || '';
  const shown = [a, b].filter(Boolean);
  replaceChildren($('cf-cards'), ...[a && card(a, 'a'), b && card(b, 'b')].filter(Boolean),
    ...(a && b ? sharedLines(a, b).map((line) => h('p', { class: 'cf-shared' }, line)) : []));
  $('cf-note').hidden = !shown.length;
  $('cf-counts-note').hidden = !shown.length || !facts;
  const message = [...new Set(problems.map((p) => MESSAGES[p]))].join(' ');
  $('cf-summary').textContent = message || (shown.length === 2 ? `Comparing ${a.name} and ${b.name}.` : shown.length === 1 ? `Choose a second form to compare with ${shown[0].name}.` : 'Choose two forms to compare.');
  $('cf-swap').setAttribute('aria-disabled', String(shown.length < 2));
  $('cf-copy').setAttribute('aria-disabled', String(!shown.length));
}

function setPair(next, { push = true } = {}) {
  pair = { a: next.a || null, b: next.b && next.b !== next.a ? next.b : null };
  if (!pair.a && pair.b) pair = { a: pair.b, b: null };
  const url = `${location.pathname}${compareQuery(pair)}`;
  if (location.pathname + location.search !== url) history[push ? 'pushState' : 'replaceState'](null, '', url);
  clearCopy();
  render(next.a && next.b && next.a === next.b ? ['same'] : []);
}

/** Forget any copy in progress or shown: it described an earlier pair. */
function clearCopy() { copyRequest += 1; $('cf-copy-status').textContent = ''; $('cf-copy-fallback').hidden = true; }

function fromAddress({ canonicalize }) {
  clearCopy();
  const r = parseCompare(location.search, forms.map((f) => f.id));
  pair = { a: r.a, b: r.b };
  // Rewrite a mistyped or extended address to the pair actually shown (no history entry).
  if (canonicalize && !r.canonical) history.replaceState(null, '', `${location.pathname}${compareQuery(pair)}`);
  render(r.problems);
}

async function copyLink() {
  if ($('cf-copy').getAttribute('aria-disabled') === 'true') return;
  const url = `${location.origin}${location.pathname}${compareQuery(pair)}`, request = ++copyRequest;
  const result = await copyText(url, { clipboard: navigator.clipboard });
  // A newer copy, or a different pair chosen meanwhile, makes this answer stale.
  if (request !== copyRequest || url !== `${location.origin}${location.pathname}${compareQuery(pair)}`) return;
  if (result.ok) { $('cf-copy-status').textContent = 'Comparison link copied.'; $('cf-copy-fallback').hidden = true; return; }
  $('cf-copy-status').textContent = 'The link couldn’t be copied automatically. Select it below and copy it.';
  $('cf-url').value = url; $('cf-copy-fallback').hidden = false; $('cf-url').focus(); $('cf-url').select?.();
}

async function start() {
  $('cf-nojs').hidden = true;
  try {
    const [catalogue, counts] = await Promise.all([
      loadJSON('/data/forms.json', { validate: validateForms }),
      // Optional: without the counts the cards still show the catalogue facts.
      loadJSON('/data/form-facts.json').catch(() => null),
    ]);
    forms = catalogue.filter((f) => f.lessonUrl);
    byId = new Map(forms.map((f) => [f.id, f]));
    facts = counts && !factsProblem(counts, forms.map((f) => f.id)) ? counts.forms : null;
  } catch {
    $('cf-load-error').hidden = false;
    return;
  }
  options($('cf-a'), 'Choose a form'); options($('cf-b'), 'Choose a form');
  $('cf-app').hidden = false;
  $('cf-a').addEventListener('change', (e) => setPair({ a: e.target.value, b: pair.b }));
  $('cf-b').addEventListener('change', (e) => setPair({ a: pair.a, b: e.target.value }));
  $('cf-pick').addEventListener('submit', (e) => e.preventDefault());
  $('cf-swap').addEventListener('click', () => { if (pair.a && pair.b) setPair({ a: pair.b, b: pair.a }); });
  $('cf-copy').addEventListener('click', copyLink);
  window.addEventListener('popstate', () => fromAddress({ canonicalize: false }));
  fromAddress({ canonicalize: true });
}

start();
