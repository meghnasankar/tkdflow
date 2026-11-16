/* Preview-server path safety, using a throwaway fixture tree (never real
   repository secrets). The fixture has a fake .git/HEAD, a dev folder and a
   symlink that points outside the site root. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalPath, resolveRequest, createPreviewServer } from '../scripts/serve.mjs';

test('narration audio supports byte seeking, suffix ranges and HEAD',async()=>{
 const r=await fetch(origin+'/voice.mp3',{headers:{Range:'bytes=2-5'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-type'),'audio/mpeg');assert.equal(r.headers.get('accept-ranges'),'bytes');assert.equal(r.headers.get('content-range'),'bytes 2-5/10');assert.equal(await r.text(),'2345');
 const tail=await fetch(origin+'/voice.mp3',{headers:{Range:'bytes=-3'}});assert.equal(tail.status,206);assert.equal(await tail.text(),'789');
 const head=await fetch(origin+'/voice.mp3',{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
});
test('invalid audio ranges are bounded and return no file content',async()=>{
 for(const range of ['bytes=90-100','bytes=7-2','bytes=-0','bytes=1-2,4-5','bytes=999999999999999999999-']){const r=await fetch(origin+'/voice.mp3',{headers:{Range:range}});assert.equal(r.status,416,range);assert.equal(r.headers.get('content-range'),'bytes */10');assert.equal(await r.text(),'');}
});

let base; let root; let server; let origin;
const SECRET = 'FIXTURE-HEAD-ref: refs/heads/fixture';
const OUTSIDE = 'FIXTURE-OUTSIDE-CONTENT';

before(async () => {
  base = mkdtempSync(join(tmpdir(), 'tkd-serve-'));
  root = join(base, 'site');
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, 'tests'));
  mkdirSync(join(root, 'js'));
  mkdirSync(join(base, 'outside'));
  writeFileSync(join(root, 'index.html'), '<h1>home</h1>');
  writeFileSync(join(root, '404.html'), '<h1>not found</h1>');
  writeFileSync(join(root, 'js', 'app.js'), 'export {}');
  writeFileSync(join(root, 'voice.mp3'), Buffer.from('0123456789'));
  writeFileSync(join(root, '.git', 'HEAD'), SECRET);
  writeFileSync(join(root, 'tests', 'x.test.mjs'), 'dev only');
  writeFileSync(join(base, 'outside', 'file.txt'), OUTSIDE);
  symlinkSync(join(base, 'outside'), join(root, 'escape'));
  symlinkSync(join(root, '.git'), join(root, 'alias'));          // in-root alias to a dot folder
  symlinkSync(join(root, 'tests'), join(root, 'devlink'));        // in-root alias to a dev folder
  symlinkSync(join(root, '.git', 'HEAD'), join(root, 'head.txt')); // file alias
  symlinkSync(join(root, 'js', 'app.js'), join(root, 'app-alias.js')); // harmless alias (allowed)
  writeFileSync(join(root, 'vercel.json'), JSON.stringify({
    redirects: [{ source: '/index.html', destination: '/', permanent: true }],
    headers: [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'" },
    ] }],
  }));
  server = await createPreviewServer({ root });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  rmSync(base, { recursive: true, force: true });
});

/** Send a raw path (fetch would normalise it) and return status + body. */
async function rawGet(path) {
  const { request } = await import('node:http');
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('canonicalPath decodes before normalising and checks the final path', () => {
  assert.deepEqual(canonicalPath('/forms.html'), { kind: 'ok', rel: 'forms.html' });
  assert.deepEqual(canonicalPath('/'), { kind: 'ok', rel: 'index.html' });
  assert.equal(canonicalPath('/js/..%2f.git/HEAD').kind, 'hidden');
  assert.equal(canonicalPath('/x/%2e%2e/%2e%2e/.git/HEAD').kind, 'hidden');
  assert.equal(canonicalPath('/%2e%2e/%2e%2e/outside').kind, 'ok'); // clamps at root → treated as /outside
  assert.equal(canonicalPath('/.git/HEAD').kind, 'hidden');
  assert.equal(canonicalPath('/%2Egit/HEAD').kind, 'hidden');
  assert.equal(canonicalPath('/tests/x.test.mjs').kind, 'hidden');
  assert.equal(canonicalPath('/js/../tests/x').kind, 'hidden');
  assert.equal(canonicalPath('/.env').kind, 'hidden');
  assert.equal(canonicalPath('/%E0%A4%A').kind, 'bad');
  assert.equal(canonicalPath('/a%00b').kind, 'bad');
  assert.equal(canonicalPath('/a%5c..%5c.git').kind, 'bad');
  assert.equal(canonicalPath('relative').kind, 'bad');
});

test('resolveRequest blocks symlink escapes and missing files', async () => {
  assert.equal((await resolveRequest(root, '/escape/file.txt')).kind, 'hidden');
  assert.equal((await resolveRequest(root, '/alias/HEAD')).kind, 'hidden', 'alias resolving into .git');
  assert.equal((await resolveRequest(root, '/devlink/x.test.mjs')).kind, 'hidden', 'alias resolving into tests/');
  assert.equal((await resolveRequest(root, '/head.txt')).kind, 'hidden', 'file alias to .git/HEAD');
  assert.equal((await resolveRequest(root, '/app-alias.js')).kind, 'ok', 'alias to a public file is fine');
  assert.equal((await resolveRequest(root, '/nope.html')).kind, 'missing');
  assert.equal((await resolveRequest(root, '/js')).kind, 'missing');
  assert.equal((await resolveRequest(root, '/js/app.js')).kind, 'ok');
});

test('over HTTP, traversal and dot paths never return protected content', async () => {
  const attempts = [
    '/.git/HEAD', '/js/..%2f.git/HEAD', '/js/%2e%2e/.git/HEAD', '/%2e%2e/site/.git/HEAD', '/js/..%2F..%2Fsite%2F.git%2FHEAD',
    '/tests/x.test.mjs', '/escape/file.txt', '/..%2foutside/file.txt', '/%2e%2e%2f%2e%2e%2foutside/file.txt',
    '/alias/HEAD', '/devlink/x.test.mjs', '/head.txt', '/js/..%2falias%2fHEAD',
  ];
  for (const path of attempts) {
    const r = await rawGet(path);
    assert.ok([400, 404].includes(r.status), `${path} → ${r.status}`);
    assert.ok(!r.body.includes(SECRET) && !r.body.includes(OUTSIDE) && !r.body.includes('dev only'), `${path} leaked content`);
  }
});

test('malformed paths are 400; normal pages and 404s behave', async () => {
  assert.equal((await rawGet('/%E0%A4%A')).status, 400);
  assert.equal((await rawGet('/a%00b')).status, 400);
  const home = await rawGet('/');
  assert.equal(home.status, 200);
  assert.match(home.body, /home/);
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  assert.equal(home.headers['content-security-policy'], "default-src 'self'", 'CSP is enforced locally');
  const missing = await rawGet('/does-not-exist');
  assert.equal(missing.status, 404);
  assert.match(missing.body, /not found/);
  const redirect = await rawGet('/index.html');
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.location, '/');
});

test('serves only GET/HEAD and binds to loopback by default', async () => {
  const { request } = await import('node:http');
  const status = await new Promise((resolve) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path: '/', method: 'POST' }, (res) => { res.resume(); resolve(res.statusCode); });
    req.end();
  });
  assert.equal(status, 405);
  const src = (await import('node:fs')).readFileSync(new URL('../scripts/serve.mjs', import.meta.url), 'utf8');
  assert.match(src, /arg\('host', '127\.0\.0\.1'\)/);
});
