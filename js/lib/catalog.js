/* Forms catalogue: search, filters, sorting, facet counts and URL state.
   Pure functions — used by forms.html and the home page, tested in Node. */

export const ORGS = Object.freeze([
  { id: 'all', label: 'All styles' },
  { id: 'wt', label: 'WT / Kukkiwon' },
  { id: 'itf', label: 'ITF' },
  { id: 'ata', label: 'ATA / Songahm' },
]);
export const BELTS = Object.freeze(['all', 'white', 'yellow', 'green', 'blue', 'red', 'black']);
export const LEVELS = Object.freeze([
  { id: 'all', label: 'Any difficulty' },
  { id: '1', label: 'Beginner' }, { id: '2', label: 'Beginner+' }, { id: '3', label: 'Intermediate' },
  { id: '4', label: 'Advanced' }, { id: '5', label: 'Expert' },
]);
export const SORTS = Object.freeze([
  { id: 'curriculum', label: 'Curriculum order' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'difficulty-asc', label: 'Difficulty (low → high)' },
  { id: 'difficulty-desc', label: 'Difficulty (high → low)' },
  { id: 'moves-asc', label: 'Movements (fewest first)' },
  { id: 'moves-desc', label: 'Movements (most first)' },
]);

export const DEFAULT_STATE = Object.freeze({ q: '', org: 'all', belt: 'all', level: 'all', lesson: false, sort: 'curriculum' });

/** Lowercase, remove accents, spaces, hyphens and punctuation. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[\s\-_.,'’()/·]+/g, '');
}

function haystack(form) {
  return [form.id, form.name, form.koreanName, form.meaning, form.series, form.organization]
    .map(normalize).join('|');
}

export function matchesQuery(form, q) {
  const terms = String(q || '').trim().split(/\s+/).map(normalize).filter(Boolean);
  if (!terms.length) return true;
  const hay = haystack(form);
  return terms.every((t) => hay.includes(t));
}

function passes(form, state, skip) {
  if (skip !== 'q' && !matchesQuery(form, state.q)) return false;
  if (skip !== 'org' && state.org !== 'all' && form.category !== state.org) return false;
  if (skip !== 'belt' && state.belt !== 'all' && form.belt !== state.belt) return false;
  if (skip !== 'level' && state.level !== 'all' && String(form.difficulty) !== state.level) return false;
  if (skip !== 'lesson' && state.lesson && !form.lessonUrl) return false;
  return true;
}

export function sortForms(forms, sort) {
  const list = forms.map((f, i) => ({ f, i }));
  const by = {
    curriculum: (a, b) => a.i - b.i,
    name: (a, b) => a.f.name.localeCompare(b.f.name) || a.i - b.i,
    'difficulty-asc': (a, b) => a.f.difficulty - b.f.difficulty || a.i - b.i,
    'difficulty-desc': (a, b) => b.f.difficulty - a.f.difficulty || a.i - b.i,
    'moves-asc': (a, b) => a.f.moves - b.f.moves || a.i - b.i,
    'moves-desc': (a, b) => b.f.moves - a.f.moves || a.i - b.i,
  }[sort] || ((a, b) => a.i - b.i);
  return list.sort(by).map((x) => x.f);
}

/** Apply every filter, then sort. */
export function applyState(forms, state) {
  return sortForms(forms.filter((f) => passes(f, state)), state.sort);
}

/** How many results each option of `facet` would give, keeping the other filters. */
export function facetCounts(forms, state, facet) {
  const base = forms.filter((f) => passes(f, state, facet));
  const key = { org: 'category', belt: 'belt', level: 'difficulty' }[facet];
  const counts = { all: base.length };
  for (const f of base) {
    const k = String(f[key]);
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

export function stateFromParams(params) {
  const p = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  const pick = (key, allowed) => (allowed.includes(p.get(key)) ? p.get(key) : DEFAULT_STATE[key]);
  return {
    q: (p.get('q') || '').slice(0, 80),
    org: pick('org', ORGS.map((o) => o.id)),
    belt: pick('belt', BELTS),
    level: pick('level', LEVELS.map((l) => l.id)),
    lesson: p.get('lesson') === '1',
    sort: pick('sort', SORTS.map((s) => s.id)),
  };
}

export function stateToParams(state) {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set('q', state.q.trim());
  for (const key of ['org', 'belt', 'level', 'sort']) if (state[key] !== DEFAULT_STATE[key]) p.set(key, state[key]);
  if (state.lesson) p.set('lesson', '1');
  return p;
}

export function isDefaultState(state) {
  return stateToParams(state).toString() === '';
}

/** Where a named form should take a visitor: its lesson, else its library entry. */
export function destinationFor(form) {
  return form.lessonUrl || `forms.html?q=${encodeURIComponent(form.name)}`;
}

/** Validate a forms.json record. Returns a problem string or null. */
export function formRecordProblem(f) {
  const str = ['id', 'name', 'koreanName', 'organization', 'category', 'series', 'belt', 'beltLabel', 'difficultyLabel', 'description'];
  for (const k of str) if (typeof f[k] !== 'string' || !f[k]) return `${f.id || '?'}: "${k}" must be a non-empty string`;
  if (!['wt', 'itf', 'ata'].includes(f.category)) return `${f.id}: unknown category ${f.category}`;
  if (!BELTS.includes(f.belt) || f.belt === 'all') return `${f.id}: unknown belt ${f.belt}`;
  if (!Number.isInteger(f.moves) || f.moves < 1) return `${f.id}: moves must be a positive integer`;
  if (!Number.isInteger(f.difficulty) || f.difficulty < 1 || f.difficulty > 5) return `${f.id}: difficulty must be 1–5`;
  if (!Array.isArray(f.tags)) return `${f.id}: tags must be a list`;
  if (f.lessonUrl != null && !/^[a-z0-9-]+\.html$/.test(f.lessonUrl)) return `${f.id}: lessonUrl must be a local page`;
  if (f.thumbnail != null && (f.thumbnail.src !== `/assets/forms/${f.id}.webp`
      || f.thumbnail.width !== 960 || f.thumbnail.height !== 540
      || typeof f.thumbnail.alt !== 'string' || !f.thumbnail.alt.trim())) {
    return `${f.id}: thumbnail must be a local 960 × 540 image with alternative text`;
  }
  if ('videos' in f || 'hasDiagram' in f) return `${f.id}: media counts/diagram flags need real assets`;
  if (!f.review || !['pending', 'approved'].includes(f.review.status)) return `${f.id}: review.status must be "pending" or "approved"`;
  if (f.review.status === 'approved' && !(f.review.reviewer && f.review.reviewedOn && f.review.source)) {
    return `${f.id}: an approved record needs reviewer, reviewedOn and source`;
  }
  return null;
}
