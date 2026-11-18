/* My school's forms. A private list the visitor builds from their own belt or
   level names, saved only in this browser. The only request is the same-origin
   lesson list (data/forms.json) used for lesson names and links. No account,
   personal data or other network use. Text from the visitor or an imported
   file is only ever inserted as text. */
import { h, replaceChildren } from '../lib/dom.js';
import { loadJSON } from '../lib/data.js';
import { validateForms } from '../lib/validators.js';
import { ORGS } from '../lib/catalog.js';
import { keepFocus, findKey, focusTarget, setHidden } from '../lib/focus-keep.js';
import {
  STORAGE_KEY, EXPORT_NAME, MAX_IMPORT_BYTES, LIMITS, emptyList, formCount, countText,
  addLevel, renameLevel, moveLevel, removeLevel, addForm, moveForm, removeForm, restoreRemoved,
  exportText, parseImport, createPlannerStore, storageMessage,
} from '../lib/school-planner.js';

const $ = (id) => document.getElementById(id);
const app = $('sp-app'), levelsEl = $('sp-levels'), statusEl = $('sp-status'), undoBtn = $('sp-undo');
const store = createPlannerStore();
let lessons = new Map();
let list = emptyList();
let undo = null;            // { removed, name } for the latest removal only
let conflict = false;       // another tab saved; waiting for the visitor's choice
let importing = null;       // a validated list waiting for Replace / Cancel
let importToken = 0;

/* ---------- small helpers ---------- */

const levelOf = (id) => list.levels.find((l) => l.id === id);
const formName = (f) => (f.kind === 'lesson' ? lessons.get(f.lesson)?.name || 'Lesson unavailable' : f.name);
const say = (text) => { statusEl.textContent = text; };
function showStorage() {
  const el = $('sp-storage');
  el.textContent = storageMessage(store.state);
  el.classList.toggle('is-warn', store.state !== 'ok');
}
/** Uncommitted typing or choices inside the list (a rename, a typed form name, a chosen lesson),
 *  an import preview, or an open Clear confirmation (its count must not go stale under it). */
function editing() {
  if (importing || !$('sp-clear-confirm').hidden) return true;
  return [...levelsEl.querySelectorAll('input,select')].some((el) => el.value !== (el.dataset.default ?? ''));
}
function button(act, key, text, { level, form, labelledby, describedby, disabled = false, cls = 'btn btn-secondary btn-sm' } = {}) {
  const id = `sp-b-${key.replace(':', '-')}`;
  return h('button', {
    type: 'button', class: cls, id, 'data-fk': key, 'data-act': act, 'data-level': level, 'data-form': form,
    'aria-labelledby': `${id} ${labelledby}`, 'aria-describedby': describedby, 'aria-disabled': disabled ? 'true' : null,
  }, text);
}

/* ---------- render ---------- */

function lessonSelect(level) {
  const groups = ORGS.filter((o) => o.id !== 'all').map((o) => h('optgroup', { label: o.label },
    [...lessons.values()].filter((l) => l.style === o.id).map((l) => h('option', { value: l.id }, l.name))));
  return h('select', { id: `sp-al-${level.id}`, 'data-fk': `al:${level.id}`, 'data-default': '' }, h('option', { value: '' }, 'Choose a lesson'), groups);
}

