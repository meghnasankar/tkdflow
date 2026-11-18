/* Compare two forms: URL state and the neutral facts shown. Pure functions,
   tested in Node. Only facts already in the catalogue (data/forms.json) and the
   companion-generated counts (data/form-facts.json) are used; nothing is
   ranked, scored or declared equivalent. */
import { ORGS } from './catalog.js';

export const MAX_ID = 40;
const ID = /^[a-z0-9-]+$/;

/** Read ?a=&b= against the known form ids.
 *  Returns { a, b, problems: [...], canonical: boolean }. A value that is not a
 *  known id is dropped (problem "unknown" or "long"); the same form twice keeps
 *  only the first ("same"). `canonical` is false when the address holds anything
 *  else (extra parameters, a dropped value, different spelling), so the page can
 *  rewrite it to the canonical form. */
export function parseCompare(search, ids) {
  const p = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const known = new Set(ids), problems = [];
  const pick = (key) => {
    const all = p.getAll(key);
    if (!all.length) return null;
    const raw = all[0];
    if (all.length > 1) problems.push('repeated');
    if (raw.length > MAX_ID) { problems.push('long'); return null; }
    if (!ID.test(raw) || !known.has(raw)) { problems.push('unknown'); return null; }
    return raw;
  };
  let a = pick('a'), b = pick('b');
  if (a && b && a === b) { problems.push('same'); b = null; }
  if (!a && b) { a = b; b = null; }
  const canonical = p.toString() === compareQuery({ a, b }).replace(/^\?/, '');
  return { a, b, problems, canonical };
}

/** The canonical query string for a pair (empty when nothing is chosen). */
export function compareQuery({ a, b }) {
  const p = new URLSearchParams();
  if (a) p.set('a', a);
  if (b) p.set('b', b);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const styleLabel = (form) => ORGS.find((o) => o.id === form.category)?.label || form.organization;

/** The facts shown for one form, in display order. Difficulty and review notes are deliberately not shown. */
export function factRows(form, facts) {
  const rows = [
    ['Style', styleLabel(form)],
    ['Series', form.series],
    ['Typical belt / level', `${form.beltLabel} (typical)`],
  ];
  const f = facts?.[form.id];
  if (f) rows.push(['Reference counts', String(f.referenceCounts)], ['Study poses', String(f.studyPoses)]);
  return rows;
}

/** Neutral statements that are simply true of both forms (no comparison words). */
export function sharedLines(a, b) {
  if (!a || !b) return [];
  if (a.series === b.series) return [`Both are in the ${a.series}.`];
  if (a.category === b.category) return [`Both are ${styleLabel(a)} forms.`];
  return [];
}

/** Links for one form: its lesson, its read-and-print companion and its library entry. */
export function formLinks(form) {
  return [
    { text: 'Open the lesson', href: `/${form.lessonUrl}` },
    { text: 'Read or print', href: `/companions/${form.id}.html` },
    { text: 'In the library', href: `/forms.html?q=${encodeURIComponent(form.name)}` },
  ];
}

/** Shape check for data/form-facts.json. */
export function factsProblem(data, ids) {
  if (!data || data.version !== 1 || !data.forms || typeof data.forms !== 'object') return 'unexpected facts file';
  for (const [id, f] of Object.entries(data.forms)) {
    if (!ids.includes(id)) return `unknown form ${id}`;
    if (![f?.studyPoses, f?.referenceCounts].every((n) => Number.isInteger(n) && n > 0 && n < 1000)) return `bad counts for ${id}`;
  }
  return null;
}
