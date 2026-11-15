/* Safe DOM helpers.
   Rule for this codebase: text that comes from data files, URLs or users is
   ALWAYS inserted with textContent (via h()) — never concatenated into
   innerHTML. Only validated values may reach style or class attributes. */

/**
 * Create an element. `attrs` keys:
 *   class, text, html:false (never supported), dataset {}, style (validated
 *   object of CSS properties), on {event: handler}, and any other attribute.
 * Children may be strings (inserted as text), Nodes, arrays, null/false.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = String(value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style') {
      for (const [prop, v] of Object.entries(value)) if (v != null) el.style.setProperty(prop, v);
    } else if (key === 'on') {
      for (const [evt, fn] of Object.entries(value)) el.addEventListener(evt, fn);
    } else if (key === 'html') {
      throw new Error('h(): raw HTML is not allowed');
    } else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Replace all children of `el`. */
export function replaceChildren(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

/** Escape text for the rare case a string template is unavoidable. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const GRADIENT_RE = /^linear-gradient\(\s*\d{1,3}deg\s*(,\s*#[0-9a-fA-F]{3,8}\s*(\d{1,3}%\s*)?){2,4}\)$/;
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

/** Allow only simple linear gradients made of hex colours (no url(), no var()). */
export function safeGradient(value, fallback = '') {
  return typeof value === 'string' && GRADIENT_RE.test(value.trim()) ? value.trim() : fallback;
}

export function safeColor(value, fallback = '') {
  return typeof value === 'string' && COLOR_RE.test(value.trim()) ? value.trim() : fallback;
}

/** Allow only class names from an explicit list. */
export function safeClass(value, allowed, fallback = '') {
  return allowed.includes(value) ? value : fallback;
}

export const BADGE_CLASSES = ['badge-red', 'badge-gold', 'badge-navy', 'badge-green', 'badge-dark'];

/** Allow only https: (or same-site relative) links. */
export function safeHref(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim();
  if (/^[a-z0-9][a-z0-9-]*\.html(#[\w-]+)?$/i.test(v)) return v; // local page
  try {
    const url = new URL(v);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
