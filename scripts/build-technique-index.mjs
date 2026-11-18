/* Builds the static "Find a technique" index inside techniques.html from the
   real lesson sources: Taegeuk Il Jang's hand-authored POSES and, for every
   other lesson, the same createFormMotion() POSES the lesson page plays.
   Nothing is invented: group names are the lesson's own technique wording with
   only a leading Left/Right removed, rows use each pose's own name, official
   label and Korean text (Taegeuk Il Jang only), and every link is the lesson's
   real 1-based ?pose=N link. The first (ready) and last (return) poses of each
   lesson are not techniques and are left out; mid-form ready positions stay.

   Usage: node scripts/build-technique-index.mjs           rewrite techniques.html
          node scripts/build-technique-index.mjs --check   fail if it is stale */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFormMotion } from '../js/animation/form-motion.js';
import { POSES as TAEGEUK_1 } from '../js/lessons/taegeuk-1-data.js';
import { officialLabel } from '../js/lib/lesson-nav.js';
import { ORGS } from '../js/lib/catalog.js';

const ROOT = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const PAGE = 'techniques.html';
const STYLE = { wt: 'WT / Kukkiwon', itf: 'ITF', ata: 'ATA' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);
/** Group key: the lesson's own wording, lowercased, without a leading side. */
export const groupKey = (text) => String(text).trim().toLowerCase().replace(/^(left|right)\s+/, '').replace(/\s+/g, ' ');
export const slug = (key) => key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The poses a lesson page actually shows, with the technique words of each. */
export function lessonPoses(form) {
  if (form.id === 'taegeuk-1') {
    return TAEGEUK_1.map((pose) => ({ pose, techniques: pose.name.split(' + ').map(groupKey) }));
  }
  const motion = createFormMotion(JSON.parse(read(`data/lessons/${form.id}.json`)));
  return motion.POSES.map((pose, i) => ({
    pose,
    techniques: (motion.referencePlans[i]?.actions || []).map((a) => groupKey(a.type.replaceAll('-', ' '))),
  }));
}

/** Plain data model shared by the generator and the tests. */
export function buildTechniqueIndex(forms = JSON.parse(read('data/forms.json'))) {
  const lessons = forms.filter((f) => f.lessonUrl);
  const groups = new Map();
  const lessonsOut = [];
  for (const form of lessons) {
    const poses = lessonPoses(form);
    lessonsOut.push({ id: form.id, poseCount: poses.length });
    poses.forEach(({ pose, techniques }, i) => {
      if (i === 0 || i === poses.length - 1) return; // starting ready and closing return
      for (const key of new Set(techniques)) {
        if (!groups.has(key)) groups.set(key, new Map());
        const byForm = groups.get(key);
        if (!byForm.has(form.id)) byForm.set(form.id, []);
        byForm.get(form.id).push({
          n: i + 1, name: pose.name, label: officialLabel(pose), korean: pose.korean || '', kihap: !!pose.kihap,
        });
      }
    });
  }
  const order = new Map(lessons.map((f, i) => [f.id, i]));
  return {
    forms: lessons.map((f) => ({
      id: f.id, name: f.name, style: f.category, href: `/${f.lessonUrl}`,
      terms: [f.id, f.name, f.koreanName, ...(f.aliases || [])],
    })),
    lessons: lessonsOut,
    groups: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, byForm]) => ({
      key,
      forms: [...byForm].sort(([a], [b]) => order.get(a) - order.get(b)).map(([id, rows]) => ({ id, rows })),
    })),
  };
}

export function indexStats(index) {
  const poses = new Set(), forms = new Set();
  for (const g of index.groups) for (const f of g.forms) for (const r of f.rows) { poses.add(`${f.id}:${r.n}`); forms.add(f.id); }
  return { groups: index.groups.length, poses: poses.size, forms: forms.size };
}

function renderRow(form, row) {
  return `<li><a href="${form.href}?pose=${row.n}#player">Pose ${row.n} · ${esc(row.name)}</a>`
    + (row.label ? ` <span class="tf-ref">${esc(row.label)}</span>` : '')
    + (row.korean ? ` <span class="tf-ko" lang="ko">${esc(row.korean)}</span>` : '')
    + (row.kihap ? ' <span class="tf-kihap">kihap</span>' : '')
    + '</li>';
}

export function renderGroups(index) {
  const forms = new Map(index.forms.map((f) => [f.id, f]));
  return index.groups.map((g) => {
    const poses = g.forms.reduce((n, f) => n + f.rows.length, 0);
    return `<details class="tf-group" id="t-${slug(g.key)}"><summary><span class="tf-name">${esc(sentence(g.key))}</span> `
      + `<span class="tf-count">${poses} pose${poses === 1 ? '' : 's'} · ${g.forms.length} form${g.forms.length === 1 ? '' : 's'}</span></summary>\n`
      + g.forms.map((f) => {
        const form = forms.get(f.id);
        return `<div class="tf-form" data-form="${f.id}"><p class="tf-form-name">${esc(form.name)} <span>${STYLE[form.style]}</span></p><ul aria-label="${esc(form.name)} poses">`
          + f.rows.map((r) => renderRow(form, r)).join('') + '</ul></div>';
      }).join('\n') + '\n</details>';
  }).join('\n');
}

export function renderFormOptions(index) {
  return ['<option value="">All forms</option>', ...index.forms.map((f) =>
    `<option value="${f.id}" data-style="${f.style}" data-terms="${esc(f.terms.join('|'))}">${esc(f.name)}</option>`)].join('\n');
}

export function renderStyleOptions() {
  return ORGS.map((o) => `<option value="${o.id === 'all' ? '' : o.id}">${esc(o.label)}</option>`).join('\n');
}

export function renderStats(index) {
  const s = indexStats(index);
  return `<p class="tf-stats">${s.poses} study poses from all ${index.lessons.length} lessons, in ${s.groups} technique groups.</p>`;
}

const BLOCKS = {
  'technique-stats': renderStats,
  'technique-styles': renderStyleOptions,
  'technique-forms': renderFormOptions,
  'technique-index': renderGroups,
};

export function renderPage(html, index = buildTechniqueIndex()) {
  let out = html;
  for (const [name, render] of Object.entries(BLOCKS)) {
    const re = new RegExp(`(<!-- ${name} -->)[\\s\\S]*?(<!-- /${name} -->)`);
    if (!re.test(out)) throw new Error(`${PAGE} is missing the ${name} markers`);
    out = out.replace(re, (m, open, close) => `${open}\n${render(index)}\n${close}`);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const current = read(PAGE);
  const next = renderPage(current);
  if (process.argv.includes('--check')) {
    if (current !== next) { console.error(`${PAGE} technique index is stale (run: npm run sync)`); process.exit(1); }
  } else if (current !== next) {
    writeFileSync(new URL(PAGE, ROOT), next);
    console.log(`Updated: ${PAGE}`);
  }
}
