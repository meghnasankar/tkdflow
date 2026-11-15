/* Live-site checker. The "deployment" is the local preview server serving
   this checkout, so a passing run proves the checks are not false alarms;
   each negative case swaps in one faulty response. No network access. */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createPreviewServer } from '../scripts/serve.mjs';
import {
  parseBase, parseArgs, fetchBounded, runLiveChecks, formatReport, MISSING_PATH, LiveError,
} from '../scripts/check-live.mjs';

let enforced; let reportOnly; let base; let roBase;

before(async () => {
  enforced = await createPreviewServer();
  reportOnly = await createPreviewServer({ reportOnly: true });
  await Promise.all([enforced, reportOnly].map((s) => new Promise((r) => s.listen(0, '127.0.0.1', r))));
  base = `http://127.0.0.1:${enforced.address().port}`;
  roBase = `http://127.0.0.1:${reportOnly.address().port}`;
});
after(() => { enforced?.close(); reportOnly?.close(); });

/** Real responses from the preview server, except the overridden paths. */
function faulty(overrides) {
  return (url, opts) => {
    const path = new URL(url).pathname;
    const o = overrides[path];
    return o ? o(url, opts) : fetch(url, opts);
  };
}
/** A copy of the real response for `path` with headers/body/status changed. */
const tweak = (change) => async (url, opts) => {
  const real = await fetch(url, opts);
  const headers = new Headers(real.headers);
  const body = Buffer.from(await real.arrayBuffer());
  const out = change({ status: real.status, headers, body }) ?? { status: real.status, headers, body };
  return new Response(out.body, { status: out.status, headers: out.headers });
};
const html = (body, status = 200) => () => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
const failedNames = (s) => s.results.filter((r) => !r.ok).map((r) => r.name);
const detailOf = (s, name) => s.results.find((r) => r.name === name).detail;

describe('a correct deployment passes', () => {
  test('enforced preview passes every check when enforced CSP is expected', async () => {
    const s = await runLiveChecks({ base, cspMode: 'enforced' });
    assert.deepEqual(failedNames(s), [], formatReport(s));
    assert.ok(s.results.length >= 25);
  });

  test('report-only baseline passes when report-only is expected', async () => {
    const s = await runLiveChecks({ base: roBase, cspMode: 'report-only' });
    assert.deepEqual(failedNames(s), [], formatReport(s));
  });

  test('the CSP mode must match: enforced vs report-only are told apart both ways', async () => {
    const a = await runLiveChecks({ base: roBase, cspMode: 'enforced' });
    assert.deepEqual(failedNames(a), ['headers /', 'headers on 404']);
    assert.match(detailOf(a, 'headers /'), /content-security-policy missing \(got content-security-policy-report-only\)/);
    const b = await runLiveChecks({ base, cspMode: 'report-only' });
    assert.deepEqual(failedNames(b), ['headers /', 'headers on 404']);
  });
});

