/* Taekwondo words explained: the list is complete in the HTML (generated from
   data/glossary.json); this adds search by Korean, romanized or English words,
   compared the way the library compares names (every word, any order, ignoring
   case, accents, spaces and hyphens). The search lives in ?q= for sharing. */
import { normalize } from '../lib/catalog.js';

const $ = (id) => document.getElementById(id);
const entries = [...document.querySelectorAll('.gl-entry')].map((el) => ({ el, hay: normalize(el.dataset.search || '') }));
const MAX = 60;

export function matches(hay, q) {
  const words = String(q || '').trim().split(/\s+/).map(normalize).filter(Boolean);
  return words.every((w) => hay.includes(w));
}

function apply(q, { write = true } = {}) {
  const text = q.slice(0, MAX), shown = entries.filter((e) => matches(e.hay, text));
  for (const e of entries) e.el.hidden = !shown.includes(e);
  const t = text.trim();
  $('gl-summary').textContent = t ? `${shown.length} of ${entries.length} words ${shown.length === 1 ? 'matches' : 'match'} “${t}”.` : `${entries.length} words.`;
  $('gl-empty').hidden = shown.length > 0;
  if (write) {
    const url = `${location.pathname}${t ? `?q=${encodeURIComponent(t)}` : ''}${location.hash}`;
    if (location.pathname + location.search + location.hash !== url) history.replaceState(null, '', url);
  }
}

const field = $('gl-q');
$('gl-search').hidden = false;
$('gl-search').addEventListener('submit', (e) => e.preventDefault());
field.value = (new URLSearchParams(location.search).get('q') || '').slice(0, MAX);
field.addEventListener('input', () => apply(field.value));
$('gl-clear').addEventListener('click', () => { field.value = ''; apply(''); field.focus(); });
window.addEventListener('popstate', () => { field.value = (new URLSearchParams(location.search).get('q') || '').slice(0, MAX); apply(field.value, { write: false }); });
apply(field.value, { write: false });