function renderLevel(level, i, all) {
  const head = `sp-h-${level.id}`;
  const forms = level.forms.map((f, j) => {
    const nameId = `sp-n-${f.id}`;
    const lesson = f.kind === 'lesson' ? lessons.get(f.lesson) : null;
    const name = lesson
      ? h('span', { class: 'sp-form-name', id: nameId }, h('a', { href: lesson.href }, lesson.name), h('span', { class: 'sp-print-url' }, ` · tkdflow.com${lesson.href}`))
      : h('span', { class: 'sp-form-name', id: nameId }, formName(f));
    const meta = h('span', { class: 'sp-form-meta' }, lesson ? `${lesson.styleLabel} lesson` : f.kind === 'lesson' ? 'Lesson unavailable' : 'Your entry · no TKDflow lesson');
    return h('li', { class: 'sp-form', 'data-form': f.id }, name, meta, h('span', { class: 'sp-buttons' },
      button('fu', `fu:${f.id}`, 'Move up', { level: level.id, form: f.id, labelledby: nameId, describedby: head, disabled: j === 0 }),
      button('fd', `fd:${f.id}`, 'Move down', { level: level.id, form: f.id, labelledby: nameId, describedby: head, disabled: j === level.forms.length - 1 }),
      button('fr', `fr:${f.id}`, 'Remove', { level: level.id, form: f.id, labelledby: nameId, describedby: head })));
  });
  const full = level.forms.length >= LIMITS.forms;
  return h('li', { class: 'sp-level', 'data-level': level.id },
    h('div', { class: 'sp-level-head' },
      h('h3', { id: head, tabindex: '-1', 'data-fk': `h:${level.id}` }, level.label),
      h('span', { class: 'sp-buttons' },
        button('lu', `lu:${level.id}`, 'Move up', { level: level.id, labelledby: head, disabled: i === 0 }),
        button('ld', `ld:${level.id}`, 'Move down', { level: level.id, labelledby: head, disabled: i === all.length - 1 }),
        button('lr', `lr:${level.id}`, 'Remove', { level: level.id, labelledby: head }))),
    h('form', { class: 'sp-rename', 'data-act': 'rename', 'data-level': level.id },
      h('label', { for: `sp-rn-${level.id}` }, 'Rename this level'),
      h('div', { class: 'sp-row' },
        h('input', { type: 'text', id: `sp-rn-${level.id}`, maxlength: String(LIMITS.label), autocomplete: 'off', value: level.label, 'data-default': level.label, 'data-fk': `rn:${level.id}`, 'aria-describedby': `sp-err-${level.id}` }),
        h('button', { type: 'submit', class: 'btn btn-secondary btn-sm', 'data-fk': `rnb:${level.id}` }, 'Rename'))),
    level.forms.length ? h('ol', { class: 'sp-forms', 'aria-labelledby': head }, forms) : h('p', { class: 'sp-forms-empty' }, 'No forms in this level yet.'),
    h('div', { class: 'sp-add-form' },
      full ? h('p', { class: 'sp-forms-empty' }, `This level has the most forms a level can hold (${LIMITS.forms}).`) : [
        h('form', { 'data-act': 'add-lesson', 'data-level': level.id },
          h('label', { for: `sp-al-${level.id}` }, 'Add a TKDflow lesson'),
          h('div', { class: 'sp-row' }, lessonSelect(level), h('button', { type: 'submit', class: 'btn btn-secondary btn-sm', 'data-fk': `alb:${level.id}` }, 'Add lesson'))),
        h('form', { 'data-act': 'add-custom', 'data-level': level.id },
          h('label', { for: `sp-ac-${level.id}` }, 'Or type a form name from your school (no lesson link)'),
          h('div', { class: 'sp-row' },
            h('input', { type: 'text', id: `sp-ac-${level.id}`, maxlength: String(LIMITS.name), autocomplete: 'off', 'data-default': '', 'data-fk': `ac:${level.id}`, 'aria-describedby': `sp-err-${level.id}` }),
            h('button', { type: 'submit', class: 'btn btn-secondary btn-sm', 'data-fk': `acb:${level.id}` }, 'Add form'))),
      ],
      h('p', { class: 'sp-error', id: `sp-err-${level.id}`, hidden: true })));
}

/** Rebuild the list. Anything typed or chosen but not yet submitted in a
 *  level's fields (a rename, an own form name, a chosen lesson) is carried
 *  into the rebuilt fields by key, so changing one item never drops another
 *  draft. A submitted field is cleared by its handler before this runs. */
function render() {
  const drafts = [...levelsEl.querySelectorAll('input,select')]
    .filter((el) => el.value !== (el.dataset.default ?? ''))
    .map((el) => [el.dataset.fk, el.value]);
  keepFocus(levelsEl, () => {
    replaceChildren(levelsEl, ...list.levels.map(renderLevel));
    for (const [key, value] of drafts) { const el = findKey(levelsEl, key); if (el) el.value = value; }
  }, { fallback: () => $('sp-list-title') });
  $('sp-empty').hidden = list.levels.length > 0;
  $('sp-clear').setAttribute('aria-disabled', String(!list.levels.length));
}
function focusKey(key, fallback) {
  const el = findKey(levelsEl, key) || fallback;
  if (el) focusTarget(el);
}
function levelError(levelId, text) {
  const el = $(`sp-err-${levelId}`);
  if (el) { el.textContent = text; el.hidden = !text; }
}

