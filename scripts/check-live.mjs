#!/usr/bin/env node
/* Manual, read-only check of a deployed TKDflow site.

   Usage:
     npm run check:live -- --csp report-only                       (current live baseline)
     npm run check:live -- --csp enforced --base https://<preview>  (proposed enforced policy)
     … --json evidence.json   write structured results (no response bodies)

   What it does: plain GET requests (no cookies, credentials, tokens or
   bypass headers), each bounded by a timeout that also covers reading the
   body, and a body-size cap. Remote JavaScript is never evaluated; the
   accounts-off check reads js/config.js as text. Selected expectations (page titles,
   header values, CSP policy) come from THIS checkout, so the result says
   whether selected deployment checks match this checkout; it is not a full source-integrity attestation.
   Exit codes: 0 all checks pass, 1 a check failed, 2 usage error.
   Nothing is scheduled; run it by hand after a deployment. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findPrivilegedKeys } from '../js/lib/key-check.js';

const ROOT = new URL('..', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');

export const LIMITS = Object.freeze({ timeoutMs: 10_000, maxBytes: 2_000_000, concurrency: 4 });
export const CSP_MODES = Object.freeze({ enforced: 'content-security-policy', 'report-only': 'content-security-policy-report-only' });
export const MISSING_PATH = '/tkdflow-live-check-missing-page';

export class LiveError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

/** Accept an https origin (or http on loopback) with no credentials, path, query or fragment. */
export function parseBase(raw) {
  let u;
  try { u = new URL(raw); } catch { return { error: 'base must be an absolute URL' }; }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && loopback)) return { error: 'base must use https (http only for localhost)' };
  if (u.username || u.password) return { error: 'base must not contain credentials' };
  if ((u.pathname !== '/' && u.pathname !== '') || u.search || u.hash) return { error: 'base must be an origin only, e.g. https://tkdflow.com' };
  return { origin: u.origin };
}

/**
 * GET with one deadline covering the response AND the body, and a size cap.
 * Redirects are not followed. Resolves { status, headers, body: Buffer } or
 * throws LiveError('timeout' | 'network' | 'too-large').
 */
export async function fetchBounded(url, { fetchImpl = fetch, timeoutMs = LIMITS.timeoutMs, maxBytes = LIMITS.maxBytes } = {}) {
  const ctrl = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { ctrl.abort(); reject(new LiveError('timeout', `no complete response within ${timeoutMs} ms`)); }, timeoutMs);
  });
  const work = (async () => {
    let res;
    try {
      res = await fetchImpl(url, { method: 'GET', redirect: 'manual', signal: ctrl.signal, credentials: 'omit', headers: { 'user-agent': 'tkdflow-live-check' } });
    } catch (e) {
      if (e instanceof LiveError) throw e;
      throw new LiveError('network', 'request failed');
    }
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) { ctrl.abort(); throw new LiveError('too-large', `body over ${maxBytes} bytes`); }
    const chunks = []; let size = 0;
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { ctrl.abort(); throw new LiveError('too-large', `body over ${maxBytes} bytes`); }
          chunks.push(Buffer.from(value));
        }
      } catch (e) {
        if (e instanceof LiveError) throw e;
        throw new LiveError('network', 'body could not be read');
      }
    }
    return { status: res.status, headers: res.headers, body: Buffer.concat(chunks) };
  })();
  work.catch(() => {}); // the deadline may win; avoid an unhandled rejection
  try { return await Promise.race([work, deadline]); } finally { clearTimeout(timer); }
}

/* ── expectations from this checkout ── */

const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;

export function loadExpectations() {
  const manifest = JSON.parse(read('layout/pages.json'));
  const vercel = JSON.parse(read('vercel.json'));
  const rule = vercel.headers.find((r) => r.source === '/(.*)');
  const headers = {};
  let policy = null;
  for (const { key, value } of rule.headers) {
    if (/^content-security-policy/i.test(key)) policy = value;
    else headers[key.toLowerCase()] = value;
  }
  const pages = manifest.pages.filter((p) => p.key !== '404').map((p) => ({ path: p.path, title: titleOf(read(p.file)) }));
  return { pages, notFoundTitle: titleOf(read('404.html')), headers, policy };
}

/* ── individual checks: each returns null (pass) or a short reason ── */

const type = (r) => (r.headers.get('content-type') || '').toLowerCase();

export function checkHtmlPage(r, expectedTitle, expectedStatus = 200) {
  if (r.status !== expectedStatus) return `status ${r.status}, expected ${expectedStatus}`;
  if (!type(r).startsWith('text/html')) return `content-type "${type(r) || 'missing'}", expected text/html`;
  const html = r.body.toString('utf8');
  const title = titleOf(html);
  if (title !== expectedTitle) return title === null ? 'no <title> (not a TKDflow page)' : 'unexpected page title (wrong or substitute page)';
  if (!/<main id="main"/.test(html)) return 'no <main id="main"> landmark';
  return null;
}

