/* Referee Practice view (Batch 44): the arena and the call panel side by side, a compact phone order, an optional
   focus mode, and practice progress that is validated, browser-only and honestly labelled. Scoring is unchanged:
   tests/referee.test.mjs still checks every scenario's answer against the rule texts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENARIOS} from '../js/referee/scenarios.js';
import {decide} from '../js/referee/rules.js';
import {STORE_KEY, sanitize, createProgress, progressText, savedNote} from '../js/referee/progress.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const IDS = SCENARIOS.map(s => s.id);
/* A Storage stand-in that can be told to fail reads or writes. */
function fakeStorage(initial, {failGet = false, failSet = false} = {}) {
  const m = new Map(initial === undefined ? [] : [[STORE_KEY, initial]]);
  return {
    map: m,
    getItem(k) { if (failGet) throw new Error('SecurityError'); return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { if (failSet) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem(k) { if (failSet) throw new Error('blocked'); m.delete(k); }
  };
}

test('saved progress is validated against the 16 scenario ids and true/false results', () => {
  assert.equal(IDS.length, 16);
  assert.deepEqual(sanitize(JSON.stringify({'wt-trunk-kick': true, 'wt-punch': false}), IDS), {answers: {'wt-trunk-kick': true, 'wt-punch': false}, dropped: 0, malformed: false});
  const mixed = sanitize(JSON.stringify({'wt-head-kick': true, 'wt-punch': 'yes', 'wt-boundary': 1, 'made-up': true, 'aau-youth-turning-head': false}), IDS);
  assert.deepEqual(mixed.answers, {'wt-head-kick': true, 'aau-youth-turning-head': false}); assert.equal(mixed.dropped, 3); assert.equal(mixed.malformed, true);
  for (const bad of ['{not json', '[true,false]', '42', '"text"', 'true']) {
    const r = sanitize(bad, IDS); assert.deepEqual(r.answers, {}, bad); assert.equal(r.malformed, true, bad);
  }
  const proto = sanitize('{"__proto__": true, "constructor": false, "wt-punch": true}', IDS);
  assert.deepEqual(Object.keys(proto.answers), ['wt-punch']); assert.equal(Object.getPrototypeOf(proto.answers), Object.prototype, 'no prototype pollution');
  assert.deepEqual(sanitize(null, IDS), {answers: {}, dropped: 0, malformed: false}, 'nothing saved yet');
});

test('malformed or unavailable storage recovers safely, and saving is only claimed when a write works', () => {
  // Healthy storage: answers load; recording writes clean JSON of known ids only.
  let s = fakeStorage(JSON.stringify({'wt-punch': true})), p = createProgress(s, IDS);
  assert.equal(p.status, 'saved'); assert.deepEqual(p.answers, {'wt-punch': true});
  assert.equal(p.setResult('wt-trunk-kick', false), true); assert.deepEqual(JSON.parse(s.map.get(STORE_KEY)), {'wt-punch': true, 'wt-trunk-kick': false});
  assert.equal(p.setResult('not-a-scenario', true), false); assert.equal(p.setResult('wt-head-kick', 'yes'), false);
  assert.deepEqual(JSON.parse(s.map.get(STORE_KEY)), {'wt-punch': true, 'wt-trunk-kick': false}, 'invalid records never reach storage');
  assert.equal(s.map.size, 1, 'one key; the write probe leaves nothing behind');
  // Partly unreadable: valid answers kept, the rest removed from storage, and the label says so.
  s = fakeStorage(JSON.stringify({'wt-punch': true, junk: 'x'})); p = createProgress(s, IDS);
  assert.equal(p.status, 'repaired'); assert.deepEqual(JSON.parse(s.map.get(STORE_KEY)), {'wt-punch': true});
  // Wholly unreadable: cleared.
  s = fakeStorage('{not json'); p = createProgress(s, IDS);
  assert.equal(p.status, 'recovered'); assert.equal(s.map.has(STORE_KEY), false); assert.deepEqual(p.answers, {});
  // Storage that can't be read, can't be written, or doesn't exist: the page works for the visit and says so.
  for (const [label, st] of [['storage blocked (read and write)', fakeStorage(undefined, {failGet: true, failSet: true})], ['write blocked', fakeStorage(undefined, {failSet: true})], ['no storage', null]]) {
    p = createProgress(st, IDS);
    assert.equal(p.status, 'unavailable', label);
    assert.equal(p.setResult('wt-punch', true), false, label); assert.equal(p.status, 'unavailable', label);
    assert.deepEqual(p.answers, {'wt-punch': true}, `${label}: still counted for this visit`);
    assert.doesNotMatch(savedNote(p.status), /saved in this browser/i, `${label}: no claim of saving`);
  }
  // A write that starts failing later flips the label at once.
  s = fakeStorage(undefined); p = createProgress(s, IDS); assert.equal(p.status, 'saved');
  s.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(p.setResult('wt-punch', true), false); assert.equal(p.status, 'unavailable');
  // Reset clears storage and reports it; if storage refuses, it clears for this visit only.
  s = fakeStorage(JSON.stringify({'wt-punch': true})); p = createProgress(s, IDS);
  assert.equal(p.clear(), true); assert.equal(p.status, 'cleared'); assert.equal(s.map.has(STORE_KEY), false); assert.deepEqual(p.answers, {});
  p = createProgress(fakeStorage(undefined, {failSet: true}), IDS); p.setResult('wt-punch', true);
  assert.equal(p.clear(), false); assert.equal(p.status, 'unavailable'); assert.deepEqual(p.answers, {});
});

test('the progress label is accurate, and nothing is stored or sent beyond the per-scenario results', () => {
  assert.equal(STORE_KEY, 'tkdflow.refereePractice.v1', 'existing progress keeps working');
  assert.equal(progressText({}, 16), '16 scenarios to try');
  assert.equal(progressText({'wt-punch': true, 'wt-head-kick': false}, 16), '1 of 2 answered correctly, 2 of 16 tried');
  assert.equal(savedNote('saved'), 'Saved in this browser only.');
  assert.match(savedNote('repaired'), /couldn’t be read and were removed; the rest are saved in this browser only/);
  assert.match(savedNote('recovered'), /couldn’t be read, so it was reset/);
  assert.equal(savedNote('unavailable'), 'This browser isn’t saving progress, so it lasts only until you leave the page.');
  assert.equal(savedNote('cleared'), 'Progress cleared from this browser.');
  for (const f of ['js/referee/progress.js', 'js/pages/referee.js']) assert.doesNotMatch(read(f), /fetch\(|XMLHttpRequest|sendBeacon|supabase|sessionStorage|document\.cookie/, `${f} stays in this browser`);
  assert.doesNotMatch(read('js/pages/referee.js'), /localStorage\.(get|set|remove)Item/, 'all storage goes through progress.js');
  // Answers are still decided by the rules engine, never by stored data.
  for (const s of SCENARIOS) { const d = decide(s.profile, s.facts); assert.equal(s.options.filter(o => o.outcome.blue === d.blue && o.outcome.red === d.red).length, 1, s.id); }
});

test('desktop: the arena and the call panel sit side by side; phone: one compact column', () => {
  const html = read('referee.html'), main = html.slice(html.indexOf('<main'), html.indexOf('</main>')), css = read('css/referee.css');
  const practice = main.slice(main.indexOf('<section class="rf-practice" id="rf-practice" aria-labelledby="rf-title">'), main.indexOf('</section>', main.indexOf('id="rf-saved-note"')));
  assert.ok(practice.length > 1000, 'practice section');
  const order = ['rf-head', 'rf-prev', 'rf-count', 'rf-next-top', 'rf-focus', 'rf-canvas', 'rf-play', 'rf-scrub', 'rf-evidence-title', 'rf-options', 'rf-feedback', 'rf-steps', 'rf-next', 'rf-progress', 'rf-reset', 'rf-confirm'];
  const at = order.map(id => practice.indexOf(`id="${id}"`));
  assert.ok(at.every(i => i > 0), 'all parts inside the practice section'); assert.deepEqual([...at].sort((a, b) => a - b), at, 'in reading order');
  assert.ok(practice.indexOf('<div class="rf-stage">') < practice.indexOf('<div class="rf-panel">'), 'arena first, then the panel');
  assert.match(practice, /<canvas id="rf-canvas" class="rf-canvas" aria-describedby="rf-steps"/, 'the canvas is described by the step-by-step text');
  assert.match(practice, /<details class="rf-steps" id="rf-steps-box">\s*<summary id="rf-steps-title">What happens, step by step<\/summary>\s*<ol id="rf-steps"><\/ol>/);
  assert.ok(main.indexOf('id="rf-scenarios"') > main.indexOf('id="rf-confirm"'), 'all scenarios listed after the practice area');
  // CSS: two columns from 960 px with the arena kept in view; answers in a 2 × 2 grid; phone compaction.
  assert.match(css, /@media \(min-width: 960px\) \{\s*\.rf-play \{ grid-template-columns: minmax\(0, 1fr\) minmax\(320px, 360px\); align-items: start; \}\s*\.rf-stage \{ position: sticky; top: 84px; \}/);
  assert.match(css, /\.rf-options \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  const phone = css.slice(css.indexOf('@media (max-width: 600px)'), css.indexOf('/* Focus mode'));
  for (const rule of [/\.rf-hint \{ display: none; \}/, /\.rf-word \{ position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect\(0 0 0 0\)/, /\.rf-camera \{ flex-wrap: nowrap;/, /\.rf-bar-tools \{ width: 100%; flex-wrap: nowrap;/]) assert.match(phone, rule);
  // Arrow-only buttons on phones keep their full accessible names.
  assert.match(practice, /id="rf-prev"><span aria-hidden="true">←<\/span><span class="rf-word"> Previous<\/span><span class="sr-only"> scenario<\/span>/);
  assert.match(practice, /id="rf-next-top"><span class="rf-word">Next<\/span><span class="sr-only"> scenario<\/span> <span aria-hidden="true">→<\/span>/);
});

test('the full-body framing is never cropped by layout: the arena is 16:9 in every mode', () => {
  const css = read('css/referee.css');
  const canvasRules = [...css.matchAll(/([^{}]*\.rf-canvas[^{}]*)\{([^}]*)\}/g)];
  assert.ok(canvasRules.some(([, , body]) => /aspect-ratio: 16 \/ 9/.test(body)));
  for (const [, sel, body] of canvasRules) assert.doesNotMatch(body, /height|aspect-ratio: (?!16 \/ 9)|object-fit/, `${sel.trim()} must not change the canvas shape`);
  for (const [, sel, body] of css.matchAll(/([^{}]*\.rf-viewer[^{}]*)\{([^}]*)\}/g)) assert.doesNotMatch(body, /(^|;)\s*(max-)?height/, `${sel.trim()} must not clip the arena`);
  // Focus mode sizes the arena by width from the window height, so the shape (and the framing) stays 16:9.
  assert.match(css, /\.rf-focus \.rf-viewer \{ max-width: calc\(\(100vh - 220px\) \* 16 \/ 9\); max-width: calc\(\(100dvh - 220px\) \* 16 \/ 9\);/);
});

test('focus mode and the reset confirmation are keyboard- and screen-reader-friendly', () => {
  const html = read('referee.html'), js = read('js/pages/referee.js'), css = read('css/referee.css');
  assert.match(html, /<button type="button" class="btn btn-secondary btn-sm rf-focus-toggle" id="rf-focus" aria-pressed="false">Focus mode<\/button>/);
  assert.match(css, /\.rf-focus \.navbar, \.rf-focus \.footer, \.rf-focus \.page-hero, \.rf-focus \.rf-disclaimer, \.rf-focus \.rf-list,\s*\.rf-focus #rf-profiles, \.rf-focus #rf-courses, \.rf-focus \.skip-link \{ display: none; \}/, 'the rest of the page is hidden, so focus stays in the practice area');
  assert.match(css, /\.rf-focus \.rf-practice \{ position: fixed; inset: 0; z-index: 1000;/);
  assert.match(js, /b\.setAttribute\('aria-pressed', String\(on\)\); b\.textContent = on \? 'Exit focus mode' : 'Focus mode';/);
  assert.match(js, /if \(!on\) window\.scrollTo\(\{top: focusReturn, behavior: 'instant'\}\);/, 'leaving restores the scroll position');
  // Escape closes the confirmation first (keeping progress), otherwise leaves focus mode and returns focus to the toggle.
  assert.match(js, /if \(!\$\('rf-confirm'\)\.hidden\) \{ e\.preventDefault\(\); closeConfirm\('Progress kept\.'\); return; \}\s*if \(document\.body\.classList\.contains\('rf-focus'\)\) \{ e\.preventDefault\(\); setFocusMode\(false\); \$\('rf-focus'\)\.focus\(\); \}/);
  // Reset: a labelled inline confirmation, the safe choice focused first, an announcement, focus returned.
  assert.match(html, /<button type="button" class="rf-reset" id="rf-reset" aria-controls="rf-confirm" aria-expanded="false">Reset progress<\/button>/);
  assert.match(html, /<div class="rf-confirm" id="rf-confirm" role="group" aria-labelledby="rf-confirm-text" hidden>\s*<p id="rf-confirm-text">Clear your answers for all 16 scenarios from this browser\? This can’t be undone\.<\/p>/);
  assert.match(html, /<p class="sr-only" id="rf-announce" role="status"><\/p>/);
  assert.match(js, /function openConfirm\(\) \{ \$\('rf-confirm'\)\.hidden = false; \$\('rf-reset'\)\.setAttribute\('aria-expanded', 'true'\); \$\('rf-confirm-no'\)\.focus\(\); \}/);
  assert.match(js, /\$\('rf-reset'\)\.disabled = !Object\.keys\(answers\)\.length;/, 'nothing to reset, nothing to press');
  assert.match(html, /<span class="rf-saved-note" id="rf-saved-note">Your practice progress is saved in this browser only\.<\/span>/);
  assert.match(js, /\$\('rf-saved-note'\)\.textContent = savedNote\(progress\.status\);/, 'the label follows what storage actually did');
  assert.doesNotMatch(js, /window\.confirm|alert\(/);
  // If the 3D view can't load (an error from the arena, or no WebGL at all), the step-by-step text opens by itself.
  assert.match(js, /onError\(\) \{ \$\('rf-status'\)\.textContent = 'The 3D fighters could not load\. The description below has everything needed to answer\.'; \$\('rf-steps-box'\)\.open = true; \}/);
  assert.match(js, /\} catch \{\s*\$\('rf-status'\)\.textContent = 'This browser can’t show the 3D arena\. The description below has everything needed to answer\.';\s*\$\('rf-steps-box'\)\.open = true;/);
});