/* ---------- change, save, conflict ---------- */

function setUndo(next) {
  undo = next;
  setHidden(undoBtn, !undo, statusEl);
}

/** An open Clear confirmation describes one version of the list; once the list
 *  changes (an edit here, or another tab's version loaded or replaced), close it
 *  so a later Yes can never clear a version the visitor didn't see counted. */
function dismissClear() {
  if (!$('sp-clear-confirm').hidden) setHidden($('sp-clear-confirm'), true, $('sp-clear'));
}

/** Apply a new list: save it (unless another tab saved first), render, report. */
function commit(next, { status = '', undo: offer = null, rerender = true } = {}) {
  dismissClear();
  list = next;
  const wasUnsaved = store.unsaved;
  const result = store.save(list);
  if (rerender) render();
  setUndo(offer);
  showStorage();
  // Focus stays where the visitor is working; the status and the notice explain.
  if (result.conflict) { showConflict(); say(`${status} Not saved yet: choose which version to keep above.`.trim()); return; }
  if (result.writeFailed) { say(`${status} Not saved in this browser: see the notice above.`.trim()); return; }
  say(result.saved && wasUnsaved ? `${status} Your earlier unsaved changes are now saved too.`.trim() : status);
}

function showConflict() {
  conflict = true;
  $('sp-conflict').hidden = false;
}
function hideConflict(target) {
  conflict = false;
  setHidden($('sp-conflict'), true, target);
}

$('sp-conflict-load').addEventListener('click', () => {
  const loaded = store.reload();
  if (!loaded.list) { showStorage(); say('The other version couldn’t be read, so this tab’s list is kept.'); return; }
  list = loaded.list; dismissClear();
  importing = null; $('sp-preview').hidden = true;
  render(); setUndo(null); showStorage();
  hideConflict($('sp-list-title'));
  focusTarget($('sp-list-title'));
  say('Loaded the version saved in the other tab. This tab’s unsaved list changes were replaced.');
});
$('sp-conflict-keep').addEventListener('click', () => {
  // Keep this tab's version, including a rename that is still being typed.
  // Applied in place: no rebuild, so a typed form name or chosen lesson stays.
  for (const input of [...levelsEl.querySelectorAll('.sp-rename input')]) {
    const levelId = input.id.replace('sp-rn-', '');
    const r = renameLevel(list, levelId, input.value);
    if (!r.list || r.unchanged) continue;
    list = r.list;
    const label = levelOf(levelId).label;
    input.value = label; input.dataset.default = label; input.setAttribute('value', label);
    $(`sp-h-${levelId}`).textContent = label;
  }
  const result = store.replace(list); dismissClear();
  showStorage();
  hideConflict(statusEl);
  focusTarget(statusEl);
  say(result.saved ? 'Kept this tab’s version. It replaced the other one.' : storageMessage(store.state));
});

window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY && e.key !== null) return;
  const other = store.external(e.newValue ?? null);
  if (!other) return;
  if (conflict || editing() || store.unsaved) {
    // Never replace what the visitor is in the middle of, or changes this tab
    // couldn't save yet; let them choose.
    showConflict();
    say(store.unsaved
      ? 'This list was changed in another tab while your latest changes here weren’t saved. They’re kept on this page; choose which version to keep.'
      : 'This list was changed in another tab. What you are typing is kept; choose which version to keep.');
    return;
  }
  const loaded = store.reload();
  if (!loaded.list) return;
  list = loaded.list; dismissClear();
  render(); setUndo(null); showStorage();
  say('Updated with changes made in another tab.');
});

/* ---------- editing ---------- */

$('sp-add-level').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('sp-level-name');
  const r = addLevel(list, input.value);
  if (r.error) { say(r.error); return; }
  input.value = '';
  commit(r.list, { status: `Added ${r.level.label} (level ${r.list.levels.length} of ${r.list.levels.length}).` });
});

