/* "Find a technique": pure filtering over the static technique index, shared
   by the page and the Node tests. No network, storage or account access.

   Matching is lexical. Groups keep the lessons' own wording; a search for
   "low block" also lists "knifehand low block" as its own group (shown after
   the exact group) without claiming the two are the same technique. A query
   that is exactly a form's name, id, Korean name or listed spelling selects
   that form, so "Koryeo" or "Songahm #1" do not match unrelated poses.

   Spoken instructions are opt-in (?cues=1). When the visitor ticks the box and
   the lesson's own cue text has loaded, a pose also matches if each search
   word is found in its name OR in its spoken instruction; a pose found only
   through its instruction is marked so the page can show that exact text.
   Without the data (loading, failed) results stay named-technique only. */
import { normalize } from './catalog.js';

export const STYLES = Object.freeze(['wt', 'itf', 'ata']);
export const DEFAULT_FINDER = Object.freeze({ q: '', style: '', form: '', cues: false });
export const ROW_LIMIT = 10;        // rows per form inside a group until “Show all”
export const OPEN_LIMIT = 40;       // groups opened automatically for a search
export const MAX_QUERY = 80;
export const CUES_URL = '/data/technique-cues.json';
export const CUES_MAX_LENGTH = 200000; // characters; the file is about 60 KB
const CUE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*:[1-9]\d{0,2}$/;
const CUE_MAX_TEXT = 600, CUE_MAX_COUNT = 2000;

/** Read ?q=&style=&form=&cues= strictly. Unknown values are ignored (only
 *  cues=1 turns spoken instructions on); a form outside the chosen style is
 *  dropped (the style is the broader choice). */
export function parseFinderState(search, forms) {
  let p;
  try { p = new URLSearchParams(typeof search === 'string' ? search : ''); } catch { return { ...DEFAULT_FINDER }; }
  const style = STYLES.includes(p.get('style')) ? p.get('style') : '';
  const chosen = forms.find((f) => f.id === p.get('form'));
  const form = chosen && (!style || chosen.style === style) ? chosen.id : '';
  return { q: (p.get('q') || '').slice(0, MAX_QUERY), style, form, cues: p.get('cues') === '1' };
}

