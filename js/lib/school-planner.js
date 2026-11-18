/* "My school's forms": a private, browser-only list of a visitor's own belt or
   level names, in their own order, with the forms for each. Pure logic and the
   storage wrapper, shared by the page and the Node tests.

   - Nothing is prefilled and no curriculum is suggested: every level name and
     its order come from the visitor.
   - A form is either one of the TKDflow lessons (stored by id only; its name
     and link come from data/forms.json when shown) or a plain name the visitor
     typed, which is never linked and never matched to a lesson.
   - Text is cleaned and bounded, and is only ever shown as text.
   - Saved in this browser only (localStorage). No account, network or
     personal-data fields. */
import { FORM_IDS } from './learning-model.js';

export const STORAGE_KEY = 'tkdflow.schoolForms.v1';
export const APP = 'tkdflow-school-forms';
export const VERSION = 1;
export const LIMITS = Object.freeze({ levels: 30, forms: 12, label: 60, name: 60 });
// The largest valid list (30 levels x 12 own names, every label and name 60
// four-byte characters) exports to about 105 KB of UTF-8; the cap leaves room
// for that and refuses anything far larger before it is read.
export const MAX_IMPORT_BYTES = 192 * 1024;
export const EXPORT_NAME = 'tkdflow-school-forms.json';
const LESSONS = new Set(FORM_IDS);
const ID = /^[a-z0-9]{1,16}$/;
const LONE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
// C0/C1 controls, and invisible direction or isolate marks that could disguise text.
// Unpaired surrogate halves are removed too (they are not text, and JSON would
// write each as a six-byte escape).
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/** Clean visitor text: NFC, no control or direction marks, single spaces, at
 *  most `max` characters (counted as code points, never splitting one). */
export function cleanText(value, max) {
  const text = String(value ?? '').replace(LONE, '').normalize('NFC').replace(/\s+/g, ' ').replace(UNSAFE, '').trim();
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join('').trimEnd() : text;
}
const tooLong = (value, max) => Array.from(String(value ?? '').replace(LONE, '').normalize('NFC').replace(/\s+/g, ' ').replace(UNSAFE, '').trim()).length > max;

let counter = 0;
/** Local ids for focus continuity; never imported, never shown. */
export function makeId(taken = new Set()) {
  let id;
  do { id = (Date.now() % 1e6).toString(36) + (counter++).toString(36) + Math.floor(Math.random() * 1296).toString(36); } while (taken.has(id));
  return id.slice(0, 16);
}
const idsIn = (list) => new Set(list.levels.flatMap((l) => [l.id, ...l.forms.map((f) => f.id)]));

export const emptyList = () => ({ levels: [] });
export const formCount = (list) => list.levels.reduce((n, l) => n + l.forms.length, 0);
export const countText = (levels, forms) => `${levels} level${levels === 1 ? '' : 's'}, ${forms} form${forms === 1 ? '' : 's'}`;

/* ---------- operations: each returns { list } or { error } and never mutates ---------- */

const copy = (list) => ({ levels: list.levels.map((l) => ({ ...l, forms: l.forms.map((f) => ({ ...f })) })) });
const findLevel = (list, levelId) => list.levels.findIndex((l) => l.id === levelId);

export function addLevel(list, label, id) {
  const clean = cleanText(label, LIMITS.label);
  if (!clean) return { error: 'Type a belt or level name first.' };
  if (list.levels.length >= LIMITS.levels) return { error: `A list can have up to ${LIMITS.levels} levels.` };
  const next = copy(list);
  const level = { id: id || makeId(idsIn(list)), label: clean, forms: [] };
  next.levels.push(level);
  return { list: next, level };
}

export function renameLevel(list, levelId, label) {
  const i = findLevel(list, levelId), clean = cleanText(label, LIMITS.label);
  if (i < 0) return { error: 'That level is no longer in the list.' };
  if (!clean) return { error: 'A level needs a name.' };
  if (clean === list.levels[i].label) return { list, unchanged: true };
  const next = copy(list);
  next.levels[i].label = clean;
  return { list: next };
}

