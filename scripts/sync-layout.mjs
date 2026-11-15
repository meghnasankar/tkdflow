#!/usr/bin/env node
/* Stamp the shared head / header / footer (layout/*.html) into every page
   listed in layout/pages.json, and regenerate sitemap.xml.

   Usage:
     node scripts/sync-layout.mjs          # rewrite pages in place
     node scripts/sync-layout.mjs --check  # exit 1 if any page is out of date

   Each page marks the regions it wants filled:
     <!-- layout:head -->…<!-- /layout:head -->
     <!-- layout:header -->…<!-- /layout:header -->
     <!-- layout:footer -->…<!-- /layout:footer -->
   and declares its navigation key with <body data-page="…">. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export const manifest = JSON.parse(read('layout/pages.json'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderHead(page) {
  const url = manifest.origin + page.path;
  const canonical = page.canonical === false ? '' : `<link rel="canonical" href="${esc(url)}">\n`;
  return read('layout/head.html')
    .replaceAll('{{title}}', esc(page.title))
    .replaceAll('{{description}}', esc(page.description))
    .replace('{{robots}}', page.noindex ? '<meta name="robots" content="noindex">\n' : '')
    .replace('{{canonical}}', canonical)
    .replace('{{ogUrl}}', page.canonical === false ? '' : `<meta property="og:url" content="${esc(url)}">\n`)
    .trimEnd();
}

export function renderHeader(page) {
  return read('layout/header.html').trimEnd().replace(/<a ([^>]*?)data-nav="([a-z0-9-]+)"([^>]*)>/g, (m, pre, key, post) => {
    if (key !== page.key) return m;
    const isLogo = /navbar-logo/.test(pre + post);
    if (isLogo) return m; // the logo is not a nav item
    return `<a ${pre}data-nav="${key}"${post} class="active" aria-current="page">`;
  });
}

export function renderFooter() {
  return read('layout/footer.html').trimEnd();
}

function replaceRegion(html, name, content, file) {
  const re = new RegExp(`(<!-- layout:${name} -->)[\\s\\S]*?(<!-- /layout:${name} -->)`);
  if (!re.test(html)) throw new Error(`${file}: missing <!-- layout:${name} --> markers`);
  return html.replace(re, `$1\n${content}\n$2`);
}

export function renderPage(page, html) {
  let out = replaceRegion(html, 'head', renderHead(page), page.file);
  out = replaceRegion(out, 'header', renderHeader(page), page.file);
  out = replaceRegion(out, 'footer', renderFooter(), page.file);
  return out;
}

export function renderSitemap() {
  const urls = manifest.pages.filter((p) => p.sitemap)
    .map((p) => `  <url><loc>${esc(manifest.origin + p.path)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const stale = [];
  const outputs = manifest.pages.map((p) => [p.file, renderPage(p, read(p.file))]);
  outputs.push(['sitemap.xml', renderSitemap()]);
  for (const [file, content] of outputs) {
    let current = '';
    try { current = read(file); } catch { /* new file */ }
    if (current !== content) {
      stale.push(file);
      if (!check) writeFileSync(join(ROOT, file), content);
    }
  }
  if (check && stale.length) {
    console.error(`Layout out of date in: ${stale.join(', ')}\nRun: node scripts/sync-layout.mjs`);
    process.exit(1);
  }
  console.log(check ? 'Layout is in sync.' : stale.length ? `Updated: ${stale.join(', ')}` : 'Nothing to update.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