describe('real failures are reported', () => {
  test('bad status on a page, an asset and the 404 path', async () => {
    const s = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/forms.html': () => new Response('oops', { status: 500 }),
      '/assets/og-image.png': () => new Response('', { status: 404 }),
      [MISSING_PATH]: tweak((r) => ({ ...r, status: 200 })),
    }) });
    assert.match(detailOf(s, 'page /forms.html'), /status 500/);
    assert.match(detailOf(s, 'og-image.png'), /status 404/);
    assert.match(detailOf(s, 'branded 404'), /status 200, expected 404/);
  });

  test('missing or altered security headers', async () => {
    const s = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/': tweak(({ headers }) => {
        headers.delete('x-frame-options');
        headers.set('referrer-policy', 'unsafe-url');
        headers.set('content-security-policy', `${headers.get('content-security-policy')}; script-src 'unsafe-inline'`);
      }),
      [MISSING_PATH]: tweak(({ headers }) => { headers.set('content-security-policy-report-only', 'x'); }),
    }) });
    const d = detailOf(s, 'headers /');
    assert.match(d, /x-frame-options missing/);
    assert.match(d, /referrer-policy differs/);
    assert.match(d, /content-security-policy policy differs/);
    assert.match(detailOf(s, 'headers on 404'), /both CSP headers sent/);
  });

  test('false-positive HTML: substitute pages, SPA fallbacks and unbranded 404s are caught', async () => {
    const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const s = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/forms.html': html(home),                                   // fallback served the home page
      '/about.html': html('<html><title>Login – Vercel</title></html>'), // protection/login wall with 200
      '/data/forms.json': html(home),                              // SPA fallback instead of JSON
      [MISSING_PATH]: html('<h1>404: NOT_FOUND</h1>', 404),        // platform default 404
      '/robots.txt': html(home),
    }) });
    assert.match(detailOf(s, 'page /forms.html'), /unexpected page title/);
    assert.match(detailOf(s, 'page /about.html'), /unexpected page title/);
    assert.match(detailOf(s, 'data/forms.json'), /expected application\/json/);
    assert.match(detailOf(s, 'branded 404'), /no <title>/);
    assert.match(detailOf(s, 'robots.txt'), /expected text\/plain|robots/);
  });

  test('malformed responses: bad JSON, wrong image bytes, broken or foreign redirects', async () => {
    const s = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/data/competitions.json': () => new Response('{"events": [', { headers: { 'content-type': 'application/json' } }),
      '/data/forum.json': () => new Response('[]', { headers: { 'content-type': 'application/json' } }),
      '/assets/og-image.png': () => new Response('<svg/>', { headers: { 'content-type': 'image/png' } }),
      '/favicon.ico': () => new Response(Buffer.from('89504e470d0a1a0a00000000', 'hex'), { headers: { 'content-type': 'image/x-icon' } }),
      '/index.html': () => new Response(null, { status: 308 }),
    }) });
    assert.match(detailOf(s, 'data/competitions.json'), /not valid JSON/);
    assert.match(detailOf(s, 'data/forum.json'), /unexpected shape/);
    assert.match(detailOf(s, 'og-image.png'), /not a valid 1200×630 PNG/);
    assert.match(detailOf(s, 'favicon.ico'), /not a valid ICO/);
    assert.match(detailOf(s, 'redirect /index.html → /'), /without a Location/);
    const elsewhere = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/index.html': () => new Response(null, { status: 308, headers: { location: 'https://example.invalid/' } }),
    }) });
    assert.match(detailOf(elsewhere, 'redirect /index.html → /'), /somewhere other than \//);
    const temporary = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/index.html': () => new Response(null, { status: 302, headers: { location: '/' } }),
    }) });
    assert.match(detailOf(temporary, 'redirect /index.html → /'), /expected a permanent redirect/);
  });

  test('duplicate/computed account properties and appended code cannot masquerade as the reviewed config', async () => {
    for (const edit of [
      (s) => s.replace('  enabled: false,', '  enabled: false,\n  enabled: true,'),
      (s) => s.replace('  enabled: false,', "  enabled: false,\n  ['enabled']: true,"),
      (s) => s + '\nglobalThis.notTheReviewedFile = true;\n',
    ]) {
      const summary = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
        '/js/config.js': tweak(({ status, headers, body }) => ({ status, headers, body: Buffer.from(edit(body.toString('utf8'))) })),
      }) });
      assert.match(detailOf(summary, 'accounts off (js/config.js)'), /differs from the reviewed file/);
    }
  });

  test('accounts switched on, keys filled in, or a privileged key are failures; config is read as text only', async () => {
    const cfg = (edit) => tweak(({ status, headers, body }) => ({ status, headers, body: Buffer.from(edit(body.toString('utf8'))) }));
    const on = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/js/config.js': cfg((t) => t.replace('  enabled: false,', '  enabled: true,').replace("googleEnabled: false", 'googleEnabled: true')),
    }) });
    assert.match(detailOf(on, 'accounts off (js/config.js)'), /not confirmed off\/empty: enabled, googleEnabled/);
    const url = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/js/config.js': cfg((t) => t.replace("supabaseUrl: '',", "supabaseUrl: 'https://abc.supabase.co',")),
    }) });
    assert.match(detailOf(url, 'accounts off (js/config.js)'), /supabaseUrl/);
    // Synthetic secret-format key (same fixture style as key-check tests).
    const secret = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/js/config.js': cfg((t) => `${t}\n// sb_secret_${'x'.repeat(32)}\n`),
    }) });
    assert.match(detailOf(secret, 'accounts off (js/config.js)'), /privileged/);
    globalThis.__liveCheckRan = false;
    const evil = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/js/config.js': cfg(() => 'globalThis.__liveCheckRan = true;'),
    }) });
    assert.equal(globalThis.__liveCheckRan, false, 'remote JavaScript is never evaluated');
    assert.match(detailOf(evil, 'accounts off (js/config.js)'), /cannot confirm/);
  });
});

