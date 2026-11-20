/* American English: the site declares en-US and its own visible wording uses US
   spellings. Scope is what visitors read: page text and visible attributes, content
   data, and string literals in the page/UI scripts. Identifiers, record keys, CSS
   classes, URLs, Korean text and code comments are not wording and are not checked.
   Proper names and source titles keep their own spelling: they are listed below by
   exact text, each with its reason, rather than by ignoring a file. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { GUIDE_WORDING, guideWording, mergePublishedTopics } from '../js/lib/discussions.js';
import { publicTopicRow } from '../js/lib/public-discussions.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('layout/pages.json'));

// British forms with a single standard US equivalent (whole words, any case).
const BRITISH = [
  'colours?', 'coloured', 'colouring', 'centres?', 'centred', 'centring',
  'organis(?:e|es|ed|ing|er|ers|ation|ations)', 'practis(?:e|es|ed|ing)', 'defences?', 'offences?', 'licences?',
  'catalogues?', 'catalogued', 'cataloguing', 'modell(?:ed|ing)', 'travell(?:ed|ing|er|ers)', 'cancell(?:ed|ing)', 'uncancelled',
  'labell(?:ed|ing)', 'levell(?:ed|ing)', 'signall(?:ed|ing)', 'greys?', 'greyed', 'favour(?:s|ed|ite|ites|able)?', 'behaviours?',
  'honour(?:s|ed|ing)?', 'neighbour(?:s|ing|hood)?', 'programmes?', '(?:kilo|centi|milli)?metres?', 'litres?', 'fibres?', 'theatres?',
  'manoeuvr(?:e|es|ed|ing)', 'judgements?', 'storeys?', 'towards', 'afterwards', 'whilst', 'amongst', 'learnt', 'enrolment', 'fulfil',
  'skilful', 'anticlockwise', 'artefacts?', 'sceptical', 'jewellery', 'aluminium', 'ageing',
  '(?:recogn|optim|penal|summar|real|apolog|minim|maxim|priorit|custom|normal|categor|memor|visual|standard|author|initial|final|special|familiar|emphas)is(?:e|es|ed|ing|ation)',
  'analys(?:e|ed|ing)', 'paralys(?:e|ed|ing)', // not "analyses": also the US plural noun
  '(?:un)?tick(?:s|ed|ing)?', // checkbox wording: US "check(mark)"; code's own 'tick' keys are not wording
];
const BRITISH_RE = new RegExp(`(?<![\\p{L}])(?:${BRITISH.join('|')})(?![\\p{L}])`, 'giu');

/** Exact names that keep their own spelling. */
const PROPER_NAMES = [
  'Olympic Studies Centre',             // the IOC's own name for its research centre (history page source)
  'VIC Kyorugi Colour Belt Selections', // official event title from Australian Taekwondo (data/competitions.json)
];
/** Data fields that are not displayed as site wording. */
const DATA_EXEMPT_KEYS = {
  'data/schools.json': ['name'],              // school names are proper names, kept as listed
  'data/lessons/*.json': ['sourceMovementsNote'], // maintainer note about count sources; never displayed
};
/** Script strings that are not visible wording: internal diagnostics only. */
const SCRIPT_EXEMPT = [
  ['js/lib/key-check.js', 'unrecognised key format'],   // a boolean "problem" check; never rendered
  ['js/lib/account-service.js', 'SDK did not initialise'], // status `cause`, never rendered
  ['js/referee/rules.js', 'is not modelled for'],         // thrown programming error for an unsupported scenario
  ['js/lib/discussions.js', 'A belt colour alone'],       // old stored guide wording, matched to show the US form
  ['js/lib/discussions.js', 'practise with attention'],   // (see guideWording below)
];

function britishIn(text) {
  let t = String(text).replace(/https?:\/\/[^\s"'<>)]+/g, ' ');
  for (const name of PROPER_NAMES) t = t.split(name).join(' ');
  return [...t.matchAll(BRITISH_RE)].map((m) => m[0]);
}

/* ── Pages: text nodes and visible attributes ─────────────────────────────── */
const VISIBLE_ATTRS = /\s(?:alt|title|aria-label|aria-description|placeholder|content|value)="([^"]*)"/g;
export function visibleHtmlText(html) {
  const body = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const attrs = [...body.matchAll(/<[a-z][^>]*>/gi)].flatMap((m) => [...m[0].matchAll(VISIBLE_ATTRS)].map((a) => a[1]));
  const text = body.replace(/<[^>]*>/g, ' ');
  return [text, ...attrs].join('\n').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}

/* ── Scripts: string and template literals, comments skipped ──────────────── */
/** Every string/template literal in an ES module source, in order. Throws on an
 *  unterminated literal, comment or regex, so a misread file fails loudly. */