export function checkSecurityHeaders(r, { headers, policy }, cspMode) {
  const problems = [];
  for (const [name, value] of Object.entries(headers)) {
    const got = r.headers.get(name);
    if (got === null) problems.push(`${name} missing`);
    else if (got !== value) problems.push(`${name} differs from vercel.json`);
  }
  const want = CSP_MODES[cspMode];
  const other = Object.values(CSP_MODES).find((n) => n !== want);
  const got = r.headers.get(want);
  if (got === null) problems.push(`${want} missing${r.headers.get(other) !== null ? ` (got ${other})` : ''}`);
  else if (got.replace(/\s+/g, ' ').trim() !== policy.replace(/\s+/g, ' ').trim()) problems.push(`${want} policy differs from vercel.json`);
  if (got !== null && r.headers.get(other) !== null) problems.push(`both CSP headers sent`);
  return problems.length ? problems.join('; ') : null;
}

export function checkRedirect(r, base) {
  if (r.status !== 308 && r.status !== 301) return `status ${r.status}, expected a permanent redirect`;
  const loc = r.headers.get('location');
  if (!loc) return 'redirect without a Location header';
  let target;
  try { target = new URL(loc, `${base}/index.html`); } catch { return 'malformed Location header'; }
  if (target.origin !== base || target.pathname !== '/' || target.search) return 'redirects somewhere other than /';
  return null;
}

function jsonCheck(shape) {
  return (r) => {
    if (r.status !== 200) return `status ${r.status}, expected 200`;
    if (!type(r).startsWith('application/json')) return `content-type "${type(r) || 'missing'}", expected application/json`;
    let data;
    try { data = JSON.parse(r.body.toString('utf8')); } catch { return 'body is not valid JSON'; }
    return shape(data) ? null : 'JSON has an unexpected shape';
  };
}

function assetCheck(typeRe, bodyOk, what) {
  return (r) => {
    if (r.status !== 200) return `status ${r.status}, expected 200`;
    if (!typeRe.test(type(r))) return `content-type "${type(r) || 'missing'}", expected ${what}`;
    return bodyOk(r.body) ? null : `body is not a valid ${what}`;
  };
}

const isPng1200x630 = (b) => b.length > 24 && b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
  && b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630;
const isIco = (b) => b.length > 6 && b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1;

/** Read js/config.js as TEXT (never executed) and confirm accounts, sign-up and Google are off. */
export function checkAccountsOff(r) {
  if (r.status !== 200) return `status ${r.status}, expected 200`;
  if (!/javascript/.test(type(r))) return `content-type "${type(r) || 'missing'}", expected JavaScript`;
  const src = r.body.toString('utf8');
  if (findPrivilegedKeys(src).length) return 'a privileged Supabase key is present';
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const block = code.match(/export const ACCOUNTS = Object\.freeze\(\{([\s\S]*?)\n\}\);/)?.[1];
  if (!block) return 'ACCOUNTS settings not found (cannot confirm accounts are off)';
  const required = {
    enabled: /^\s*enabled:\s*false,/m,
    signupEnabled: /^\s*signupEnabled:\s*false,/m,
    googleEnabled: /^\s*googleEnabled:\s*false,/m,
    supabaseUrl: /^\s*supabaseUrl:\s*'',/m,
    supabaseAnonKey: /^\s*supabaseAnonKey:\s*'',/m,
  };
  const off = Object.entries(required).filter(([, re]) => !re.test(block)).map(([k]) => k);
  if (off.length) return `not confirmed off/empty: ${off.join(', ')}`;
  // This static site serves the reviewed file verbatim. Exact comparison also
  // catches duplicate/computed properties, spreads and appended code without
  // pretending that a few regular expressions are a JavaScript parser.
  if (!r.body.equals(Buffer.from(read('js/config.js')))) return 'account settings source differs from the reviewed file';
  return null;
}