function move(items, index, delta) {
  const to = index + delta;
  if (index < 0 || to < 0 || to >= items.length) return null;
  const out = [...items];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

export function moveLevel(list, levelId, delta) {
  const moved = move(list.levels, findLevel(list, levelId), delta);
  if (!moved) return { list, unchanged: true };
  return { list: { levels: moved.map((l) => ({ ...l, forms: [...l.forms] })) } };
}

export function removeLevel(list, levelId) {
  const index = findLevel(list, levelId);
  if (index < 0) return { error: 'That level is no longer in the list.' };
  const next = copy(list);
  const [item] = next.levels.splice(index, 1);
  return { list: next, removed: { type: 'level', item, index } };
}

/** entry: { kind: 'lesson', lesson } or { kind: 'custom', name }. */
export function addForm(list, levelId, entry, id) {
  const i = findLevel(list, levelId);
  if (i < 0) return { error: 'That level is no longer in the list.' };
  if (list.levels[i].forms.length >= LIMITS.forms) return { error: `A level can have up to ${LIMITS.forms} forms.` };
  let form;
  if (entry?.kind === 'lesson') {
    if (!LESSONS.has(entry.lesson)) return { error: 'Choose a lesson first.' };
    form = { kind: 'lesson', lesson: entry.lesson };
  } else if (entry?.kind === 'custom') {
    const name = cleanText(entry.name, LIMITS.name);
    if (!name) return { error: 'Type a form name first.' };
    form = { kind: 'custom', name };
  } else return { error: 'Unknown form.' };
  const next = copy(list);
  form.id = id || makeId(idsIn(list));
  next.levels[i].forms.push(form);
  return { list: next, form };
}

export function moveForm(list, levelId, formId, delta) {
  const i = findLevel(list, levelId);
  if (i < 0) return { list, unchanged: true };
  const moved = move(list.levels[i].forms, list.levels[i].forms.findIndex((f) => f.id === formId), delta);
  if (!moved) return { list, unchanged: true };
  const next = copy(list);
  next.levels[i].forms = moved.map((f) => ({ ...f }));
  return { list: next };
}

export function removeForm(list, levelId, formId) {
  const i = findLevel(list, levelId);
  const index = i < 0 ? -1 : list.levels[i].forms.findIndex((f) => f.id === formId);
  if (index < 0) return { error: 'That form is no longer in the list.' };
  const next = copy(list);
  const [item] = next.levels[i].forms.splice(index, 1);
  return { list: next, removed: { type: 'form', levelId, item, index } };
}

/**
 * Undo a removal by putting the removed item back into the CURRENT list at its
 * old position (clamped), never by restoring an earlier copy of the whole
 * list, so nothing done since is lost. The page offers it only for the latest
 * change. Returns { error } if it no longer fits (e.g. its level is gone).
 */
export function restoreRemoved(list, removed) {
  if (!removed?.item) return { error: 'Nothing to undo.' };
  const next = copy(list), taken = idsIn(list);
  const item = { ...removed.item, id: taken.has(removed.item.id) ? makeId(taken) : removed.item.id };
  if (removed.type === 'level') {
    if (next.levels.length >= LIMITS.levels) return { error: `A list can have up to ${LIMITS.levels} levels.` };
    item.forms = removed.item.forms.map((f) => ({ ...f, id: taken.has(f.id) ? makeId(taken) : f.id }));
    next.levels.splice(Math.min(removed.index, next.levels.length), 0, item);
    return { list: next, restored: item };
  }
  const i = findLevel(next, removed.levelId);
  if (i < 0) return { error: 'Its level is no longer in the list.' };
  if (next.levels[i].forms.length >= LIMITS.forms) return { error: `A level can have up to ${LIMITS.forms} forms.` };
  next.levels[i].forms.splice(Math.min(removed.index, next.levels[i].forms.length), 0, item);
  return { list: next, restored: item, levelId: removed.levelId };
}

/* ---------- validation shared by storage and import ---------- */

/** Strictly rebuild a list from untrusted data. Only known fields are read;
 *  objects are rebuilt, so extra keys (including "__proto__") never carry over.
 *  keepIds: reuse valid stored ids (storage); otherwise new ids (import). */
export function validateLevels(levels, { keepIds = false } = {}) {
  if (!Array.isArray(levels)) return { error: 'The file has no list of levels.' };
  if (levels.length > LIMITS.levels) return { error: `The file has ${levels.length} levels; the limit is ${LIMITS.levels}.` };
  const taken = new Set(), out = [];
  const idFor = (raw) => {
    const id = keepIds && typeof raw === 'string' && ID.test(raw) && !taken.has(raw) ? raw : makeId(taken);
    taken.add(id);
    return id;
  };
  for (const [i, level] of levels.entries()) {
    const n = i + 1;
    if (!level || typeof level !== 'object' || Array.isArray(level)) return { error: `Level ${n} is not readable.` };
    if (typeof level.label !== 'string') return { error: `Level ${n} has no name.` };
    if (tooLong(level.label, LIMITS.label)) return { error: `Level ${n}’s name is longer than ${LIMITS.label} characters.` };
    const label = cleanText(level.label, LIMITS.label);
    if (!label) return { error: `Level ${n} has no name.` };
    if (!Array.isArray(level.forms)) return { error: `Level ${n} has no list of forms.` };
    if (level.forms.length > LIMITS.forms) return { error: `Level ${n} has ${level.forms.length} forms; the limit is ${LIMITS.forms}.` };
    const forms = [];
    for (const [j, form] of level.forms.entries()) {
      const where = `Form ${j + 1} in level ${n}`;
      if (!form || typeof form !== 'object' || Array.isArray(form)) return { error: `${where} is not readable.` };
      const hasLesson = Object.hasOwn(form, 'lesson'), hasName = Object.hasOwn(form, 'name');
      if (hasLesson === hasName) return { error: `${where} needs either a lesson or a name.` };
      if (hasLesson) {
        if (typeof form.lesson !== 'string' || !LESSONS.has(form.lesson)) return { error: `${where} names a lesson TKDflow doesn’t have.` };
        forms.push({ id: idFor(form.id), kind: 'lesson', lesson: form.lesson });
      } else {
        if (typeof form.name !== 'string') return { error: `${where} has no name.` };
        if (tooLong(form.name, LIMITS.name)) return { error: `${where} has a name longer than ${LIMITS.name} characters.` };
        const name = cleanText(form.name, LIMITS.name);
        if (!name) return { error: `${where} has no name.` };
        forms.push({ id: idFor(form.id), kind: 'custom', name });
      }
    }
    out.push({ id: idFor(level.id), label, forms });
  }
  return { list: { levels: out } };
}

/* ---------- export / import ---------- */

const plainLevels = (list, { ids = false } = {}) => list.levels.map((l) => ({
  ...(ids ? { id: l.id } : {}),
  label: l.label,
  forms: l.forms.map((f) => ({ ...(ids ? { id: f.id } : {}), ...(f.kind === 'lesson' ? { lesson: f.lesson } : { name: f.name }) })),
}));

/** The exported file: the visitor's labels and forms only (no ids, dates or
 *  anything about the visitor). */
export const exportText = (list) => `${JSON.stringify({ app: APP, version: VERSION, levels: plainLevels(list) }, null, 1)}\n`;

/** Parse an imported file's text. Returns { list } or { error } (a short,
 *  safe sentence that never repeats the file's content). */
export function parseImport(text) {
  if (typeof text !== 'string') return { error: 'The file could not be read.' };
  if (text.length > MAX_IMPORT_BYTES) return { error: 'The file is too large to be a TKDflow list.' };
  let data;
  try { data = JSON.parse(text); } catch { return { error: 'The file is not a TKDflow list (it isn’t valid JSON).' }; }
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.app !== APP) return { error: 'The file is not a TKDflow school forms list.' };
  if (data.version !== VERSION) return { error: 'The file was made by a different version of this page.' };
  return validateLevels(data.levels);
}

