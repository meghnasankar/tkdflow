/* Lists carry role="list" because list-style:none can drop list semantics in
   some browser and screen-reader combinations; numbering stays in the text.
   Builds the read-and-print lesson companions from the real lesson sources:
   - /companions/<lesson>.html for each of the lessons in data/forms.json
   - the lesson list in /companions.html
   Rows use exactly what each lesson already shows or speaks: the study pose
   names (Taegeuk Il Jang's hand-authored POSES; createFormMotion() POSES for
   the others), officialLabel() count labels, kihap marks, the narration cue's
   turn and its text verbatim. Reference editions and links are copied from
   the lesson data (Taegeuk Il Jang: from its own page). Nothing is invented,
   and no source document's content is reproduced.

   Only the regions between <!-- companion --> markers (and the index's
   <!-- companion-index --> markers) are generated; a missing page is created
   with the shared layout markers, which scripts/sync-layout.mjs then fills.

   Usage: node scripts/build-companions.mjs           write pages
          node scripts/build-companions.mjs --check   fail if any page is stale */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFormMotion } from '../js/animation/form-motion.js';
import { POSES as TAEGEUK_1 } from '../js/lessons/taegeuk-1-data.js';
import { officialLabel } from '../js/lib/lesson-nav.js';
import { ORGS } from '../js/lib/catalog.js';

const ROOT = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const INDEX = 'companions.html';
export const pageFile = (id) => `companions/${id}.html`;
const STYLE = Object.fromEntries(ORGS.filter((o) => o.id !== 'all').map((o) => [o.id, o.label]));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const NOTE = 'Pose numbers count the lesson’s study poses; the count shows the movement or reference count the lesson labels. Left and right are the performer’s own. Each pose links to the lesson, paused on that pose.';
export const VOICE = 'Instructions are the text of the lesson’s spoken guidance.';

/** The turn wording the lesson's pose counter uses. */
export const turnText = (turn) => (turn ? `${turn.side === 'left' ? '↶' : '↷'} Turn ${turn.side} ${turn.degrees}°` : '');

/** "18 movements in the reference"; "30 reference counts" (already says reference). */
export const countPhrase = ({ term, value }) => `${value} ${term}${/^reference/.test(term) ? '' : ' in the reference'}`;

/** How the lesson page itself words and states its count ("Movements" / "Reference counts"). */
export function lessonCount(form) {
  const m = read(form.lessonUrl).match(/<dt>(Movements|Reference counts?)<\/dt><dd>(\d+)/);
  if (!m) throw new Error(`${form.lessonUrl}: no Movements/Reference counts entry`);
  return { term: m[1].toLowerCase(), value: Number(m[2]) };
}

/** Reference edition and links exactly as the lesson keeps them. */
export function lessonReferences(form) {
  if (form.id === 'taegeuk-1') {
    const m = read(form.lessonUrl).match(/Sequence and kihap reference: <a href="(https:[^"]+)"[^>]*>([^<]+)<\/a>/);
    if (!m) throw new Error('taegeuk-1.html: reference link not found');
    return { label: 'Sequence and kihap reference', sources: [{ url: m[1], title: m[2] }] };
  }
  const data = JSON.parse(read(`data/lessons/${form.id}.json`));
  return { label: data.referenceLabel, sources: data.sources.map((s) => ({ url: s.url, title: s.title, pdfPages: s.pdfPages || null })) };
}

export function lessonPoses(form) {
  return form.id === 'taegeuk-1' ? TAEGEUK_1 : createFormMotion(JSON.parse(read(`data/lessons/${form.id}.json`))).POSES;
}

/** One lesson's companion as plain data (used by the renderer and the tests). */
export function companion(form) {
  const poses = lessonPoses(form);
  const cues = JSON.parse(read(`data/narration/${form.id}.json`)).cues;
  if (cues.length !== poses.length) throw new Error(`${form.id}: ${cues.length} cues for ${poses.length} poses`);
  return {
    id: form.id, name: form.name, korean: form.koreanName, style: STYLE[form.category], lessonUrl: `/${form.lessonUrl}`,
    count: lessonCount(form), references: lessonReferences(form),
    rows: poses.map((pose, i) => ({
      n: i + 1, name: pose.name, korean: pose.korean || '',
      label: officialLabel(pose) || (i === 0 ? 'Ready position' : i === poses.length - 1 ? 'Return' : ''),
      turn: turnText(cues[i].turn), kihap: !!pose.kihap, say: cues[i].text,
    })),
  };
}

export const lessons = () => JSON.parse(read('data/forms.json')).filter((f) => f.lessonUrl);

const pages = (s) => (s.pdfPages ? ` (PDF pages ${s.pdfPages[0]}–${s.pdfPages.at(-1)})` : '');

