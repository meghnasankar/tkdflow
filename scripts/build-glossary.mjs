/* Glossary of lesson words: renders data/glossary.json into glossary.html, so the
   page is complete without JavaScript and can't drift from the data.
     node scripts/build-glossary.mjs           write the section
     node scripts/build-glossary.mjs --check   fail if glossary.html is stale */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('..', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
export const PAGE = 'glossary.html';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderGlossary(data) {
  const src = data.source;
  const entries = data.terms.map((t) => {
    const search = [t.term, t.hangul, t.english, t.plain].filter(Boolean).join(' ');
    const pages = t.pages.map((p) => `<a href="${esc(src.url)}#page=${p}" rel="noopener">p.&nbsp;${p}</a>`).join(', ');
    return `<article class="gl-entry" id="${esc(t.id)}" data-search="${esc(search)}">
<h2><span class="gl-term">${esc(t.term)}</span>${t.hangul ? ` <span class="gl-ko" lang="ko">${esc(t.hangul)}</span>` : ''}</h2>
<p class="gl-en">${esc(t.english)}</p>${t.plain ? `\n<p class="gl-plain">${esc(t.plain)}</p>` : ''}
<p class="gl-meta">Source ${pages}${t.example ? ` · <a href="${esc(t.example.href)}">${esc(t.example.label)}</a>` : ''}</p>
</article>`;
  }).join('\n');
  return `<div class="gl-list" id="gl-list">
${entries}
</div>
<p class="gl-source">Source: ${esc(src.publisher)}, <cite>${esc(src.title)}</cite> (${esc(src.edition)}). Page links open the publisher’s PDF.</p>`;
}

export function expected() {
  const html = read(PAGE), data = JSON.parse(read('data/glossary.json'));
  const re = /(<!-- glossary -->)[\s\S]*?(<!-- \/glossary -->)/;
  if (!re.test(html)) throw new Error(`${PAGE}: missing <!-- glossary --> markers`);
  return html.replace(re, (m, open, close) => `${open}\n${renderGlossary(data)}\n${close}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const now = read(PAGE), next = expected();
  if (process.argv.includes('--check')) {
    if (now !== next) { console.error(`${PAGE} is out of date (run: npm run sync)`); process.exit(1); }
    console.log('Glossary is in sync.');
  } else if (now !== next) { writeFileSync(new URL(PAGE, ROOT), next); console.log(`Updated: ${PAGE}`); }
  else console.log('Nothing to update.');
}