/** The full list of checks for one run. */
export function buildChecks(base, cspMode, exp = loadExpectations()) {
  const checks = exp.pages.map((p) => ({ name: `page ${p.path}`, path: p.path, check: (r) => checkHtmlPage(r, p.title) }));
  checks.push(
    { name: 'headers /', path: '/', check: (r) => checkSecurityHeaders(r, exp, cspMode) },
    { name: 'headers on 404', path: MISSING_PATH, check: (r) => checkSecurityHeaders(r, exp, cspMode) },
    { name: 'branded 404', path: MISSING_PATH, check: (r) => checkHtmlPage(r, exp.notFoundTitle, 404) },
    { name: 'redirect /index.html → /', path: '/index.html', check: (r) => checkRedirect(r, base) },
    { name: 'accounts off (js/config.js)', path: '/js/config.js', check: checkAccountsOff },
    { name: 'sitemap.xml', path: '/sitemap.xml', check: assetCheck(/xml/, (b) => /<urlset[\s>]/.test(b.toString('utf8')), 'XML sitemap') },
    { name: 'robots.txt', path: '/robots.txt', check: assetCheck(/^text\/plain/, (b) => /^Sitemap:\s*https:\/\//m.test(b.toString('utf8')), 'robots.txt') },
    { name: 'favicon.ico', path: '/favicon.ico', check: assetCheck(/^image\/(x-icon|vnd\.microsoft\.icon)/, isIco, 'ICO image') },
    { name: 'favicon.svg', path: '/favicon.svg', check: assetCheck(/^image\/svg\+xml/, (b) => /<svg[\s>]/.test(b.toString('utf8')), 'SVG image') },
    { name: 'og-image.png', path: '/assets/og-image.png', check: assetCheck(/^image\/png/, isPng1200x630, '1200×630 PNG') },
    { name: 'styles.css', path: '/styles.css', check: assetCheck(/^text\/css/, (b) => b.length > 0, 'stylesheet') },
    { name: 'js/site.js', path: '/js/site.js', check: assetCheck(/javascript/, (b) => b.length > 0, 'JavaScript file') },
    { name: 'data/forms.json', path: '/data/forms.json', check: jsonCheck((d) => Array.isArray(d) && d.length > 0) },
    { name: 'data/competitions.json', path: '/data/competitions.json', check: jsonCheck((d) => d && Array.isArray(d.events)) },
    { name: 'data/forum.json', path: '/data/forum.json', check: jsonCheck((d) => d && Array.isArray(d.categories)) },
    { name: 'data/community.json', path: '/data/community.json', check: jsonCheck((d) => d && Array.isArray(d.posts)) },
  );
  return checks;
}

/** Run every check; one request per distinct path. Always resolves. */
export async function runLiveChecks({ base, cspMode, fetchImpl = fetch, timeoutMs = LIMITS.timeoutMs, maxBytes = LIMITS.maxBytes, expectations } = {}) {
  const checks = buildChecks(base, cspMode, expectations);
  const paths = [...new Set(checks.map((c) => c.path))];
  const responses = new Map();
  let next = 0;
  const worker = async () => {
    while (next < paths.length) {
      const path = paths[next++];
      try { responses.set(path, await fetchBounded(base + path, { fetchImpl, timeoutMs, maxBytes })); } catch (e) {
        responses.set(path, { error: e instanceof LiveError ? e : new LiveError('network', 'request failed') });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(LIMITS.concurrency, paths.length) }, worker));
  const results = checks.map(({ name, path, check }) => {
    const r = responses.get(path);
    if (r.error) return { name, path, ok: false, status: null, detail: `${r.error.kind}: ${r.error.message}` };
    let detail;
    try { detail = check(r); } catch { detail = 'response could not be checked (malformed)'; }
    return { name, path, ok: detail === null, status: r.status, detail: detail ?? 'ok' };
  });
  const failed = results.filter((x) => !x.ok).length;
  return { base, cspMode, checkedAt: new Date().toISOString(), passed: results.length - failed, failed, results };
}

/** Plain-text report; details are fixed strings, never response bodies. */
export function formatReport(summary) {
  const clean = (s) => String(s).replace(/[^\x20-\x7E→×]/g, '?').slice(0, 160);
  const lines = summary.results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${clean(r.name)}${r.ok ? '' : ` — ${clean(r.detail)}`}`);
  lines.push(`${summary.failed ? 'FAILED' : 'OK'}: ${summary.passed}/${summary.results.length} checks passed for ${summary.base} (CSP expected: ${summary.cspMode}).`);
  return lines.join('\n');
}

export function parseArgs(argv) {
  const opts = { base: 'https://tkdflow.com', cspMode: null, json: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') opts.base = argv[++i];
    else if (a === '--csp') opts.cspMode = argv[++i];
    else if (a === '--json') opts.json = argv[++i];
    else return { error: `unknown argument ${a}` };
  }
  if (!Object.keys(CSP_MODES).includes(opts.cspMode)) return { error: '--csp must be "enforced" or "report-only" (say which policy the deployment should have)' };
  if (opts.json !== null && !opts.json) return { error: '--json needs a file path' };
  const base = parseBase(opts.base ?? '');
  if (base.error) return { error: base.error };
  return { ...opts, base: base.origin };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.error) {
    console.error(`check:live: ${opts.error}\nUsage: npm run check:live -- --csp report-only|enforced [--base https://tkdflow.com] [--json file]`);
    process.exit(2);
  }
  const summary = await runLiveChecks({ base: opts.base, cspMode: opts.cspMode });
  console.log(formatReport(summary));
  if (opts.json) writeFileSync(opts.json, `${JSON.stringify(summary, null, 2)}\n`);
  process.exit(summary.failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
