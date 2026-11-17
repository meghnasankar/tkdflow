/* Release checks over the shipped files (no browser needed). A release must
   not pass with a blank/broken script, a missing menu control, dead links,
   unlabeled fields, missing metadata, unsupported claims or unsafe config. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname } from 'node:path';
import { manifest, renderPage, renderSitemap } from '../scripts/sync-layout.mjs';
import { ACCOUNTS } from '../js/config.js';
import { validateForms, validateForum, validateCommunity, validateEvents } from '../js/lib/validators.js';
import { publicKeyProblem, findPrivilegedKeys } from '../js/lib/key-check.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const pages = manifest.pages.map((p) => ({ ...p, html: read(p.file) }));

function walk(dir, exts) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) return walk(rel, exts);
    return exts.includes(extname(name)) ? [rel] : [];
  });
}
const scripts = [...walk('js', ['.js']), ...walk('scripts', ['.mjs'])];

test('every HTML page in the repo is listed in layout/pages.json', () => {
  const listed = new Set(manifest.pages.map((p) => p.file));
  for (const f of readdirSync(ROOT).filter((f) => f.endsWith('.html'))) assert.ok(listed.has(f), `${f} missing from manifest`);
});

test('shared layout and sitemap are in sync (run: npm run sync)', () => {
  for (const p of pages) assert.equal(p.html, renderPage(p, p.html), `${p.file} layout is stale`);
  assert.equal(read('sitemap.xml'), renderSitemap());
});

test('every script parses', () => {
  for (const f of scripts) {
    try {
      execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' });
    } catch (e) {
      assert.fail(`${f} does not parse:\n${e.stderr}`);
    }
  }
});

test('no inline scripts, inline handlers, inline styles or raw HTML injection', () => {
  for (const p of pages) {
    assert.doesNotMatch(p.html, /<script(?![^>]*\bsrc=)[^>]*>/i, `${p.file} has an inline <script>`);
    assert.doesNotMatch(p.html, /\son[a-z]+\s*=/i, `${p.file} has an inline event handler`);
    assert.doesNotMatch(p.html, /\sstyle\s*=/i, `${p.file} has an inline style attribute`);
    assert.doesNotMatch(p.html, /<style[\s>]/i, `${p.file} has an inline <style> block`);
  }
  for (const f of scripts.filter((s) => s.startsWith('js/'))) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=|document\.write/, `${f} injects raw HTML`);
  }
});

test('no placeholder or dead links; every local link and asset exists', () => {
  for (const p of pages) {
    assert.doesNotMatch(p.html, /href="#"/, `${p.file} has href="#"`);
    for (const [, attr, raw] of p.html.matchAll(/\s(href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|data:|#)/.test(raw)) continue;
      const path = raw.split(/[?#]/)[0];
      const file = path === '/' || path === '' ? 'index.html' : path.replace(/^\//, '');
      assert.ok(existsSync(join(ROOT, file)), `${p.file}: ${attr}="${raw}" → ${file} does not exist`);
      const hash = raw.split('#')[1];
      if (hash && file.endsWith('.html')) assert.match(read(file), new RegExp(`id="${hash}"`), `${p.file}: anchor #${hash} missing in ${file}`);
    }
  }
});

test('every page has language, title, description, canonical/robots and landmarks', () => {
  for (const p of pages) {
    assert.match(p.html, /<html lang="en">/, p.file);
    assert.match(p.html, /<title>[^<]{10,}<\/title>/, p.file);
    assert.match(p.html, /<meta name="description" content="[^"]{20,}">/, p.file);
    assert.match(p.html, /<meta property="og:title"/, p.file);
    if (p.canonical !== false) assert.match(p.html, /<link rel="canonical" href="https:\/\/tkdflow\.com\//, p.file);
    if (p.noindex) assert.match(p.html, /<meta name="robots" content="noindex">/, p.file);
    assert.match(p.html, /<main id="main"/, `${p.file} needs <main id="main">`);
    assert.match(p.html, /class="skip-link" href="#main"/, `${p.file} needs a skip link`);
    assert.match(p.html, /<h1[\s>]/, `${p.file} needs an h1`);
  }
});

test('the mobile menu control is present on every page and styled to open', () => {
  for (const p of pages) {
    assert.match(p.html, /<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">/, p.file);
    assert.match(p.html, /id="site-nav"/, p.file);
    assert.match(p.html, /<script type="module" src="\/js\/site\.js"><\/script>/, p.file);
  }
  const css = read('styles.css');
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
  assert.match(mobile, /\.nav-links\.open\s*\{\s*display:\s*flex/);
  assert.match(mobile, /\.nav-toggle\s*\{\s*display:\s*inline-flex/);
});

test('ids are unique and every form field has a programmatic label', () => {
  for (const p of pages) {
    const ids = [...p.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(dupes, [], `${p.file} duplicate ids`);
    for (const [tag] of p.html.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
      if (/type="(hidden|submit|reset|button)"/.test(tag)) continue;
      const id = tag.match(/\sid="([^"]+)"/)?.[1];
      const labelled = /aria-label(ledby)?="/.test(tag) || (id && new RegExp(`<label[^>]*for="${id}"`).test(p.html));
      assert.ok(labelled, `${p.file}: field without a label: ${tag}`);
    }
    for (const [btn, body] of p.html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const text = body.replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
      assert.ok(text || /aria-label="/.test(btn), `${p.file}: button without an accessible name: ${btn}`);
    }
  }
});

test('content files pass their validators', () => {
  assert.equal(validateForms(JSON.parse(read('data/forms.json'))), null);
  assert.equal(validateForum(JSON.parse(read('data/forum.json'))), null);
  assert.equal(validateCommunity(JSON.parse(read('data/community.json'))), null);
  assert.equal(validateEvents(JSON.parse(read('data/competitions.json'))), null);
});

test('no unsupported statistics or claims ship in pages or data', () => {
  const banned = [
    /501\(c\)\(3\)/i, /certified masters/i, /verified content/i, /open-source/i, /\b38k\b/i, /\b2k\+/i, /140\+/,
    /12\.4k/i, /94k/i, /online now/i, /WTF Poomsae/i, /registration open/i, /most practiced/i, /free forever/i,
    /world's most complete/i, /non-profit/i,
  ];
  const files = [...pages.map((p) => [p.file, p.html]), ...walk('data', ['.json']).map((f) => [f, read(f)])];
  for (const [file, text] of files) for (const re of banned) assert.doesNotMatch(text, re, `${file} contains ${re}`);
  for (const [file, text] of files) assert.doesNotMatch(text, /[\w.+-]+@[\w-]+\.[\w.]+/, `${file} contains an email address`);
});

test('account config is safe to ship', () => {
  assert.match(ACCOUNTS.sdk.url, /@supabase\/supabase-js@\d+\.\d+\.\d+\//, 'SDK must be pinned to an exact version');
  assert.match(ACCOUNTS.sdk.integrity, /^sha384-[A-Za-z0-9+/=]{64}$/, 'SDK needs an SRI hash');
  // Checked whether or not accounts are enabled.
  assert.equal(publicKeyProblem(ACCOUNTS.supabaseAnonKey), null, 'config key must be a public anon/publishable key');
  if (ACCOUNTS.enabled) {
    assert.match(ACCOUNTS.supabaseUrl, /^https:\/\/[a-z0-9]+\.supabase\.co$/, 'enabled accounts need the project URL');
    assert.ok(ACCOUNTS.supabaseAnonKey.length > 20, 'enabled accounts need the public anon key');
  }
  if (ACCOUNTS.signupEnabled) assert.ok(ACCOUNTS.enabled, 'signup cannot be on while accounts are off');
});

test('deployment headers are configured and the CSP blocks inline code', () => {
  const cfg = JSON.parse(read('vercel.json'));
  const all = cfg.headers.find((h) => h.source === '/(.*)').headers;
  const keys = Object.fromEntries(all.map((h) => [h.key, h.value]));
  for (const k of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) assert.ok(keys[k], k);
  const csp = keys['Content-Security-Policy'] || keys['Content-Security-Policy-Report-Only'];
  assert.ok(csp, 'a CSP is defined');
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.ok(existsSync(join(ROOT, 'robots.txt')) && existsSync(join(ROOT, 'favicon.ico')) && existsSync(join(ROOT, '404.html')));
});

test('no privileged Supabase key appears in any shipped file', () => {
  const shipped = [...pages.map((p) => p.file), ...walk('js', ['.js']), ...walk('data', ['.json']), ...walk('css', ['.css']),
    'styles.css', 'vercel.json', 'robots.txt', 'sitemap.xml'];
  for (const f of shipped) assert.deepEqual(findPrivilegedKeys(read(f)), [], `${f} contains a privileged key`);
});

test('copy does not promise unbuilt features or assert unverified facts', () => {
  const text = [...pages.map((p) => p.html), read('js/pages/home.js'), read('js/pages/events.js')].join('\n');
  for (const re of [/belt progress/i, /listings with official sources/i, /everything on the learning side/i, /has finished/i]) {
    assert.doesNotMatch(text, re);
  }
});

function pngSize(buf) {
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('social preview image exists, is 1200×630 and is declared on every page', () => {
  const png = readFileSync(join(ROOT, 'assets/og-image.png'));
  assert.deepEqual(pngSize(png), { width: 1200, height: 630 });
  assert.ok(png.length < 1_000_000, 'keep the social card under 1 MB');
  const svg = read('assets/social-card.svg');
  assert.match(svg, /width="1200" height="630" viewBox="0 0 1200 630"/);
  assert.match(svg, /<title id="t">/);
  for (const p of pages) {
    assert.match(p.html, /<meta property="og:image" content="https:\/\/tkdflow\.com\/assets\/og-image\.png">/, p.file);
    assert.match(p.html, /<meta property="og:image:width" content="1200">/, p.file);
    assert.match(p.html, /<meta property="og:image:height" content="630">/, p.file);
    assert.match(p.html, /<meta property="og:image:alt" content="[^"]{10,}">/, p.file);
    assert.match(p.html, /<meta name="twitter:card" content="summary_large_image">/, p.file);
  }
});

test('social card carries no counts or unsupported claims', () => {
  const svg = read('assets/social-card.svg');
  const text = [...svg.matchAll(/>([^<>]+)</g)].map((m) => m[1]).join(' ');
  assert.doesNotMatch(text, /\d+\s*(\+|k\b|forms|lessons|members|videos|countries)/i, 'no counts on the card');
  for (const re of [/501\(c\)/i, /non-profit/i, /certified/i, /verified/i, /official/i, /lessons\b/i, /free forever/i]) assert.doesNotMatch(text, re);
});

test('CI workflow runs the release checks with read-only permissions', () => {
  const yml = read('.github/workflows/check.yml');
  assert.match(yml, /^permissions:\n {2}contents: read$/m);
  assert.doesNotMatch(yml, /:\s*write\b/, 'no write permissions');
  assert.match(yml, /node-version: 24/);
  assert.match(yml, /run: npm ci/);
  assert.match(yml, /run: npm run check/);
  assert.match(yml, /persist-credentials: false/);
  assert.doesNotMatch(yml, /secrets\./, 'the check job needs no secrets');
  assert.ok(existsSync(join(ROOT, 'package-lock.json')), 'npm ci needs a lockfile');
});

test('release runbook exists, is linked, and invents no owners or contacts', () => {
  const runbook = read('docs/RELEASE.md');
  for (const heading of ['Release record', 'Local checks', 'Preview deployment and QA', 'First public release', 'Post-deploy checks',
    'Rolling back the site', 'Enforcing the Content-Security-Policy', 'Member accounts rollout', 'Database recovery']) {
    assert.match(runbook, new RegExp(heading), `runbook section: ${heading}`);
  }
  assert.match(runbook, /https:\/\/vercel\.com\/docs\/instant-rollback/);
  assert.match(runbook, /Never restore the old public policies/);
  assert.match(runbook, /320, 375, 390, 768 and 1280/);
  assert.ok((runbook.match(/\*\*TBD\*\*/g) || []).length >= 8, 'unknown owners/settings stay TBD');
  assert.doesNotMatch(runbook.replace(/support@tkdflow\.com/g, ''), /[\w.+-]+@[\w-]+\.[\w.]+/, 'no invented email addresses');
  assert.match(read('SETUP.md'), /\(docs\/RELEASE\.md\)/);
  assert.match(read('docs/audit-tracker.md'), /\(RELEASE\.md\)/);
});