export function scriptStrings(src) {
  const out = [];
  let i = 0;
  const err = (what) => { throw new Error(`unterminated ${what} at offset ${i}`); };
  const regexAllowedAfter = /[(,=:[!&|?{};+\-*%<>~^]$|(?:^|[^\w$])(?:return|typeof|case|in|of|void|delete|new|throw|else|do|yield|await)$/;
  function code(untilBrace) {
    let depth = 0, prev = '';
    while (i < src.length) {
      const c = src[i], d = src[i + 1];
      if (c === '/' && d === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
      if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) err('comment'); i = e + 2; continue; }
      if (c === '"' || c === "'") { out.push(quoted(c)); prev = 'a'; continue; }
      if (c === '`') { out.push(template()); prev = 'a'; continue; }
      if (c === '/' && regexAllowedAfter.test(prev.trimEnd().slice(-8) || '(')) { regex(); prev = 'a'; continue; }
      if (untilBrace && c === '{') depth++;
      if (untilBrace && c === '}') { if (depth === 0) { i++; return; } depth--; }
      if (!/\s/.test(c)) prev = /[\w$]/.test(c) ? (prev + c).slice(-8) : c === ')' || c === ']' ? 'a' : c;
      else if (/[\w$]$/.test(prev)) prev += ' ';
      i++;
    }
    if (untilBrace) err('template expression');
  }
  function quoted(q) {
    let s = ''; i++;
    while (i < src.length && src[i] !== q) { if (src[i] === '\n') err('string'); if (src[i] === '\\') { s += src[i + 1]; i += 2; } else s += src[i++]; }
    if (i >= src.length) err('string');
    i++; return s;
  }
  function template() {
    let s = ''; i++;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { s += src[i + 1]; i += 2; }
      else if (src[i] === '$' && src[i + 1] === '{') { i += 2; code(true); s += ' '; }
      else s += src[i++];
    }
    if (i >= src.length) err('template');
    i++; return s;
  }
  function regex() {
    let cls = false; i++;
    while (i < src.length) {
      const c = src[i];
      if (c === '\n') err('regex');
      if (c === '\\') { i += 2; continue; }
      if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) break;
      i++;
    }
    if (i >= src.length) err('regex');
    i++; while (/[a-z]/.test(src[i] || '')) i++;
  }
  code(false);
  return out;
}

