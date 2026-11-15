/* DOM helpers for the profile fields used on auth.html and profile.html.
   Field ids follow `${prefix}-${field}`; each field has a matching
   `${prefix}-${field}-error` element referenced by aria-describedby. */
import { BELT_LEVELS } from './belts.js';
import { NEW_SCHOOL } from './profile-model.js';
import { h } from './dom.js';

export function populateBelts(select, current = '') {
  select.replaceChildren(h('option', { value: '' }, 'Select belt…'));
  for (const b of BELT_LEVELS) select.append(h('option', { value: b }, b));
  if (current && !BELT_LEVELS.includes(current)) {
    // keep a legacy stored value visible instead of silently clearing it
    select.append(h('option', { value: current }, `${current} (no longer listed)`));
  }
  select.value = current || '';
}

/**
 * Options for the school select (pure). `selection` is whatever the select
 * shows right now: '' (no school), NEW_SCHOOL (adding one), or a name.
 * A selected name missing from the list (unlisted, or the list failed) is
 * always kept, so saving another field can never erase it, and a list that
 * arrives late never overrides what the member has already chosen.
 */
export function schoolOptions(names, selection = '', { unavailable = false } = {}) {
  const list = [...new Set((names || []).filter((n) => typeof n === 'string' && n))].sort((a, b) => a.localeCompare(b));
  const value = selection ?? '';
  if (value && value !== NEW_SCHOOL && !list.includes(value)) list.unshift(value);
  return {
    value,
    options: [
      { value: '', label: unavailable ? 'No school (list unavailable — use “Add my school”)' : 'No school / prefer not to say' },
      ...list.map((n) => ({ value: n, label: n })),
      { value: NEW_SCHOOL, label: '+ Add my school…' },
    ],
  };
}

export function populateSchools(select, names, selection = '', opts) {
  const { value, options } = schoolOptions(names, selection, opts);
  select.replaceChildren(...options.map((o) => h('option', { value: o.value }, o.label)));
  select.value = value;
  select.dispatchEvent(new Event('tkd:schools-updated'));
}

/** Show the free-text field when "Add my school" is chosen. The typed value
 *  is never cleared by re-populating the list. */
export function wireNewSchool(select, wrap, input) {
  const sync = (focus) => {
    const show = select.value === NEW_SCHOOL;
    wrap.hidden = !show;
    input.required = show;
    if (show && focus) input.focus();
  };
  select.addEventListener('change', () => sync(true));
  select.addEventListener('tkd:schools-updated', () => sync(false));
  sync(false);
}

export function readProfileForm(prefix) {
  const v = (f) => document.getElementById(`${prefix}-${f}`)?.value ?? '';
  return {
    full_name: v('name'),
    username: v('username'),
    age: v('age'),
    belt_level: v('belt'),
    school_choice: v('school'),
    school_new: v('school-new'),
  };
}

const FIELD_IDS = { full_name: 'name', username: 'username', age: 'age', belt_level: 'belt', school_name: 'school' };

/** Show per-field errors; returns the first invalid input (for focus). */
export function showFieldErrors(prefix, errors) {
  let first = null;
  for (const [field, id] of Object.entries(FIELD_IDS)) {
    const input = document.getElementById(`${prefix}-${id}`);
    const msg = document.getElementById(`${prefix}-${id}-error`);
    if (!input || !msg) continue;
    const text = errors[field];
    msg.textContent = text || '';
    msg.hidden = !text;
    if (text) {
      input.setAttribute('aria-invalid', 'true');
      first ||= input;
    } else {
      input.removeAttribute('aria-invalid');
    }
  }
  return first;
}

/** A status line that is visible AND announced. One mechanism: `hidden`. */
export function createStatus(el) {
  return {
    show(text, type = 'info') {
      el.className = `form-status ${type}`;
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');
      el.textContent = text;
      el.hidden = false;
    },
    clear() {
      el.hidden = true;
      el.textContent = '';
    },
  };
}

/** Run an async action with a busy button that is always restored.
 *  Callers pass actions built from bounded operations (account-ops.js), so
 *  `fn` always settles and the finally block always runs. */
export async function withBusy(button, busyLabel, fn) {
  const label = button.textContent;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.textContent = busyLabel;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.textContent = label;
  }
}