levelsEl.addEventListener('click', (e) => {
  const btn = e.target.closest?.('button[data-act]');
  if (!btn || !levelsEl.contains(btn)) return;
  if (btn.getAttribute('aria-disabled') === 'true') return; // first or last already
  const { act, level: levelId, form: formId } = btn.dataset;
  const level = levelOf(levelId);
  if (!level) return;
  if (act === 'lu' || act === 'ld') {
    const r = moveLevel(list, levelId, act === 'lu' ? -1 : 1);
    if (r.unchanged) return;
    const pos = r.list.levels.findIndex((l) => l.id === levelId) + 1;
    commit(r.list, { status: `Moved ${level.label} to ${pos} of ${r.list.levels.length}.` });
    focusKey(`${act}:${levelId}`);
  } else if (act === 'lr') {
    const index = list.levels.indexOf(level);
    const r = removeLevel(list, levelId);
    const n = level.forms.length;
    commit(r.list, { status: `Removed ${level.label}${n ? ` and its ${n} form${n === 1 ? '' : 's'}` : ''}.`, undo: { removed: r.removed, name: level.label } });
    const next = r.list.levels[index] || r.list.levels[index - 1];
    focusKey(next ? `lr:${next.id}` : '', $('sp-level-name'));
  } else if (act === 'fu' || act === 'fd') {
    const r = moveForm(list, levelId, formId, act === 'fu' ? -1 : 1);
    if (r.unchanged) return;
    const forms = r.list.levels.find((l) => l.id === levelId).forms;
    const f = forms.find((x) => x.id === formId);
    commit(r.list, { status: `Moved ${formName(f)} to ${forms.indexOf(f) + 1} of ${forms.length} in ${level.label}.` });
    focusKey(`${act}:${formId}`);
  } else if (act === 'fr') {
    const f = level.forms.find((x) => x.id === formId);
    const index = level.forms.indexOf(f);
    const r = removeForm(list, levelId, formId);
    commit(r.list, { status: `Removed ${formName(f)} from ${level.label}.`, undo: { removed: r.removed, name: formName(f) } });
    const forms = r.list.levels.find((l) => l.id === levelId).forms;
    const next = forms[index] || forms[index - 1];
    focusKey(next ? `fr:${next.id}` : `al:${levelId}`, findKey(levelsEl, `h:${levelId}`));
  }
});

function rename(input, { fromSubmit = false } = {}) {
  const levelId = input.id.replace('sp-rn-', '');
  const level = levelOf(levelId);
  if (!level) return;
  const r = renameLevel(list, levelId, input.value);
  if (r.error) { levelError(levelId, r.error); if (fromSubmit) input.focus(); return; }
  levelError(levelId, '');
  if (r.unchanged) { input.value = level.label; return; }
  const label = r.list.levels.find((l) => l.id === levelId).label;
  // Update in place (no rebuild), so a click that caused this blur still lands.
  commit(r.list, { status: `Renamed ${level.label} to ${label}.`, rerender: false });
  input.value = label; input.dataset.default = label; input.setAttribute('value', label);
  const head = $(`sp-h-${levelId}`);
  if (head) head.textContent = label;
}
levelsEl.addEventListener('change', (e) => { if (e.target.matches?.('.sp-rename input')) rename(e.target); });

levelsEl.addEventListener('submit', (e) => {
  const formEl = e.target;
  e.preventDefault();
  const { act, level: levelId } = formEl.dataset;
  const level = levelOf(levelId);
  if (!level) return;
  if (act === 'rename') { rename(formEl.querySelector('input'), { fromSubmit: true }); return; }
  const field = formEl.querySelector(act === 'add-lesson' ? 'select' : 'input');
  const entry = act === 'add-lesson' ? { kind: 'lesson', lesson: field.value } : { kind: 'custom', name: field.value };
  const r = addForm(list, levelId, entry);
  if (r.error) { levelError(levelId, r.error); return; }
  field.value = '';
  commit(r.list, { status: `Added ${formName(r.form)} to ${level.label}.` });
});

undoBtn.addEventListener('click', () => {
  if (!undo) return;
  const r = restoreRemoved(list, undo.removed);
  if (r.error) { setUndo(null); say(`Couldn’t undo: ${r.error}`); return; }
  const name = undo.name;
  commit(r.list, { status: `Restored ${name}.` });
  focusKey(r.levelId ? `fr:${r.restored.id}` : `lr:${r.restored.id}`, $('sp-list-title'));
});