export function renderCompanion(c) {
  const rows = c.rows.map((r) => `<li id="pose-${r.n}"><p class="cp-head"><a href="${c.lessonUrl}?pose=${r.n}#player">Pose ${r.n}</a> <span class="cp-name">${esc(r.name)}</span>`
    + (r.korean ? ` <span class="cp-ko" lang="ko">${esc(r.korean)}</span>` : '') + '</p>'
    + `<p class="cp-meta"><span class="cp-count">${esc(r.label)}</span>${r.turn ? ` <span class="cp-turn">${esc(r.turn)}</span>` : ''}${r.kihap ? ' <span class="cp-kihap">Kihap</span>' : ''}</p>`
    + `<p class="cp-say">${esc(r.say)}</p></li>`).join('\n');
  const sources = c.references.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>${pages(s)}</li>`).join('\n');
  return `<div class="page-hero cp-hero"><div class="container">
<p class="section-label on-dark">Read and print companion</p>
<h1>${esc(c.name)} <span class="kr-title" lang="ko">${esc(c.korean)}</span></h1>
<p class="cp-meta-line">${esc(c.style)} · ${c.rows.length} study poses · ${countPhrase(c.count)}</p>
<p class="cp-actions"><a class="btn btn-secondary btn-sm" href="${c.lessonUrl}">Open the full lesson</a> <a class="btn btn-secondary btn-sm" href="/lesson-faq.html?lesson=${c.id}">Lesson answers</a> <a class="btn btn-secondary btn-sm" href="/companions.html">All companions</a> <button type="button" class="btn btn-primary btn-sm" data-print hidden>Print this companion</button></p>
</div></div>
<div class="container cp-main">
<p class="cp-note">${esc(NOTE)}</p>
<p class="cp-print-url">Lesson: https://tkdflow.com${c.lessonUrl}</p>
<h2 id="cp-poses-title">Poses</h2>
<ol class="cp-poses" role="list" aria-labelledby="cp-poses-title">
${rows}
</ol>
<section class="cp-sources" aria-labelledby="cp-sources-title">
<h2 id="cp-sources-title">Sources</h2>
<p>${esc(c.references.label)}:</p>
<ul>
${sources}
</ul>
<p>${esc(VOICE)}</p>
</section>
</div>`;
}

export function renderIndexList(list) {
  return ['wt', 'itf', 'ata'].map((style) => {
    const items = list.filter((c) => c.category === style).map((f) => {
      const c = companion(f);
      return `<li><a href="/${pageFile(c.id)}">${esc(c.name)}</a> <span lang="ko">${esc(c.korean)}</span> <span class="cp-index-meta">${c.rows.length} study poses · <a href="${c.lessonUrl}">lesson</a></span></li>`;
    }).join('\n');
    return `<section class="cp-index-group" aria-labelledby="cp-${style}"><h2 id="cp-${style}">${esc(STYLE[style])}</h2>\n<ul class="cp-index" role="list">\n${items}\n</ul></section>`;
  }).join('\n');
}

const skeleton = (marker) => `<!DOCTYPE html>
<html lang="en-US"><head>
<!-- layout:head -->
<!-- /layout:head -->
<link rel="stylesheet" href="/css/companion.css">
<script type="module" src="/js/pages/companion.js"></script>
</head><body data-page="forms">
<!-- layout:header -->
<!-- /layout:header -->
<main id="main" tabindex="-1">
<!-- ${marker} -->
<!-- /${marker} -->
</main>
<!-- layout:footer -->
<!-- /layout:footer -->
</body>
</html>
`;
function fill(html, marker, content, file) {
  const re = new RegExp(`(<!-- ${marker} -->)[\\s\\S]*?(<!-- /${marker} -->)`);
  if (!re.test(html)) throw new Error(`${file}: missing <!-- ${marker} --> markers`);
  return html.replace(re, (m, open, close) => `${open}\n${content}\n${close}`);
}

export const FACTS = 'data/form-facts.json';
/** Small public facts for the comparison page, from the same lesson data the
 *  companions use: study poses and the reference count each lesson states. */
export function renderFacts(list) {
  const forms = Object.fromEntries(list.map((f) => { const c = companion(f); return [f.id, { studyPoses: c.rows.length, referenceCounts: c.count.value }]; }));
  return JSON.stringify({ version: 1, forms }, null, 1) + '\n';
}

/** Every file this generator owns, with its expected content. */
export function outputs() {
  const list = lessons();
  const current = (file, marker) => (existsSync(new URL(file, ROOT)) ? read(file) : skeleton(marker));
  return [
    ...list.map((f) => [pageFile(f.id), fill(current(pageFile(f.id), 'companion'), 'companion', renderCompanion(companion(f)), pageFile(f.id))]),
    [INDEX, fill(read(INDEX), 'companion-index', renderIndexList(list), INDEX)],
    [FACTS, renderFacts(list)],
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check'), stale = [];
  for (const [file, content] of outputs()) {
    const url = new URL(file, ROOT), now = existsSync(url) ? readFileSync(url, 'utf8') : null;
    if (now === content) continue;
    stale.push(file);
    if (!check) { mkdirSync(new URL('.', url), { recursive: true }); writeFileSync(url, content); }
  }
  if (check && stale.length) { console.error(`Companions out of date: ${stale.join(', ')} (run: npm run sync)`); process.exit(1); }
  console.log(check ? 'Companions are in sync.' : stale.length ? `Updated: ${stale.join(', ')}` : 'Nothing to update.');
}
