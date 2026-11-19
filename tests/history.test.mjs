/* History page: every dated event names its record and links its primary source; the photos are the licensed
   files with the credits their licences require; nothing presents an organization's own account as settled. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read = p => readFileSync(new URL('../' + p, import.meta.url));
const html = read('history.html').toString('utf8');
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const SOURCES = {
  itf: 'https://itftkd.sport/history/our-history/?noredirect=en-GB',
  kukkiwon: 'https://www.kukkiwon.or.kr/eng/contents/view?contentsNo=78&amp;menuLevel=2&amp;menuNo=80',
  wt: 'https://www.worldtaekwondo.org/att_file/documents/Annual%20Report%20Oct%202021-Jul%202022%20Final.pdf',
  ioc: 'https://stillmed.olympics.com/media/Document%20Library/OlympicOrg/Factsheets-Reference-Documents/Games/OG/History-of-sports/Reference-document-Taekwondo-History-at-the-OG.pdf',
  ipc: 'https://www.paralympic.org/news/para-taekwondo-fighters-ready-dazzle-paralympic-debut',
  kukkiwonHistory: 'https://m.kukkiwon.or.kr/eng/contents/view?contentsNo=93&amp;menuLevel=2&amp;menuNo=94'
};
// The dated facts and the record each must cite (checked against those sources, November 2026).
const EVENTS = {
  'five-kwans': ['1946', 'kukkiwonHistory'], 'itf-name': ['1955-04-11', 'itf'], 'national-festival': ['1963', 'kukkiwonHistory'], 'itf-founded': ['1966-03-22', 'itf'], 'kukkiwon-founded': ['1972-11-30', 'kukkiwon'],
  'wt-founded': ['1973-05-28', 'wt'], 'itf-worlds': ['1974', 'itf'], 'olympic-demonstration': ['1988', 'ioc'],
  'olympic-decision': ['1994', 'ioc'], 'olympic-medals': ['2000', 'ioc'], 'paralympic-debut': ['2021-09-02', 'ipc']
};

test('the history page is in the site manifest, the sitemap and the footer', () => {
  const pages = JSON.parse(read('layout/pages.json')).pages, page = pages.find(p => p.file === 'history.html');
  assert.ok(page && page.sitemap && page.path === '/history.html');
  assert.match(read('sitemap.xml').toString(), /<loc>https:\/\/tkdflow\.com\/history\.html<\/loc>/);
  assert.match(read('layout/footer.html').toString(), /<a href="\/history\.html">History of taekwondo<\/a>/);
  assert.match(html, /<title>A short history of taekwondo — TKDflow<\/title>/);
});

test('every timeline event is dated, in order, and links the primary source that records it', () => {
  const items = [...main.matchAll(/<li data-event="([^"]+)">([\s\S]*?)<\/li>/g)];
  assert.deepEqual(items.map(m => m[1]), Object.keys(EVENTS));
  let last = '';
  for (const [, id, body] of items) {
    const [date, source] = EVENTS[id], times = [...body.matchAll(/<time datetime="([^"]+)">/g)].map(m => m[1]);
    assert.equal(times[0], date, id);
    assert.ok(times[0] >= last, `${id} in date order`); last = times[0];
    assert.ok(body.includes(`href="${SOURCES[source]}"`), `${id} cites ${source}`);
  }
  // The ITF's 1955 naming date and its founder are the ITF's own account.
  assert.match(items.find(m => m[1] === 'itf-name')[2], /The ITF dates the name/);
  // The kwans are Kukkiwon's 1946–1960 early-taekwondo period, not five schools founded in one year.
  const kwans = items.find(m => m[1] === 'five-kwans')[2];
  assert.deepEqual([...kwans.matchAll(/<time datetime="([^"]+)">/g)].map(m => m[1]), ['1946', '1960']);
  assert.match(kwans, /Early modern taekwondo: the post-war kwans/); assert.match(kwans, /Kukkiwon’s history treats these years, when the Five Kwans emerged, as taekwondo’s early period/);
  assert.doesNotMatch(kwans, /founded in 1946|were founded in 1946/);
  assert.match(items.find(m => m[1] === 'itf-founded')[2], /The ITF names General Choi Hong Hi/);
});

test('the origins narrative comes before the timeline, is sourced, and tells modern history rather than caveats', () => {
  const origins = main.slice(main.indexOf('id="hi-origins"'), main.indexOf('id="hi-timeline"'));
  assert.ok(main.indexOf('id="hi-origins"') > 0 && main.indexOf('id="hi-origins"') < main.indexOf('id="hi-timeline"'));
  assert.ok(origins.includes(`href="${SOURCES.kukkiwonHistory}"`), 'cites Kukkiwon’s history');
  assert.match(origins, /By Kukkiwon’s account, they added kicks drawn from Taekkyeon/);
  for (const fact of [/Five Kwans/, /1946–1960/, /Subak/, /national association/, /shared dan tests and poomsae/, /National Sports Festival in 1963/, /Asia, Europe and the United States/])
    assert.match(origins, fact);
  // Kukkiwon (the martial art) and World Taekwondo (the sport) have different jobs.
  assert.match(origins, /Kukkiwon, founded in 1972 and known as the World Taekwondo Headquarters, leads taekwondo as a martial art/);
  assert.match(origins, /World Taekwondo, founded in 1973, governs it as an international sport/);
  assert.doesNotMatch(main, /disputed|unbroken|Every date here|nothing from it is copied|don’t always agree/i);
  assert.doesNotMatch(main, /class="notice/);
});

test('prose drawn from Kukkiwon’s history page stays within its 200-word summary limit', () => {
  // Every passage summarising that page is marked data-source="kukkiwon-history"; together they stay under 200 words,
  // and the three origins paragraphs are a brief summary (about 110–120 words).
  const blocks = [...main.matchAll(/<(p|span)[^>]*data-source="kukkiwon-history"[^>]*>([\s\S]*?)<\/\1>/g)].map(m => m[2].replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length);
  assert.ok(blocks.length >= 6, 'the Kukkiwon-derived passages are marked');
  const total = blocks.reduce((a, b) => a + b, 0), origins = blocks.slice(0, 3).reduce((a, b) => a + b, 0);
  assert.ok(total < 200, `Kukkiwon-derived prose: ${total} words`);
  assert.ok(origins >= 100 && origins <= 125, `origins summary: ${origins} words`);
  const originsSection = main.slice(main.indexOf('id="hi-origins"'), main.indexOf('id="hi-timeline"'));
  assert.equal((originsSection.match(/data-source="kukkiwon-history"/g) || []).length, 3, 'the three history paragraphs (the roles paragraph has its own sources)');
});

test('the photos are the licensed files, sized for the page, with the credits their licences require', () => {
  const figures = [...main.matchAll(/<figure class="hi-figure">([\s\S]*?)<\/figure>/g)].map(m => m[1]);
  assert.equal(figures.length, 2);
  const photos = [
    {file: 'assets/history/kukkiwon-south-gate-2026.webp', w: 1200, h: 820, author: 'LucaPagani7', page: 'https://commons.wikimedia.org/wiki/File:Kukkiwon_South_Gate_2026.jpg', licence: 'https://creativecommons.org/publicdomain/zero/1.0/', name: 'CC0 1.0'},
    {file: 'assets/history/taekwondo-rio-2016.webp', w: 1200, h: 675, author: 'Henriquemarra01', page: 'https://commons.wikimedia.org/wiki/File:Taekwondo_Olimpiadas_Rio_2016.jpg', licence: 'https://creativecommons.org/licenses/by-sa/4.0/', name: 'CC BY-SA 4.0'}
  ];
  for (const [i, p] of photos.entries()) {
    const fig = figures[i], b = read(p.file);
    assert.ok(fig.includes(`src="/${p.file}" width="${p.w}" height="${p.h}"`), p.file);
    assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP');
    assert.ok(statSync(new URL('../' + p.file, import.meta.url)).size < 200_000, `${p.file} stays light`);
    assert.match(fig, /alt="[^"]{60,}"/, 'descriptive alternative text');
    for (const s of [p.author, `href="${p.page}"`, `href="${p.licence}"`, p.name]) assert.ok(fig.includes(s), `${p.file} credit has ${s}`);
    assert.match(fig, /Resized and converted to WebP/);
  }
  assert.match(figures[0], /present-day view, not a photograph from 1972/, 'the 2026 photo is not passed off as archival');
  assert.match(figures[1], /shared under the same licence/, 'the adapted CC BY-SA image keeps its licence');
  assert.doesNotMatch(figures[1], /alt="[^"]*\b(named|champion|gold medall?ist)\b/i, 'no athlete identification');
  // Same images credited again in the sources list.
  for (const p of photos) assert.ok(main.slice(main.indexOf('id="hi-sources"')).includes(`href="${p.page}"`));
});

test('the page is self-contained: same-origin images, no embeds or scripts of its own, external links only to sources', () => {
  assert.doesNotMatch(main, /<iframe|<script|<video|<audio/);
  for (const [, src] of main.matchAll(/<img [^>]*src="([^"]+)"/g)) assert.match(src, /^\/assets\/history\//);
  const allowed = /^https:\/\/(itftkd\.sport|www\.kukkiwon\.or\.kr|m\.kukkiwon\.or\.kr|www\.worldtaekwondo\.org|stillmed\.olympics\.com|www\.paralympic\.org|commons\.wikimedia\.org|creativecommons\.org|www\.youtube\.com)\//;
  for (const [, href] of main.matchAll(/href="(https?:[^"]+)"/g)) assert.match(href, allowed, href);
  for (const [, tag] of main.matchAll(/(<a [^>]*href="https:[^"]+"[^>]*>)/g)) assert.match(tag, /rel="noopener/);
  assert.match(main, /not affiliated with any of these organizations/);
  assert.equal(createHash('sha256').update(read('assets/history/kukkiwon-south-gate-2026.webp')).digest('hex').length, 64);
});