describe('bounded requests', () => {
  test('a request that never answers times out', async () => {
    const t0 = Date.now();
    await assert.rejects(fetchBounded('http://x.invalid/', { fetchImpl: () => new Promise(() => {}), timeoutMs: 50 }),
      (e) => e instanceof LiveError && e.kind === 'timeout');
    assert.ok(Date.now() - t0 < 1000);
  });

  test('headers that arrive but a body that never ends also times out', async () => {
    const stalled = () => Promise.resolve(new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([60])); } })));
    await assert.rejects(fetchBounded('http://x.invalid/', { fetchImpl: stalled, timeoutMs: 50 }), (e) => e.kind === 'timeout');
  });

  test('the abort signal reaches the request', async () => {
    let signal;
    const hang = (_u, opts) => { signal = opts.signal; return new Promise(() => {}); };
    await assert.rejects(fetchBounded('http://x.invalid/', { fetchImpl: hang, timeoutMs: 20 }));
    assert.equal(signal.aborted, true);
  });

  test('oversized bodies are cut off, declared or streamed', async () => {
    const declared = () => Promise.resolve(new Response('x', { headers: { 'content-length': '999999999' } }));
    await assert.rejects(fetchBounded('http://x.invalid/', { fetchImpl: declared, maxBytes: 1000 }), (e) => e.kind === 'too-large');
    const streamed = () => Promise.resolve(new Response(new ReadableStream({
      pull(c) { c.enqueue(new Uint8Array(4096)); },
    })));
    await assert.rejects(fetchBounded('http://x.invalid/', { fetchImpl: streamed, maxBytes: 10_000, timeoutMs: 2000 }), (e) => e.kind === 'too-large');
  });

  test('network errors and broken bodies become failures, not crashes, in a full run', async () => {
    const s = await runLiveChecks({ base, cspMode: 'enforced', timeoutMs: 200, fetchImpl: faulty({
      '/': () => Promise.reject(new TypeError('fetch failed')),
      '/styles.css': () => new Promise(() => {}),
      '/js/site.js': () => Promise.resolve(new Response(new ReadableStream({ pull(c) { c.error(new Error('reset')); } }))),
    }) });
    assert.match(detailOf(s, 'page /'), /^network:/);
    assert.match(detailOf(s, 'headers /'), /^network:/);
    assert.match(detailOf(s, 'styles.css'), /^timeout:/);
    assert.match(detailOf(s, 'js/site.js'), /^network:/);
    assert.equal(failedNames(s).length, 4);
  });

  test('redirects are not followed and no credentials are sent', async () => {
    let seen;
    await fetchBounded('http://x.invalid/', { fetchImpl: (_u, opts) => { seen = opts; return Promise.resolve(new Response('')); } });
    assert.equal(seen.redirect, 'manual');
    assert.equal(seen.credentials, 'omit');
    assert.equal(seen.method, 'GET');
    assert.deepEqual(Object.keys(seen.headers), ['user-agent']);
  });
});

describe('arguments and output', () => {
  test('base must be an https origin (http only on loopback), without credentials or paths', () => {
    assert.deepEqual(parseBase('https://tkdflow.com'), { origin: 'https://tkdflow.com' });
    assert.deepEqual(parseBase('https://tkdflow.com/'), { origin: 'https://tkdflow.com' });
    assert.deepEqual(parseBase('http://127.0.0.1:8901'), { origin: 'http://127.0.0.1:8901' });
    for (const bad of ['http://tkdflow.com', 'https://user:pw@tkdflow.com', 'https://tkdflow.com/forms.html', 'https://tkdflow.com/?x=1', 'ftp://tkdflow.com', 'tkdflow.com', '']) {
      assert.ok(parseBase(bad).error, bad);
    }
  });

  test('the CSP mode is mandatory and explicit; unknown arguments are refused', () => {
    assert.match(parseArgs([]).error, /--csp/);
    assert.match(parseArgs(['--csp', 'maybe']).error, /--csp/);
    for (const mode of ['constructor', 'toString', '__proto__']) assert.match(parseArgs(['--csp', mode]).error, /--csp/);
    assert.match(parseArgs(['--csp', 'enforced', '--token', 'x']).error, /unknown argument/);
    assert.deepEqual(parseArgs(['--csp', 'report-only']), { base: 'https://tkdflow.com', cspMode: 'report-only', json: null });
    assert.match(parseArgs(['--csp', 'enforced', '--json']).error, /--json/);
  });

  test('report never echoes response bodies', async () => {
    const s = await runLiveChecks({ base, cspMode: 'enforced', fetchImpl: faulty({
      '/forms.html': html('<title>SENSITIVE-BODY-MARKER</title>'),
      '/data/forms.json': () => new Response('SENSITIVE-BODY-MARKER', { headers: { 'content-type': 'application/json' } }),
    }) });
    const out = formatReport(s) + JSON.stringify(s);
    assert.doesNotMatch(out, /SENSITIVE-BODY-MARKER/);
    assert.match(formatReport(s), /^FAIL {2}page \/forms\.html — /m);
    assert.match(formatReport(s), /FAILED: \d+\/\d+ checks passed/);
  });

  test('CLI: exit 0 and JSON evidence on success, 1 on a real failure, 2 on bad usage', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tkd-live-'));
    const run = (args) => new Promise((resolve) => {
      const child = spawn(process.execPath, [new URL('../scripts/check-live.mjs', import.meta.url).pathname, ...args]);
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { out += d; });
      child.on('close', (code) => resolve({ code, out }));
    });
    try {
      const evidence = join(dir, 'evidence.json');
      const ok = await run(['--base', base, '--csp', 'enforced', '--json', evidence]);
      assert.equal(ok.code, 0, ok.out);
      assert.match(ok.out, /^OK: \d+\/\d+ checks passed/m);
      const doc = JSON.parse(readFileSync(evidence, 'utf8'));
      assert.equal(doc.failed, 0);
      assert.equal(doc.cspMode, 'enforced');
      assert.ok(doc.results.every((r) => r.ok && typeof r.status === 'number'));
      const wrongMode = await run(['--base', base, '--csp', 'report-only']);
      assert.equal(wrongMode.code, 1);
      assert.match(wrongMode.out, /FAIL {2}headers \//);
      const usage = await run(['--base', 'http://tkdflow.com', '--csp', 'enforced']);
      assert.equal(usage.code, 2);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