const jsFiles = ['js/site.js', 'js/config.js',
  ...['js/pages', 'js/lib', 'js/referee'].flatMap((d) => readdirSync(new URL(`../${d}`, import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`))];

test('every page declares American English, keeps Korean marked as Korean, and says so to link previews', () => {
  assert.equal(manifest.lang, 'en-US', 'layout/pages.json sets the site language');
  assert.match(read('layout/head.html'), /<meta property="og:locale" content="en_US">/);
  for (const p of manifest.pages) {
    const html = read(p.file);
    assert.equal((html.match(/<html\b[^>]*>/g) || []).join(), '<html lang="en-US">', p.file);
    assert.match(html, /<meta property="og:locale" content="en_US">/, p.file);
    assert.doesNotMatch(html, /\slang="en(?:-GB)?"/, `${p.file}: no other English declaration`);
  }
  for (const f of ['companions/taegeuk-1.html', 'companions.html', 'taegeuk-1.html', 'glossary.html']) assert.match(read(f), /<span [^>]*lang="ko"[^>]*>/, `${f}: Korean still marked`);
  for (const f of ['confirm-signup', 'reset-password']) assert.match(read(`supabase/email-templates/${f}.html`), /<html lang="en-US">/, f);
});

test('page wording uses American spellings (proper names excepted)', () => {
  const found = [];
  for (const p of manifest.pages) for (const w of britishIn(visibleHtmlText(read(p.file)))) found.push(`${p.file}: ${w}`);
  assert.deepEqual(found, []);
});

test('content data uses American spellings in displayed fields', () => {
  const files = ['data/forms.json', 'data/forum.json', 'data/community.json', 'data/glossary.json', 'data/technique-cues.json',
    'data/competitions.json', 'data/schools.json', 'data/form-facts.json', 'data/form-thumbnails.json',
    ...['lessons', 'narration'].flatMap((d) => readdirSync(new URL(`../data/${d}`, import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => `data/${d}/${f}`))];
  const found = [];
  for (const file of files) {
    const exempt = DATA_EXEMPT_KEYS[file] || DATA_EXEMPT_KEYS[file.replace(/[^/]+\.json$/, '*.json')] || [];
    const walk = (v, key) => {
      if (typeof v === 'string') { if (!exempt.includes(key)) for (const w of britishIn(v)) found.push(`${file} ${key}: ${w}`); }
      else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    walk(JSON.parse(read(file)), '');
  }
  assert.deepEqual(found, []);
});

test('interface strings in page scripts use American spellings (record keys and comments are not wording)', () => {
  const found = [];
  for (const file of jsFiles) {
    let strings;
    assert.doesNotThrow(() => { strings = scriptStrings(read(file)); }, `${file} reads as ES module source`);
    for (const s of strings) {
      if (!/\s/.test(s) && !/\p{Lu}/u.test(s)) continue; // keys, ids, selectors and enum values such as 'practised' or 'cancelled'
      if (SCRIPT_EXEMPT.some(([f, text]) => f === file && s.includes(text))) continue;
      for (const w of britishIn(s)) found.push(`${file}: ${w} in ${JSON.stringify(s.slice(0, 80))}`);
    }
  }
  assert.deepEqual(found, []);
});

test('the guard itself catches British forms and lets proper names and keys through', () => {
  assert.deepEqual(britishIn('Practise the colour-belt form at the centre; it was cancelled and penalised.'), ['Practise', 'colour', 'centre', 'cancelled', 'penalised']);
  assert.deepEqual(britishIn('IOC Olympic Studies Centre · https://example.org/event-information-centre/'), []);
  assert.deepEqual(britishIn('Practice the color-belt form at the center; it was canceled and penalized.'), []);
  assert.deepEqual(britishIn('Colored belts, colored tags; the analyses of each form. Check or uncheck the checkmarks.'), [], 'US forms pass');
  assert.deepEqual(britishIn('Coloured belts; she analysed it. Tick or untick the ticks.'), ['Coloured', 'analysed', 'Tick', 'untick', 'ticks']);
  assert.deepEqual(visibleHtmlText('<p class="rg-practise" data-item="after-practise-forms" title="Belt colour">x</p>').match(/colour|practise/g), ['colour']);
  assert.deepEqual(scriptStrings("const a = 'one', b = `t ${x ? 'in' : \"q\"} z`; // 'comment'\n/* 'no' */ const r = /'[a-z]/g, c = d / 2 / e;"), ['one', 'in', 'q', 't   z']);
});

test('the two stored editorial guides read in US spelling on every display path; member posts and other guides are untouched', () => {
  const guides = JSON.parse(read('data/forum.json')).topics, seed = read('supabase/discussion-guides.sql');
  const pick = ({ id, category, title, body, author_handle, editorial, status, created_at }) => ({ id, category, title, body, author_handle, editorial, status, created_at });
  for (const [id, fixes] of Object.entries(GUIDE_WORDING)) {
    const bundled = guides.find((t) => t.id === id);
    assert.ok(bundled?.editorial, `${id} is a bundled editorial guide`);
    for (const [from, to] of fixes) assert.ok(bundled.body.includes(to) && seed.includes(to) && !seed.includes(from), `${id}: bundled copy and seed say “${to}”`);
    // The row as an existing database still stores it: the same guide with the old phrases.
    const stored = pick({ ...bundled, body: fixes.reduce((text, [from, to]) => text.replaceAll(to, from), bundled.body) });
    assert.notEqual(stored.body, bundled.body);
    assert.deepEqual(guideWording(stored), { ...stored, body: bundled.body }, 'only the body changes, to exactly the bundled text');
    assert.equal(mergePublishedTopics(guides, [stored])[0].body, bundled.body, 'forum feed, later pages and topic detail');
    assert.equal(publicTopicRow(stored).body, bundled.body, 'public reads, including the Community starter guides');
    const shown = guideWording(stored);
    assert.equal(guideWording(shown), shown, 'text already in US spelling is returned as is');
    // The same old phrases anywhere else are someone's own words, or another guide's: unchanged.
    const member = { ...stored, id: '0b7c9a52-3f1e-4d6a-9c2b-5e8f7a6d4c31', editorial: false, author_handle: 'member-1' };
    const sameIdNotEditorial = { ...stored, editorial: false };
    const otherGuide = { ...stored, id: 'f498178a-cd12-5c69-a816-fcf45a18bfb4' };
    for (const row of [member, sameIdNotEditorial, otherGuide]) {
      assert.equal(guideWording(row), row);
      assert.equal(publicTopicRow(row).body, stored.body);
    }
    const feed = mergePublishedTopics(guides, [member, stored, otherGuide]);
    assert.deepEqual(feed.map((t) => t.body), [stored.body, bundled.body, stored.body], 'in a mixed feed only the known guide changes');
    assert.deepEqual(pick(feed[0]), member, 'every field of a member post is preserved');
  }
  assert.equal(guideWording(null), null);
});
