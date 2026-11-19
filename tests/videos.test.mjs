/* Video gallery: seven reviewed videos shown with their publishers' YouTube thumbnails and a Watch on YouTube
   action, original titles and accurate publisher labels, short learning notes, brief context where a video needs
   it, and simple filters. Only thumbnails come from YouTube (i.ytimg.com); nothing is embedded. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {matches, countText, thumbFailed} from '../js/pages/videos.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('videos.html'), main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const cards = [...main.matchAll(/<li class="vg-card" data-video="([^"]+)" data-kind="([^"]+)" data-tradition="([^"]+)">([\s\S]*?)\n   <\/li>/g)]
  .map(([, id, kind, tradition, body]) => ({id, kind, tradition, body, text: body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')}));

/* Written from the reviewed source notes and the pages' own og:image/og:title (research/gallery-thumbnail-sources.json,
   19 November 2026): YouTube id, original title (decorative emoji left out; Korean titles with their English), the
   publisher label, the running time, type and tradition. */
const VERIFIED = {
  'taegeuk-1': {yt: '__4pltpaPJo', title: '유급자 품새 교육 | 태극 1장 (Color Belt Poomsae Education | Taegeuk 1 Jang)', publisher: 'Kukkiwon, official channel', time: '21:11', kind: 'form', tradition: 'wt', lesson: 'taegeuk-1.html'},
  'taegeuk-8': {yt: 'djVVT-fnZkw', title: '유급자 품새 교육 | 태극 8장 (Color Belt Poomsae Education | Taegeuk 8 Jang)', publisher: 'Kukkiwon, official channel', time: '17:55', kind: 'form', tradition: 'wt', lesson: 'taegeuk-8.html'},
  'koryo': {yt: 'mGa60JDtWmg', title: 'KORYO', publisher: 'Kukkiwon, official channel', time: '22:04', kind: 'form', tradition: 'wt', lesson: 'koryo.html'},
  'chon-ji': {yt: 'EZGF16nVOlU', title: 'Chon-Ji Tul (천지틀) - Performed by Master Pak Chung Song 박충성', publisher: 'ITF HQ channel, linked from the Czech Taekwon-Do ITF federation', time: '0:48', kind: 'form', tradition: 'itf', lesson: 'chon-ji.html'},
  'songahm-1': {yt: 'wJG2mmTkFOk', title: 'Songahm 1 - White Belt Form', publisher: 'ATA Martial Arts Master T, independent instructor', time: '7:56', kind: 'form', tradition: 'ata', lesson: 'songahm-1.html'},
  'tokyo-2020': {yt: 'p4N1jaCAB3U', title: 'Taekwondo Mens +80kg Gold Medal bout | Tokyo 2020 Replays', publisher: 'Olympics, official channel', time: '26:28', kind: 'sparring', tradition: 'wt', lesson: 'referee-guide.html'},
  'dakar-2026': {yt: '9h6tDY4GB54', title: 'Jordan Win a THRILLER! | Taekwondo Mixed Team Final #Dakar2026', publisher: 'Olympics, official channel', time: '10:38', kind: 'sparring', tradition: 'wt', lesson: 'referee.html'}
};
const seconds = t => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };

test('seven curated videos, each shown with its publisher’s thumbnail, original title, publisher and a Watch on YouTube action', () => {
  assert.equal(cards.length, 7, 'no more than the seven reviewed videos');
  assert.deepEqual(cards.map(c => c.id).sort(), Object.keys(VERIFIED).sort());
  assert.deepEqual(new Set(cards.map(c => c.tradition)), new Set(['wt', 'itf', 'ata']));
  for (const c of cards) {
    const v = VERIFIED[c.id], watch = `https://www.youtube.com/watch?v=${v.yt}`;
    assert.equal(c.kind, v.kind, c.id); assert.equal(c.tradition, v.tradition, c.id);
    // The thumbnail: the page's own og:image, remote, sized, lazy, no referrer, and a mouse shortcut to the same video
    // that screen readers and the keyboard skip (the Watch on YouTube link is the one real link).
    const thumb = c.body.match(/<a class="vg-thumb" href="([^"]+)" rel="noopener" tabindex="-1" aria-hidden="true"><img class="vg-img" src="([^"]+)" width="1280" height="720" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt=""><span class="vg-duration">([^<]+)<\/span><\/a>/);
    assert.ok(thumb, `${c.id}: thumbnail markup`);
    assert.equal(thumb[1], watch); assert.equal(thumb[2], `https://i.ytimg.com/vi/${v.yt}/maxresdefault.jpg`); assert.equal(thumb[3], v.time);
    const action = [...c.body.matchAll(/<a class="btn btn-primary btn-sm vg-watch" href="([^"]+)" rel="noopener">Watch on YouTube<span class="sr-only">: ([^<]+)<\/span><\/a>/g)];
    assert.equal(action.length, 1, `${c.id}: one Watch on YouTube action`); assert.equal(action[0][1], watch);
    assert.equal(c.body.match(/<span class="vg-yt-title">([\s\S]*?)<\/span> <span class="vg-detail">/)[1].replace(/<[^>]+>/g, ''), v.title, `${c.id}: original title`);
    assert.ok(c.text.includes(v.publisher), `${c.id}: publisher “${v.publisher}”`);
    assert.match(c.body, new RegExp(`<a class="vg-onsite" href="/${v.lesson.replace('.', '\\.')}">`), `${c.id}: onward TKDflow page`);
    assert.ok(existsSync(new URL('../' + v.lesson, import.meta.url)), v.lesson);
    const prompts = c.body.slice(c.body.indexOf('<ul class="vg-prompts" aria-label="Watch for">'), c.body.indexOf('</ul>'));
    const items = prompts.match(/<li>/g) || [];
    assert.ok(items.length >= 2 && items.length <= 3, `${c.id}: 2–3 short notes`);
    for (const li of prompts.split('<li>').slice(1)) assert.ok(li.replace(/<[^>]+>/g, '').length < 120, `${c.id}: concise note`);
    assert.doesNotMatch(prompts.replace(/<[^>]+>/g, ''), /[“”"]/, `${c.id}: paraphrased, not quoted`);
    for (const [, t] of prompts.matchAll(/<strong>(\d+:\d\d)<\/strong>/g)) assert.ok(seconds(t) < seconds(v.time), `${c.id}: ${t} is inside the video`);
  }
});

test('publisher labels are accurate and the copy is short: context only where a video needs it', () => {
  const by = Object.fromEntries(cards.map(c => [c.id, c]));
  assert.match(by['chon-ji'].body, /ITF HQ channel, linked from the <a href="https:\/\/www\.taekwondo\.cz\/vyuka\/vzory\/" rel="noopener">Czech Taekwon-Do ITF federation<\/a>/);
  assert.match(by['songahm-1'].text, /ATA Martial Arts Master T, independent instructor/);
  for (const id of ['chon-ji', 'songahm-1']) assert.doesNotMatch(by[id].text, /official|endorsed|certified/i, `${id} is not presented as an official organisation channel`);
  assert.equal(by['tokyo-2020'].body.match(/<p class="vg-context">([^<]+)<\/p>/)[1], 'Held in 2021 under the rules of the time, so the scoring differs from today’s.');
  assert.equal(by['dakar-2026'].body.match(/<p class="vg-context">([^<]+)<\/p>/)[1], 'A mixed-team format with substitutions, shown as edited highlights.');
  assert.deepEqual(cards.filter(c => /vg-context/.test(c.body)).map(c => c.id), ['tokyo-2020', 'dakar-2026'], 'other cards carry no caveat box');
  assert.deepEqual([...by['dakar-2026'].text.matchAll(/\d+:\d\d/g)].map(m => m[0]), ['10:38'], 'no unverified time stamps in the Dakar highlights');
  // The long defensive notes are gone: no hosting/affiliation/review disclaimer and no repeated caption warnings.
  assert.doesNotMatch(main, /vg-note|affiliated|host or embed|review of every minute|machine-|captions/i);
});

test('only YouTube thumbnails are loaded from outside: the CSP gains https://i.ytimg.com for images and nothing else', () => {
  assert.doesNotMatch(html, /<iframe|<video|<embed|<object|youtube-nocookie|youtube\.com\/embed/i);
  const imgs = [...main.matchAll(/<img [^>]*>/g)].map(m => m[0]);
  assert.equal(imgs.length, 7);
  for (const i of imgs) { assert.match(i, /src="https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/maxresdefault\.jpg"/); assert.match(i, /referrerpolicy="no-referrer"/); assert.match(i, /loading="lazy"/); }
  assert.doesNotMatch(html, /<script(?! type="module" src="\/js\/(site|pages\/videos)\.js")/);
  const external = [...main.matchAll(/(?:href|src)="(https?:[^"]+)"/g)].map(m => new URL(m[1]).host);
  assert.deepEqual([...new Set(external)].sort(), ['i.ytimg.com', 'www.taekwondo.cz', 'www.youtube.com']);
  for (const m of main.matchAll(/<a [^>]*href="https?:[^"]+"[^>]*>/g)) assert.match(m[0], /rel="noopener"/);
  const cfg = JSON.parse(read('vercel.json')), csp = cfg.headers.find(h => h.source === '/(.*)').headers.find(h => h.key === 'Content-Security-Policy').value;
  assert.match(csp, /(^|; )img-src 'self' data: https:\/\/i\.ytimg\.com;/);
  assert.equal((csp.match(/ytimg|youtube/g) || []).length, 1, 'YouTube appears once in the policy, in img-src');
  assert.match(csp, /default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self';/); assert.match(csp, /frame-ancestors 'none'/); assert.doesNotMatch(csp, /frame-src|unsafe/);
  // Every other public page still loads images only from this site.
  const pages = JSON.parse(read('layout/pages.json')).pages.map(p => p.file).filter(f => f !== 'videos.html');
  for (const f of pages) assert.doesNotMatch(read(f), /<img[^>]+src="https?:/, `${f} loads no outside images`);
});

test('a thumbnail that fails leaves a play panel and the watch link still works', () => {
  const js = read('js/pages/videos.js'), css = read('css/videos.css');
  assert.equal(thumbFailed({complete: true, naturalWidth: 0}), true, 'broken image');
  assert.equal(thumbFailed({complete: true, naturalWidth: 120}), true, 'YouTube’s small grey placeholder');
  assert.equal(thumbFailed({complete: true, naturalWidth: 1280}), false);
  assert.equal(thumbFailed({complete: false, naturalWidth: 0}), false, 'still loading (lazy)');
  assert.match(js, /img\.addEventListener\('error', check\); img\.addEventListener\('load', check\); check\(\);/);
  assert.match(js, /img\.hidden = true;/);
  assert.match(css, /\.vg-thumb \{[^}]*aspect-ratio: 16 \/ 9;[^}]*background: var\(--navy/, 'the frame keeps its size and colour without the image');
  assert.match(css, /\.vg-thumb::after \{[^}]*border-color: transparent transparent transparent/, 'a play triangle under the image');
  for (const c of cards) assert.match(c.body, /Watch on YouTube/, `${c.id}: watch action independent of the image`);
});

test('filters: forms or sparring and one tradition, accessible, and every card visible without the script', () => {
  assert.match(main, /<div class="vg-filters" id="vg-filters" hidden>/, 'hidden until the script runs');
  for (const g of ['kind', 'tradition']) assert.match(main, new RegExp(`role="group" aria-labelledby="vg-${g}-label"`));
  const chips = [...main.matchAll(/<button type="button" class="vg-chip" data-filter="(\w+)" data-value="(\w+)" aria-pressed="(true|false)">([^<]+)<\/button>/g)];
  assert.deepEqual(chips.map(c => c[4]), ['All', 'Forms', 'Sparring', 'All', 'WT/Kukkiwon', 'ITF', 'ATA']);
  assert.match(main, /<p class="vg-count" id="vg-count" aria-live="polite">Showing all 7 videos\.<\/p>/);
  assert.doesNotMatch(main, /<li class="vg-card"[^>]*hidden/);
  const all = cards.map(c => ({kind: c.kind, tradition: c.tradition})), n = s => all.filter(c => matches(c, s)).length;
  assert.equal(n({kind: 'all', tradition: 'all'}), 7);
  assert.equal(n({kind: 'form', tradition: 'all'}), 5); assert.equal(n({kind: 'sparring', tradition: 'all'}), 2);
  assert.equal(n({kind: 'all', tradition: 'wt'}), 5); assert.equal(n({kind: 'all', tradition: 'itf'}), 1); assert.equal(n({kind: 'all', tradition: 'ata'}), 1);
  assert.equal(n({kind: 'sparring', tradition: 'itf'}), 0, 'an empty combination is possible');
  assert.equal(countText(7, 7), 'Showing all 7 videos.'); assert.equal(countText(2, 7), 'Showing 2 of 7 videos.'); assert.equal(countText(0, 7), 'Showing 0 of 7 videos.');
  assert.match(main, /<p class="vg-empty" id="vg-empty" hidden>No videos match both filters yet\. <button type="button" class="vg-reset" id="vg-reset">Show all videos<\/button><\/p>/);
});

test('the gallery is easy to find, and About says where its preview images come from', () => {
  const pages = JSON.parse(read('layout/pages.json')).pages;
  assert.ok(pages.some(p => p.file === 'videos.html' && p.sitemap && p.key === 'forms'));
  assert.match(read('sitemap.xml'), /https:\/\/tkdflow\.com\/videos\.html/);
  assert.match(read('layout/footer.html'), /href="\/history\.html">History of taekwondo<\/a><\/li>\s*<li><a href="\/videos\.html">Video gallery<\/a>/);
  assert.match(read('history.html'), /see the <a href="\/videos\.html">video gallery<\/a>/);
  assert.match(main, /<a href="\/history\.html">short history of taekwondo<\/a>/);
  const about = read('about.html');
  assert.match(about, /The preview images on the <a href="\/videos\.html">video gallery<\/a> are supplied by YouTube, and watching a linked video opens YouTube, under YouTube’s own privacy practices\./);
});
