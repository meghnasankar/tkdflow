#!/usr/bin/env node
/* Local preview server that behaves like the Vercel deployment:
   applies the headers and redirects from vercel.json, serves 404.html for
   unknown paths, and ENFORCES the Content-Security-Policy by default.
   --report-only sends the same policy as Content-Security-Policy-Report-Only
   instead, whichever header name vercel.json uses, to simulate the
   report-only baseline. Exactly one CSP header is ever sent.

   Path safety: the request path is decoded once, rejected if malformed,
   normalised, and the FINAL relative path is checked (no dot-segments such
   as .git, no development folders). The file's real path (symlinks
   resolved) must stay inside the site root. Binds to 127.0.0.1 by default.

   Usage: node scripts/serve.mjs [--port 8899] [--host 127.0.0.1] [--report-only] */
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { join, extname, dirname, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.png': 'image/png', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

/** Development-only top-level entries, mirroring .vercelignore. */
const HIDDEN_TOP = new Set([
  'node_modules', 'tests', 'scripts', 'layout', 'docs', 'supabase',
  'package.json', 'package-lock.json', 'SETUP.md', 'CLAUDE.local.md', 'supabase-setup.sql', 'vercel.json',
]);

/**
 * Turn a raw request path into a safe relative file path.
 * Returns { kind: 'ok', rel } | { kind: 'bad' } (malformed) | { kind: 'hidden' }.
 */
export function canonicalPath(rawPathname) {
  if (typeof rawPathname !== 'string' || !rawPathname.startsWith('/')) return { kind: 'bad' };
  let decoded;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {
    return { kind: 'bad' };
  }
  if (/[\0\\]/.test(decoded) || /[\u0000-\u001f]/.test(decoded)) return { kind: 'bad' };
  const normalized = posix.normalize(decoded);            // resolves "." and ".." AFTER decoding
  if (!normalized.startsWith('/')) return { kind: 'bad' };
  let rel = normalized.replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const segments = rel.split('/');
  if (segments.some((s) => s === '..' || s === '')) return { kind: 'bad' };
  if (segmentsHidden(segments)) return { kind: 'hidden' };
  return { kind: 'ok', rel };
}

/** Dot-entries anywhere (.git, .claude, .env, .vercelignore …) or a
 *  development folder/file at the top level. */
function segmentsHidden(segments) {
  return segments.some((s) => s.startsWith('.')) || HIDDEN_TOP.has(segments[0]);
}

/** Resolve to an absolute file path inside `root`, following symlinks. */
export async function resolveRequest(root, rawPathname) {
  const c = canonicalPath(rawPathname);
  if (c.kind !== 'ok') return c;
  const realRoot = await realpath(root);
  let real;
  try {
    real = await realpath(join(realRoot, ...c.rel.split('/')));
  } catch {
    return { kind: 'missing' };
  }
  if (real !== realRoot && !real.startsWith(realRoot + sep)) return { kind: 'hidden' };   // symlink escape
  // Re-check the RESOLVED location: a symlink alias inside the root must not
  // reach .git, tests or other development paths either.
  if (segmentsHidden(real.slice(realRoot.length + 1).split(sep))) return { kind: 'hidden' };
  const info = await stat(real);
  if (!info.isFile()) return { kind: 'missing' };
  return { kind: 'ok', file: real, rel: c.rel };
}

export const CSP_ENFORCED = 'Content-Security-Policy';
export const CSP_REPORT_ONLY = 'Content-Security-Policy-Report-Only';

export function headersFor(config, path, reportOnly = false) {
  const out = {};
  for (const rule of config.headers || []) {
    // vercel.json sources used here are plain regex groups: "/(.*)", "/(a|b)".
    const re = new RegExp(`^${rule.source}$`);
    if (!re.test(path)) continue;
    for (const { key, value } of rule.headers) {
      if (key === CSP_ENFORCED || key === CSP_REPORT_ONLY) {
        delete out[CSP_ENFORCED];
        delete out[CSP_REPORT_ONLY];
        out[reportOnly ? CSP_REPORT_ONLY : CSP_ENFORCED] = value;
      } else out[key] = value;
    }
  }
  return out;
}

export async function createPreviewServer({ root = DEFAULT_ROOT, reportOnly = false } = {}) {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));

  async function send(req, res, file, status, path) {
    const body = await readFile(file);
    const headers = {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      ...headersFor(config, path, reportOnly),
    };
    let start=0,end=body.length-1;
    if(status===200&&extname(file)==='.mp3'){
      headers['Accept-Ranges']='bytes';
      if(req.headers.range){
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(range&&(range[1]||range[2])){
          start=range[1]?Number(range[1]):Math.max(0,body.length-Number(range[2]));
          end=range[1]&&range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;
        }else start=NaN;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=body.length||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${body.length}`,'Content-Length':0});res.end();return;}
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${body.length}`;
      }
    }
    const content=body.subarray(start,end+1);headers['Content-Length']=content.length;
    res.writeHead(status,headers);
    res.end(req.method==='HEAD'?undefined:content);
  }

  return createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end();
        return;
      }
      let url;
      try {
        url = new URL(req.url, 'http://localhost');
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad request');
        return;
      }
      const redirect = (config.redirects || []).find((r) => r.source === url.pathname);
      if (redirect) {
        res.writeHead(redirect.permanent ? 308 : 307, { Location: redirect.destination + url.search });
        res.end();
        return;
      }
      const result = await resolveRequest(root, url.pathname);
      if (result.kind === 'bad') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad request');
        return;
      }
      if (result.kind !== 'ok') {
        await send(req, res, join(root, '404.html'), 404, '/404.html');
        return;
      }
      await send(req, res, result.file, 200, `/${result.rel}`);
    } catch {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    }
  });
}

async function main() {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
  };
  const port = Number(arg('port', process.env.PORT || 8899));
  const host = arg('host', '127.0.0.1');
  const reportOnly = process.argv.includes('--report-only');
  const server = await createPreviewServer({ reportOnly });
  server.listen(port, host, () => {
    console.log(`TKDflow preview: http://${host}:${port}/  (CSP ${reportOnly ? 'report-only' : 'enforced'})`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