/* ---------- storage ---------- */

/**
 * Browser-only store with change detection between tabs.
 * The stored value carries `rev`, raised on every save. Before writing, the
 * store re-reads storage; if another tab saved since this one last loaded or
 * wrote, it does NOT write and reports a conflict, so the page can ask which
 * version to keep. state: 'ok' | 'unavailable' (memory only) | 'corrupt'
 * (unreadable data, left untouched until the visitor changes something).
 */
export function createPlannerStore(source = () => globalThis.localStorage) {
  const storage = () => { const s = typeof source === 'function' ? source() : source; if (!s) throw new Error('No storage'); return s; };
  let state = 'ok', knownRaw = null, knownRev = 0;

  function parse(raw) {
    if (raw === null || raw === undefined) return { list: emptyList(), rev: 0, empty: true };
    try {
      const data = JSON.parse(raw);
      if (!data || data.version !== VERSION || !Number.isSafeInteger(data.rev) || data.rev < 0) throw new Error('shape');
      const result = validateLevels(data.levels, { keepIds: true });
      if (result.error) throw new Error('shape');
      return { list: result.list, rev: data.rev };
    } catch { return { corrupt: true }; }
  }
  function readRaw() { return storage().getItem(STORAGE_KEY); }
  function write(list, rev) {
    const raw = JSON.stringify({ version: VERSION, rev, levels: plainLevels(list, { ids: true }) });
    storage().setItem(STORAGE_KEY, raw);
    knownRaw = raw; knownRev = rev; state = 'ok';
  }
  return {
    get state() { return state; },
    /** Read the saved list (or an empty one). */
    load() {
      let raw;
      try { raw = readRaw(); } catch { state = 'unavailable'; return { list: emptyList(), state }; }
      knownRaw = raw;
      const parsed = parse(raw);
      if (parsed.corrupt) { state = 'corrupt'; knownRev = 0; return { list: emptyList(), state }; }
      state = 'ok'; knownRev = parsed.rev;
      return { list: parsed.list, state };
    },
    /** Save unless another tab saved first. Returns { saved: true },
     *  { saved: false, memory: true } (storage unavailable) or
     *  { saved: false, conflict: { list } }. */
    save(list) {
      if (state === 'unavailable') return { saved: false, memory: true };
      let raw;
      try { raw = readRaw(); } catch { state = 'unavailable'; return { saved: false, memory: true }; }
      if (raw !== knownRaw) {
        const other = parse(raw);
        // Changed elsewhere since this tab last read or wrote it.
        if (!other.corrupt) return { saved: false, conflict: { list: other.list, rev: other.rev } };
      }
      const current = parse(raw);
      try { write(list, Math.max(knownRev, current.rev || 0) + 1); } catch { state = 'unavailable'; return { saved: false, memory: true }; }
      return { saved: true };
    },
    /** "Keep this tab's version": replace whatever is saved. */
    replace(list) {
      if (state === 'unavailable') return { saved: false, memory: true };
      let current = { rev: 0 };
      try { current = parse(readRaw()); } catch { state = 'unavailable'; return { saved: false, memory: true }; }
      try { write(list, Math.max(knownRev, current.rev || 0) + 1); } catch { state = 'unavailable'; return { saved: false, memory: true }; }
      return { saved: true };
    },
    /** A `storage` event's new value: what another tab saved, or null if it
     *  is unreadable or the same as what this tab already has. */
    external(raw) {
      if (raw === knownRaw) return null;
      const other = parse(raw);
      return other.corrupt ? null : { list: other.list, rev: other.rev, raw };
    },
    /** "Load the other tab's version": adopt what is saved now. */
    reload() {
      let raw;
      try { raw = readRaw(); } catch { state = 'unavailable'; return { list: null, state }; }
      const parsed = parse(raw);
      if (parsed.corrupt) return { list: null, state };
      knownRaw = raw; knownRev = parsed.rev; state = 'ok';
      return { list: parsed.list, state };
    },
  };
}

export function storageMessage(state) {
  if (state === 'unavailable') return 'This browser isn’t letting the page save, so your list lasts only until you leave or reload this page. Use Export to keep a copy.';
  if (state === 'corrupt') return 'The list saved in this browser couldn’t be read, so the page started empty. It is left as it is until you add something, which replaces it.';
  return 'Saved in this browser on this device only.';
}