/* ---------- clear, print, export, import ---------- */

$('sp-clear').addEventListener('click', () => {
  if (!list.levels.length) { say('The list is already empty.'); return; }
  $('sp-clear-text').textContent = `Clear all ${countText(list.levels.length, formCount(list))}? This can’t be undone, but a copy you exported can be imported again.`;
  $('sp-clear-confirm').hidden = false;
  focusTarget($('sp-clear-text'));
});
$('sp-clear-yes').addEventListener('click', () => {
  setHidden($('sp-clear-confirm'), true, $('sp-level-name'));   // closed first, so focus goes to the add field
  commit(emptyList(), { status: 'List cleared.' });
  focusTarget($('sp-level-name'));
});
$('sp-clear-no').addEventListener('click', () => { setHidden($('sp-clear-confirm'), true, $('sp-clear')); focusTarget($('sp-clear')); });

$('sp-print').addEventListener('click', () => window.print());

$('sp-export').addEventListener('click', () => {
  if (!list.levels.length) { say('Nothing to export yet: add a level first.'); return; }
  const url = URL.createObjectURL(new Blob([exportText(list)], { type: 'application/json' }));
  const link = h('a', { href: url, download: EXPORT_NAME, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(`Exported ${countText(list.levels.length, formCount(list))}. Look for ${EXPORT_NAME} in your downloads.`);
});

const fileInput = $('sp-import-file');
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const token = ++importToken;
  const fail = (why) => { fileInput.value = ''; say(`That file couldn’t be imported: ${why}`); };
  if (!(file.size <= MAX_IMPORT_BYTES)) { fail('it is too large to be a TKDflow list.'); return; }
  let text;
  try { text = await file.text(); } catch { fail('it could not be read.'); return; }
  if (token !== importToken) return; // a newer file was chosen meanwhile
  const r = parseImport(text);
  if (r.error) { fail(r.error.charAt(0).toLowerCase() + r.error.slice(1)); return; }
  importing = r.list;
  const incoming = countText(r.list.levels.length, formCount(r.list));
  $('sp-preview-text').textContent = list.levels.length
    ? `Replace your list (${countText(list.levels.length, formCount(list))}) with the list in this file (${incoming})?`
    : `Use the list in this file (${incoming})?`;
  replaceChildren($('sp-preview-list'), ...r.list.levels.map((l) => h('li', {}, l.label,
    l.forms.length ? h('ul', {}, l.forms.map((f) => h('li', {}, f.kind === 'custom' ? `${f.name} (your entry)` : formName(f)))) : null)));
  $('sp-preview').hidden = false;
  focusTarget($('sp-preview-title'));
});
$('sp-preview-replace').addEventListener('click', () => {
  if (!importing) return;
  const next = importing;
  importing = null;
  fileInput.value = '';
  commit(next, { status: `Imported ${countText(next.levels.length, formCount(next))}.` });
  setHidden($('sp-preview'), true, $('sp-list-title'));
  focusTarget($('sp-list-title'));
});
$('sp-preview-cancel').addEventListener('click', () => {
  importing = null;
  fileInput.value = '';
  setHidden($('sp-preview'), true, fileInput);
  focusTarget(fileInput);
  say('Import cancelled. Your list is unchanged.');
});

/* ---------- start ---------- */

async function start() {
  $('sp-nojs').hidden = true;
  $('sp-loading').hidden = false;
  setHidden($('sp-load-error'), true, $('sp-loading')); // a focused Try again hands focus to the loading message
  try {
    const forms = await loadJSON('/data/forms.json', { validate: validateForms, timeoutMs: 8000 });
    const styles = new Map(ORGS.map((o) => [o.id, o.label]));
    lessons = new Map(forms.filter((f) => f.lessonUrl).map((f) => [f.id, { id: f.id, name: f.name, href: `/${f.lessonUrl}`, style: f.category, styleLabel: styles.get(f.category) || '' }]));
  } catch {
    $('sp-load-error').hidden = false;
    setHidden($('sp-loading'), true, $('sp-load-retry'));
    return;
  }
  list = store.load().list;
  render(); showStorage();
  app.hidden = false;
  setHidden($('sp-loading'), true, $('sp-list-title'));
}
$('sp-load-retry').addEventListener('click', start);
start();
