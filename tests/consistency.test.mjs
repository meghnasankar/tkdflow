/* Site consistency: lesson copy describes the camera learners actually have (turn it to any side), and the newer
   learning pages (history, video gallery, referee guide and practice) are linked from the pages people already use. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const pages = JSON.parse(read('layout/pages.json')).pages;
const mainOf = f => { const s = read(f); return s.slice(s.indexOf('<main'), s.indexOf('</main>')); };
const lessons = pages.filter(p => /Study .+ with full-body 3D animation/.test(p.description)).map(p => p.file);

test('lesson copy describes the turnable camera, not fixed camera views', () => {
  assert.equal(lessons.length, 23, 'all 23 lessons');
  for (const p of pages) {
    const html = read(p.file);
    assert.doesNotMatch(html, /camera views|Camera labels/, `${p.file} still describes fixed camera views`);
    assert.doesNotMatch(p.description, /camera views/, `${p.file} description`);
  }
  assert.doesNotMatch(read('data/community.json'), /camera views/);
  for (const f of lessons) assert.match(read(f), /a camera you can turn to any side/, `${f} description`);
  const dataDriven = lessons.filter(f => /Camera directions/.test(read(f)));
  assert.equal(dataDriven.length, 22, 'the 22 data-driven lessons carry the camera note');
  for (const f of dataDriven) {
    const m = mainOf(f);
    assert.match(m, /Camera directions, such as front or left side, are measured from the starting stance\./, f);
    assert.match(m, /Turn the camera to any side and slow the playback to study stance, target height and movement paths\./, f);
  }
  // The direction words used in that note are the ones the camera announces.
  assert.match(read('js/animation/camera-rig.js'), /const names=\['front','front-left','left side',/);
  assert.match(mainOf('index.html'), /Full-body 3D lessons with spoken instructions, a camera you can turn to any side and slower speeds/);
});

test('the newer learning pages are linked from the hub pages, not only the footer', () => {
  const linksTo = (from, to) => new RegExp(`href="/${to.replace('.', '\\.')}"`).test(mainOf(from));
  const expect = {
    'history.html': ['start-here.html', 'forms.html', 'videos.html'],
    'videos.html': ['index.html', 'start-here.html', 'forms.html', 'history.html', 'about.html'],
    'referee-guide.html': ['start-here.html', 'competitions.html', 'first-tournament.html', 'referee.html'],
    'referee.html': ['index.html', 'start-here.html', 'competitions.html', 'first-tournament.html', 'referee-guide.html']
  };
  for (const [to, froms] of Object.entries(expect)) {
    for (const from of froms) assert.ok(linksTo(from, to), `${from} links to ${to} in its content`);
    assert.ok(pages.filter(p => p.file !== to && linksTo(p.file, to)).length >= 3, `${to} has at least three in-content links`);
  }
  // Where the links sit: the styles and tournament sections of Start here, the forms tools, the events notice, home cards.
  const sh = read('start-here.html');
  const styles = sh.slice(sh.indexOf('id="sh-styles"'), sh.indexOf('</section>', sh.indexOf('id="sh-styles"')));
  assert.match(styles, /<a href="\/history\.html">short history of taekwondo<\/a>\. To see each style performed, open the <a href="\/videos\.html">video gallery<\/a>/);
  const tour = sh.slice(sh.indexOf('id="sh-tournament"'), sh.indexOf('</section>', sh.indexOf('id="sh-tournament"')));
  assert.match(tour, /read the <a href="\/referee-guide\.html">referee guide<\/a> and try the <a href="\/referee\.html">3D referee practice<\/a>/);
  assert.match(read('forms.html'), /<ul class="hero-tools" aria-label="More forms tools">[\s\S]*?<li><a href="\/videos\.html">Video gallery<\/a><\/li>\s*<li><a href="\/history\.html">History of taekwondo<\/a><\/li>\s*<\/ul>/);
  assert.match(read('competitions.html'), /<p class="events-guide-link">[^]*?Read the <a href="\/referee-guide\.html">referee guide<\/a> or try the <a href="\/referee\.html">3D referee practice<\/a>\.<\/p>/);
  assert.match(mainOf('index.html'), /<a class="feature-link" href="\/videos\.html">Watch the video gallery →<\/a>/);
  assert.match(mainOf('index.html'), /<a class="feature-link" href="\/referee\.html">Referee practice →<\/a>/);
});