export function finderQuery(state) {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set('q', state.q.trim().slice(0, MAX_QUERY));
  if (state.style) p.set('style', state.style);
  if (state.form) p.set('form', state.form);
  if (state.cues) p.set('cues', '1');
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const isFiltered = (state) => Boolean(state.q.trim() || state.style || state.form);

/** Forms whose own name, id, Korean name or listed spelling is the whole query. */
export function exactForms(model, q) {
  const whole = normalize(q);
  if (!whole) return [];
  return model.forms.filter((f) => f.terms.some((t) => normalize(t) === whole)).map((f) => f.id);
}

/** Shape check for data/technique-cues.json (null when valid). Bounded: key
 *  format, count and text length are capped so a bad file cannot flood the page. */
export function cuesProblem(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'expected an object';
  if (data.version !== 1) return 'unsupported version';
  const cues = data.cues;
  if (!cues || typeof cues !== 'object' || Array.isArray(cues)) return 'expected a cues object';
  const entries = Object.entries(cues);
  if (!entries.length || entries.length > CUE_MAX_COUNT) return 'unexpected number of cues';
  for (const [key, text] of entries) {
    if (!CUE_KEY.test(key)) return `bad cue key "${key.slice(0, 40)}"`;
    if (typeof text !== 'string' || !text.trim() || text.length > CUE_MAX_TEXT) return `bad cue text for ${key}`;
  }
  return null;
}

/** Validated cue data → Map("<form>:<n>" → { text, hay }), normalised once. */
export function prepareCues(data) {
  return new Map(Object.entries(data.cues).map(([key, text]) => [key, { text, hay: normalize(text) }]));
}

/**
 * model: { forms: [{ id, name, style, terms[] }], groups: [{ key, forms: [{ id, rows: [{ n, name, korean }] }] }] }
 * expanded: Set of `${groupKey}|${formId}` whose rows are all shown.
 * cues: prepared spoken instructions (prepareCues), used only when state.cues
 *   is on; a row found only through its instruction is returned as a copy
 *   with `cue` set to the exact instruction text.
 * Returns the groups to show (exact group-name match first), per form the
 * matching rows and how many are held back, and counts that count each
 * (form, pose) once even when a combined pose sits in two groups.
 */
export function selectView(model, state, { expanded = new Set(), cues = null } = {}) {
  const styleOf = new Map(model.forms.map((f) => [f.id, f.style]));
  const formTerms = new Map(model.forms.map((f) => [f.id, f.terms.map(normalize).join('|')]));
  const whole = normalize(state.q);
  const exact = exactForms(model, state.q);
  const words = exact.length ? [] : state.q.trim().split(/\s+/).map(normalize).filter(Boolean);
  const useCues = Boolean(state.cues && cues && words.length);
  const formOk = (id) => (!state.style || styleOf.get(id) === state.style)
    && (!state.form || id === state.form) && (!exact.length || exact.includes(id));
  const poses = new Set(), forms = new Set(), named = new Set(), groups = [];
  for (const g of model.groups) {
    const key = normalize(g.key), shownForms = [];
    for (const f of g.forms) {
      if (!formOk(f.id)) continue;
      const rows = words.length ? f.rows.flatMap((r) => {
        const hay = `${key}|${normalize(r.name)}|${normalize(r.korean)}|${formTerms.get(f.id)}`;
        if (words.every((w) => hay.includes(w))) { named.add(`${f.id}:${r.n}`); return [r]; }
        const cue = useCues ? cues.get(`${f.id}:${r.n}`) : null;
        return cue && words.every((w) => hay.includes(w) || cue.hay.includes(w)) ? [{ ...r, cue: cue.text }] : [];
      }) : f.rows;
      if (!rows.length) continue;
      const all = expanded.has(`${g.key}|${f.id}`) || rows.length <= ROW_LIMIT;
      shownForms.push({ id: f.id, rows, shown: all ? rows : rows.slice(0, ROW_LIMIT), hidden: all ? 0 : rows.length - ROW_LIMIT });
      for (const r of rows) { poses.add(`${f.id}:${r.n}`); forms.add(f.id); }
    }
    if (shownForms.length) {
      groups.push({ key: g.key, exact: whole !== '' && key === whole, forms: shownForms,
        poses: shownForms.reduce((n, f) => n + f.rows.length, 0) });
    }
  }
  const filtered = isFiltered(state);
  const ordered = [...groups.filter((g) => g.exact), ...groups.filter((g) => !g.exact)];
  ordered.forEach((g, i) => { g.open = filtered && i < OPEN_LIMIT; });
  const cueOnly = useCues ? [...poses].filter((p) => !named.has(p)).length : 0;
  return { groups: ordered, poses: poses.size, forms: forms.size, filtered, exactForms: exact, cueOnly };
}

/** Polite live summary. `cueStatus` ('idle' | 'loading' | 'ready' | 'error')
 *  only matters when the visitor asked for spoken instructions: until the data
 *  is in, the text says the results are named techniques only. */
export function summaryText(view, state, totals, cueStatus = 'idle') {
  if (!view.filtered) return `${totals.poses} study poses from ${totals.forms} lessons, in ${totals.groups} technique groups.`;
  const searching = Boolean(state.cues && state.q.trim() && !view.exactForms.length);
  const namesOnly = searching && cueStatus !== 'ready'
    ? (cueStatus === 'error' ? ' Named techniques only: spoken instructions could not load.' : ' Named techniques only for now: spoken instructions are loading.')
    : '';
  if (!view.groups.length) {
    if (searching && cueStatus === 'ready') return 'No study poses match in technique names or spoken instructions.';
    return `No study poses match.${namesOnly}`;
  }
  const q = state.q.trim();
  const viaCues = searching && cueStatus === 'ready' && view.cueOnly ? ` (${view.cueOnly} only in spoken instructions)` : '';
  return `${view.poses} study pose${view.poses === 1 ? '' : 's'} in ${view.forms} form${view.forms === 1 ? '' : 's'}`
    + `, ${view.groups.length} technique group${view.groups.length === 1 ? '' : 's'}${q ? ` matching “${q}”` : ''}${viaCues}.${namesOnly}`;
}

/** Canonical state: whatever a shared link of this state would read back. */
export const canonicalState = (state, forms) => parseFinderState(finderQuery(state), forms);

/** Whether the search box should be rewritten to show `q`. Text that differs
 *  only by surrounding spaces (a space typed before the next word) is left
 *  alone, so the box is never trimmed while someone is typing. */
export function shouldReplaceInput(value, q) {
  return String(value).trim().slice(0, MAX_QUERY) !== q;
}

/**
 * URL-backed state for the page.
 * - type(q): debounced; the newest text is held as the pending query and
 *   recorded with replaceState when the timer fires.
 * - choose(next): style/form/cues choices, submit and Clear add a history entry.
 *   A choice without its own `q` carries the newest pending query with it, so
 *   picking a filter right after typing never drops the typed words; an
 *   explicit `q` (Clear, submit) wins over anything pending.
 * - Back/Forward discards any pending text first, so a late timer can never
 *   overwrite the restored view.
 * `onChange(state)` renders. Browser objects are injected so the races can be
 * tested in Node.
 */
export function createFinderController({ win, forms, onChange, delay = 200, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let state = parseFinderState(win.location.search, forms), timer = null, pendingQ = null;
  const cancel = () => { if (timer !== null) clearTimer(timer); timer = null; pendingQ = null; };
  const record = (push) => {
    const url = `${win.location.pathname}${finderQuery(state)}`;
    if (url !== win.location.pathname + win.location.search) win.history[push ? 'pushState' : 'replaceState'](null, '', url);
  };
  const set = (next, push) => {
    cancel();
    state = canonicalState({ ...state, ...next }, forms);
    onChange(state);
    record(push);
  };
  return {
    get state() { return state; },
    get pending() { return pendingQ; },
    type(q) {
      if (timer !== null) clearTimer(timer);
      pendingQ = String(q).slice(0, MAX_QUERY);
      timer = setTimer(() => { const latest = pendingQ; timer = null; pendingQ = null; set({ q: latest }, false); }, delay);
    },
    choose(next) {
      const withQuery = pendingQ !== null && !Object.hasOwn(next, 'q') ? { ...next, q: pendingQ } : next;
      set(withQuery, true);
    },
    start() {
      win.addEventListener('popstate', () => { cancel(); state = parseFinderState(win.location.search, forms); onChange(state); });
      onChange(state);
      record(false); // normalise an invalid incoming link without adding history
    },
  };
}
