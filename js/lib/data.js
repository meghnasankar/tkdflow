/* Data loading with explicit loading / error / retry states. */
import { h, replaceChildren } from './dom.js';

export class DataError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // 'http' | 'timeout' | 'network' | 'size' | 'parse' | 'shape'
  }
}

/**
 * Fetch and validate a JSON file.
 * @param {string} url
 * @param {{validate?: (data:any)=>string|null, timeoutMs?: number, maxLength?: number, fetchImpl?: typeof fetch}} opts
 *   validate returns null when valid, or a description of the problem.
 *   maxLength (optional) bounds the response: a larger declared Content-Length
 *   is refused before the body is read, and a longer body before parsing.
 */
export async function loadJSON(url, { validate, timeoutMs = 10000, maxLength, fetchImpl = globalThis.fetch } = {}) {
  const controller = new AbortController();
  let timer;
  // One deadline covers the whole exchange: headers AND body download/parse.
  // The abort cancels the fetch/body stream; the race guarantees we stop
  // waiting even if an implementation ignores the signal.
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new DataError('The request timed out.', 'timeout'));
    }, timeoutMs);
  });

  const exchange = (async () => {
    let res;
    try {
      res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    } catch (err) {
      if (err?.name === 'AbortError') throw new DataError('The request timed out.', 'timeout');
      throw new DataError('The network request failed.', 'network');
    }
    if (!res.ok) throw new DataError(`The server responded with ${res.status}.`, 'http');
    const tooLarge = () => new DataError('The data file is larger than expected.', 'size');
    if (maxLength && Number(res.headers?.get?.('content-length')) > maxLength) {
      try { controller.abort(); } catch { /* already finished */ }
      throw tooLarge();
    }
    let text;
    try {
      text = await res.text();
    } catch (err) {
      if (err?.name === 'AbortError') throw new DataError('The request timed out.', 'timeout');
      throw new DataError('The data download was interrupted.', 'network');
    }
    if (maxLength && text.length > maxLength) throw tooLarge();
    try {
      return JSON.parse(text);
    } catch {
      throw new DataError('The data file is not valid JSON.', 'parse');
    }
  })();

  let data;
  try {
    data = await Promise.race([exchange, deadline]);
  } finally {
    clearTimeout(timer);
    exchange.catch(() => {}); // the losing branch must not surface as unhandled
  }
  const problem = validate ? validate(data) : null;
  if (problem) throw new DataError(`The data file has an unexpected format (${problem}).`, 'shape');
  return data;
}

/** Validation helper: every item has the listed keys of the listed types. */
export function requireArrayOf(fields) {
  return (data) => {
    if (!Array.isArray(data)) return 'expected a list';
    for (const [i, item] of data.entries()) {
      if (!item || typeof item !== 'object') return `item ${i} is not an object`;
      for (const [key, type] of Object.entries(fields)) {
        const v = item[key];
        const ok = type === 'array' ? Array.isArray(v) : typeof v === type;
        if (!ok) return `item ${i} field "${key}" should be ${type}`;
      }
    }
    return null;
  };
}

/** Render a polite loading message into `container`. */
export function showLoading(container, label = 'Loading…') {
  container.setAttribute('aria-busy', 'true');
  replaceChildren(container, h('p', { class: 'status-panel status-loading', role: 'status', text: label }));
}

/** Render an error message with a Retry button into `container`. */
export function showError(container, { title, error, onRetry }) {
  container.removeAttribute('aria-busy');
  const panel = h('div', { class: 'status-panel status-error', role: 'alert' },
    h('p', { class: 'status-title', text: title }),
    h('p', { text: error?.message || 'Something went wrong.' }),
    onRetry ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm', on: { click: onRetry } }, 'Try again') : null,
  );
  replaceChildren(container, panel);
}

export function showEmpty(container, message, ...actions) {
  container.removeAttribute('aria-busy');
  const shown = actions.filter(Boolean);
  replaceChildren(container, h('div', { class: 'status-panel status-empty' }, h('p', { text: message }),
    shown.length > 1 ? h('p', { class: 'status-actions' }, ...shown.flatMap((a, i) => (i ? [' ', a] : [a]))) : shown[0] || null));
}

/** Load a dataset into a container, handling loading, error and retry. */
export async function loadInto(container, url, { title, validate, onData }) {
  const attempt = async () => {
    showLoading(container);
    try {
      const data = await loadJSON(url, { validate });
      container.removeAttribute('aria-busy');
      onData(data);
      return data;
    } catch (error) {
      showError(container, { title, error, onRetry: attempt });
      return null;
    }
  };
  return attempt();
}
