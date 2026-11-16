import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LessonPlayer } from '../js/lib/lesson-player.js';
import { POSES } from '../js/lessons/taegeuk-1-data.js';
import {
  parsePoseParam, poseLinkProblemText, poseUrl, createPoseHistory, playerKeyAction, handlePlayerKey,
  createLifecyclePause, copyText, copyStatusText, poseDescription,
} from '../js/lib/lesson-nav.js';

const COUNT = POSES.length; // 20 animation poses

/** Manual clock so playback timers can be stepped and counted. */
function fakeClock() {
  let now = 0; let id = 0; const timers = new Map();
  return {
    schedule: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; },
    cancel: (i) => timers.delete(i),
    tick(ms) {
      now += ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        due[1].fn();
      }
    },
    pending: () => timers.size,
  };
}

function makePlayer() {
  const clock = fakeClock();
  const player = new LessonPlayer(COUNT, { holdMs: 100, transitionMs: 0, schedule: clock.schedule, cancel: clock.cancel });
  const events = [];
  player.subscribe((s) => events.push(s));
  return { player, clock, events };
}

/** EventTarget that counts live listeners per type. */
function countingTarget(extra = {}) {
  const t = new EventTarget();
  const live = new Map();
  const add = t.addEventListener.bind(t);
  const remove = t.removeEventListener.bind(t);
  t.addEventListener = (type, fn, o) => { add(type, fn, o); live.set(type, (live.get(type) ?? 0) + 1); };
  t.removeEventListener = (type, fn, o) => { remove(type, fn, o); live.set(type, (live.get(type) ?? 0) - 1); };
  t.listeners = (type) => live.get(type) ?? 0;
  return Object.assign(t, extra);
}

/** Minimal window: location + history.pushState + back(). */
function fakeWindow(href) {
  const entries = [new URL(href)];
  let at = 0;
  const location = {
    get href() { return entries[at].href; },
    get origin() { return entries[at].origin; },
    get search() { return entries[at].search; },
    get hash() { return entries[at].hash; },
  };
  const win = countingTarget({ location });
  win.history = {
    pushState(_s, _t, url) { entries.splice(at + 1, Infinity, new URL(url, entries[at])); at += 1; },
    get length() { return entries.length; },
  };
  win.back = () => { at -= 1; win.dispatchEvent(new Event('popstate')); };
  win.forward = () => { at += 1; win.dispatchEvent(new Event('popstate')); };
  /** Same-document fragment navigation (skip link, “Jump to the player”). */
  win.goToHash = (hash) => { win.history.pushState(null, '', hash); win.dispatchEvent(new Event('popstate')); };
  return win;
}

describe('pose deep links', () => {
  test('valid 1-based pose numbers map to 0-based indexes', () => {
    assert.deepEqual(parsePoseParam('?pose=7', COUNT), { index: 6, problem: null });
    assert.deepEqual(parsePoseParam('?pose=1', COUNT), { index: 0, problem: null });
    assert.deepEqual(parsePoseParam(`?pose=${COUNT}`, COUNT), { index: COUNT - 1, problem: null });
    assert.deepEqual(parsePoseParam('?utm=x&pose=3', COUNT), { index: 2, problem: null }, 'other parameters are ignored');
    assert.deepEqual(parsePoseParam('', COUNT), { index: null, problem: null });
    assert.deepEqual(parsePoseParam('?other=1', COUNT), { index: null, problem: null });
  });

  test('malformed, out-of-range and duplicate values fall back with a reason', () => {
    for (const v of ['07', '7.0', '+7', ' 7', '7 ', '1e1', '0x7', '', '-1', '0', 'seven', '٧', '7abc', '1000', '99999999999999999999']) {
      const r = parsePoseParam(`?pose=${encodeURIComponent(v)}`, COUNT);
      assert.equal(r.index, null, `"${v}" must not select a pose`);
      assert.equal(r.problem, 'malformed', `"${v}"`);
    }
    assert.deepEqual(parsePoseParam(`?pose=${COUNT + 1}`, COUNT), { index: null, problem: 'out-of-range' });
    assert.deepEqual(parsePoseParam('?pose=999', COUNT), { index: null, problem: 'out-of-range' });
    assert.deepEqual(parsePoseParam('?pose=3&pose=3', COUNT), { index: null, problem: 'duplicate' });
    assert.deepEqual(parsePoseParam('?pose=3&pose=9', COUNT), { index: null, problem: 'duplicate' });
    for (const p of ['malformed', 'out-of-range', 'duplicate']) {
      assert.match(poseLinkProblemText(p, COUNT), /starts at pose 1\.$/);
    }
    assert.equal(poseLinkProblemText(null, COUNT), '');
  });

  test('links keep the current http(s) origin and copy nothing else from the URL', () => {
    assert.equal(poseUrl('http://localhost:8901', 6), 'http://localhost:8901/taegeuk-1.html?pose=7#player');
    assert.equal(poseUrl('https://tkdflow-git-branch.vercel.app', 0), 'https://tkdflow-git-branch.vercel.app/taegeuk-1.html?pose=1#player');
    assert.equal(poseUrl('https://tkdflow.com/evil/path?x="><b>#y', 19), 'https://tkdflow.com/taegeuk-1.html?pose=20#player');
    for (const bad of ['null', 'javascript:alert(1)', 'data:text/html,x', '', undefined, 'file:///etc']) {
      assert.equal(poseUrl(bad, 2), '/taegeuk-1.html?pose=3#player', `untrusted origin ${bad} gives a relative link`);
    }
  });

  test('a valid link opens its pose paused, with no playback timer', () => {
    const { player, clock } = makePlayer();
    const win = fakeWindow('http://localhost:8901/taegeuk-1.html?pose=7#player');
    const problems = [];
    const h = createPoseHistory({ win, player, count: COUNT, onProblem: (p) => problems.push(p) });
    h.start();
    assert.equal(player.index, 6);
    assert.equal(player.playing, false);
    assert.equal(clock.pending(), 0);
    clock.tick(5000);
    assert.equal(player.index, 6, 'no autoplay');
    assert.deepEqual(problems, [null]);
  });

  test('a bad link shows pose 1 and reports the problem once', () => {
    const { player } = makePlayer();
    player.select(4);
    const win = fakeWindow('http://localhost:8901/taegeuk-1.html?pose=99#player');
    const problems = [];
    createPoseHistory({ win, player, count: COUNT, onProblem: (p) => problems.push(p) }).start();
    assert.equal(player.index, 0);
    assert.deepEqual(problems, ['out-of-range']);
  });

  test('start() is idempotent: one popstate listener; destroy() removes it', () => {
    const { player } = makePlayer();
    const win = fakeWindow('http://localhost:8901/taegeuk-1.html');
    const h = createPoseHistory({ win, player, count: COUNT });
    h.start(); h.start(); h.start();
    assert.equal(win.listeners('popstate'), 1);
    h.destroy(); h.destroy();
    assert.equal(win.listeners('popstate'), 0);
  });

  test('push records the pose in history; back and forward restore poses paused', () => {
    const { player, events } = makePlayer();
    const win = fakeWindow('http://localhost:8901/taegeuk-1.html');
    const h = createPoseHistory({ win, player, count: COUNT });
    h.start();
    player.select(4);
    const url = h.push(player.index);
    assert.equal(url, 'http://localhost:8901/taegeuk-1.html?pose=5#player');
    assert.equal(win.location.search, '?pose=5');
    h.push(player.index);
    assert.equal(win.history.length, 2, 'pushing the same pose twice adds one entry');

    player.select(11);
    h.push(player.index);
    player.play();
    win.back(); // → ?pose=5
    assert.equal(player.index, 4);
    assert.equal(player.playing, false, 'history navigation pauses');
    win.back(); // → no pose
    assert.equal(player.index, 0);
    win.forward();
    assert.equal(player.index, 4);
    assert.equal(events.at(-1).cause, 'link');
  });

  test('activating a pose link during playback holds that pose paused, even for the same URL', () => {
    const { player, clock } = makePlayer();
    const win = fakeWindow('http://localhost:8901/taegeuk-1.html?pose=7#player');
    const h = createPoseHistory({ win, player, count: COUNT });
    h.start();
    player.play();
    h.push(player.index);
    assert.equal(player.index, 6);
    assert.equal(player.playing, false);
    assert.equal(clock.pending(), 0);
    clock.tick(5000);
    assert.equal(player.index, 6);
    assert.equal(win.location.search, '?pose=7');
    assert.equal(win.history.length, 1, 'the existing URL does not gain a duplicate entry');
  });

  test('fragment-only navigation (skip link / “Jump to the player”) never changes the pose', () => {
    const { player } = makePlayer();
    const win = fakeWindow('http://localhost:8901/taegeuk-1.html?pose=7');
    createPoseHistory({ win, player, count: COUNT }).start();
    player.select(9); // the learner moved on after opening the link
    win.goToHash('#player');
    assert.equal(player.index, 9);
    win.goToHash('#main');
    assert.equal(player.index, 9);
    win.back();
    assert.equal(player.index, 9);
  });
});

describe('scoped keyboard controls', () => {
  const region = { tagName: 'DIV' };
  const button = { tagName: 'BUTTON' };
  const link = { tagName: 'A' };
  const key = (k, target = region, mods = {}) => playerKeyAction({ key: k, target, ...mods }, region);

  test('on the player region: arrows step, Home/End jump, Space and K toggle', () => {
    assert.equal(key('ArrowLeft'), 'prev');
    assert.equal(key('ArrowRight'), 'next');
    assert.equal(key('Home'), 'first');
    assert.equal(key('End'), 'last');
    assert.equal(key(' '), 'toggle');
    assert.equal(key('k'), 'toggle');
  });

  test('buttons and links keep Space/Enter; arrows still step from them', () => {
    assert.equal(key(' ', button), null);
    assert.equal(key('Enter', button), null);
    assert.equal(key(' ', link), null);
    assert.equal(key('Enter', link), null);
    assert.equal(key('ArrowRight', button), 'next');
    assert.equal(key('k', button), 'toggle');
  });

  test('range, select, text fields and editable content keep every key', () => {
    const targets = [
      { tagName: 'INPUT', type: 'range' }, { tagName: 'SELECT' }, { tagName: 'INPUT', type: 'text' },
      { tagName: 'TEXTAREA' }, { tagName: 'DIV', isContentEditable: true },
    ];
    for (const t of targets) for (const k of ['ArrowLeft', 'ArrowRight', 'Home', 'End', ' ', 'k']) {
      assert.equal(key(k, t), null, `${t.tagName}${t.type ? `[${t.type}]` : ''} keeps ${JSON.stringify(k)}`);
    }
  });

  test('modified keys, composition, handled events and menu keys are left alone', () => {
    for (const mods of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }]) {
      for (const k of ['ArrowLeft', 'ArrowRight', 'Home', 'End', ' ']) assert.equal(key(k, region, mods), null, `${Object.keys(mods)[0]}+${k}`);
    }
    assert.equal(key('K', region, { shiftKey: true }), null);
    assert.equal(key('ArrowRight', region, { isComposing: true }), null);
    assert.equal(key('ArrowRight', region, { defaultPrevented: true }), null);
    for (const k of ['Escape', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'PageDown', 'j', 'l', '/']) assert.equal(key(k), null, k);
    assert.equal(playerKeyAction(null, region), null);
  });

  test('holding a toggle key consumes repeats without toggling or scrolling; step keys still repeat', () => {
    const { player } = makePlayer();
    let prevented = 0;
    const press = (key, repeat = false, target = region) => handlePlayerKey({
      key, repeat, target, preventDefault() { prevented += 1; },
    }, region, player);
    for (const key of [' ', 'k']) {
      player.pause();
      assert.equal(press(key), true);
      assert.equal(player.playing, true);
      press(key, true); press(key, true);
      assert.equal(player.playing, true, 'one physical press toggles once');
      press(key);
      assert.equal(player.playing, false, 'a fresh press toggles again');
    }
    assert.equal(prevented, 8, 'all handled toggle events suppress their default action');
    press('ArrowRight'); press('ArrowRight', true);
    assert.equal(player.index, 2);
    assert.equal(press(' ', false, button), false, 'native button Space is untouched');
    player.destroy();
  });

  test('keyboard actions drive the player and manual steps pause playback', () => {
    const { player, clock } = makePlayer();
    const press = (k, target = region) => { const a = key(k, target); if (a) player[a](); };
    press('End'); assert.equal(player.index, COUNT - 1);
    press(' '); assert.equal(player.playing, true); assert.equal(player.index, 0, 'Space at the last pose replays from the start');
    clock.tick(100); assert.equal(player.index, 1);
    press('ArrowRight'); assert.equal(player.playing, false); assert.equal(player.index, 2);
    assert.equal(clock.pending(), 0);
    press('ArrowLeft'); press('Home'); assert.equal(player.index, 0);
    press('k'); assert.equal(player.playing, true); press('k'); assert.equal(player.playing, false);
  });
});

describe('pause when hidden or left', () => {
  function setup() {
    const { player, clock, events } = makePlayer();
    const doc = countingTarget({ visibilityState: 'visible' });
    const win = countingTarget();
    let settled = 0;
    const life = createLifecyclePause({ doc, win, player, onHide: () => { settled += 1; } });
    life.start();
    const setVisibility = (v) => { doc.visibilityState = v; doc.dispatchEvent(new Event('visibilitychange')); };
    return { player, clock, events, doc, win, life, setVisibility, settled: () => settled };
  }

  test('hiding the page pauses, clears the timer and never resumes', () => {
    const { player, clock, setVisibility, settled } = setup();
    player.play(); clock.tick(100);
    assert.equal(player.index, 1);
    setVisibility('hidden');
    assert.equal(player.playing, false);
    assert.equal(clock.pending(), 0);
    assert.equal(settled(), 1, 'canvas animation is settled');
    clock.tick(10_000);
    assert.equal(player.index, 1, 'no advance while hidden');
    setVisibility('visible');
    clock.tick(10_000);
    assert.equal(player.playing, false, 'no auto-resume on return');
    assert.equal(player.index, 1);
    player.play(); clock.tick(100);
    assert.equal(player.index, 2, 'learner resumes from the same pose');
  });

  test('pagehide pauses too', () => {
    const { player, clock, win } = setup();
    player.play();
    win.dispatchEvent(new Event('pagehide'));
    assert.equal(player.playing, false);
    assert.equal(clock.pending(), 0);
  });

  test('becoming visible or hiding while paused changes nothing', () => {
    const { player, events, setVisibility } = setup();
    player.select(5);
    const before = events.length;
    setVisibility('visible');
    setVisibility('hidden');
    assert.equal(events.length, before, 'no extra state change when already paused');
    assert.equal(player.index, 5);
  });

  test('hidden after the last pose ended: stays ended, then Play replays from the start', () => {
    const { player, clock, events, setVisibility } = setup();
    player.select(COUNT - 2);
    player.play();
    clock.tick(100); clock.tick(100);
    assert.equal(events.at(-1).cause, 'ended');
    setVisibility('hidden');
    setVisibility('visible');
    assert.equal(player.index, COUNT - 1);
    assert.equal(player.playing, false);
    player.play();
    assert.equal(player.index, 0);
    assert.equal(player.playing, true);
  });

  test('a hide that lands exactly as the last advance fires leaves no timer and no playing state', () => {
    const { player, clock, setVisibility } = setup();
    player.select(COUNT - 2);
    player.play();
    clock.tick(100); // advance to last pose; next timer will end playback
    setVisibility('hidden');
    assert.equal(player.playing, false);
    assert.equal(clock.pending(), 0);
    clock.tick(1000);
    assert.equal(player.index, COUNT - 1);
  });

  test('listeners are added once and removed on destroy', () => {
    const { doc, win, life } = setup();
    life.start();
    assert.equal(doc.listeners('visibilitychange'), 1);
    assert.equal(win.listeners('pagehide'), 1);
    life.destroy();
    assert.equal(doc.listeners('visibilitychange'), 0);
    assert.equal(win.listeners('pagehide'), 0);
  });
});

describe('copy pose link', () => {
  test('success, missing API, refusal and a hanging prompt all resolve', async () => {
    const written = [];
    assert.deepEqual(await copyText('u', { clipboard: { writeText: async (t) => { written.push(t); } } }), { ok: true });
    assert.deepEqual(written, ['u']);
    assert.deepEqual(await copyText('u', { clipboard: undefined }), { ok: false, reason: 'unavailable' });
    assert.deepEqual(await copyText('u', { clipboard: {} }), { ok: false, reason: 'unavailable' });
    assert.deepEqual(await copyText('u', { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } }), { ok: false, reason: 'denied' });
    assert.deepEqual(await copyText('u', { clipboard: { writeText: () => { throw new Error('sync'); } } }), { ok: false, reason: 'denied' });
    const hang = await copyText('u', { clipboard: { writeText: () => new Promise(() => {}) }, timeoutMs: 20 });
    assert.deepEqual(hang, { ok: false, reason: 'timeout' });
  });

  test('the deadline timer is cleared when the copy finishes', async () => {
    const live = new Set(); let id = 0;
    const schedule = () => { live.add(++id); return id; };
    const cancel = (i) => live.delete(i);
    await copyText('u', { clipboard: { writeText: async () => {} }, schedule, cancel });
    assert.equal(live.size, 0);
  });

  test('status text names the pose and offers a manual fallback on failure', () => {
    assert.equal(copyStatusText({ ok: true }, 7), 'Link to pose 7 copied.');
    for (const reason of ['unavailable', 'denied', 'timeout']) {
      const t = copyStatusText({ ok: false, reason }, 7);
      assert.match(t, /pose 7/);
      assert.match(t, /selected below/);
      assert.doesNotMatch(t, /copied\./);
    }
  });
});

describe('page wiring', () => {
  const html = readFileSync(new URL('../taegeuk-1.html', import.meta.url), 'utf8');

  test('canvas description identifies the selected pose and keeps pose and movement numbers apart', () => {
    POSES.forEach((pose, i) => {
      const d = poseDescription(pose, i, COUNT);
      assert.ok(d.startsWith(`3D character, pose ${i + 1} of ${COUNT}: ${pose.name}`), d);
      if (pose.official) assert.match(d, /Movements? \d+.*draft numbering\.$/);
      else assert.doesNotMatch(d, /Movement/);
    });
    const descs = new Set(POSES.map((p, i) => poseDescription(p, i, COUNT)));
    assert.equal(descs.size, COUNT, 'every pose has a distinct description');
  });

  test('warning stays visible; detailed questions start collapsed; jump link reaches the player', () => {
    const notice = html.slice(html.indexOf('id="review-notice"'), html.indexOf('class="lesson-layout"'));
    assert.match(notice, /Not yet reviewed by a qualified instructor\./);
    const details = notice.match(/<details\b[^>]*>/);
    assert.ok(details, 'open questions are in a disclosure');
    assert.doesNotMatch(details[0], /\sopen\b/, 'collapsed initially');
    assert.ok(notice.indexOf('Not yet reviewed') < notice.indexOf('<details'), 'warning is outside the disclosure');
    assert.match(notice, /<summary>[^<]+<\/summary>/);
    assert.match(notice, /id="review-questions"/);
    assert.match(html, /href="#player"[^>]*>Jump to the player</);
    assert.match(html, /id="player"/);
    assert.ok(html.indexOf('Jump to the player') < html.indexOf('id="review-notice"'), 'jump link sits with the introduction');
  });

  test('keyboard region is focusable, labelled and described by visible help', () => {
    const tag = html.match(/<div[^>]*id="player-region"[^>]*>/)?.[0];
    assert.ok(tag);
    assert.match(tag, /tabindex="0"/);
    assert.match(tag, /aria-labelledby="player-title"/);
    assert.match(tag, /aria-describedby="player-keys"/);
    const help = html.match(/<p class="player-keys" id="player-keys">([\s\S]*?)<\/p>/)?.[1] ?? '';
    for (const k of ['←', '→', 'Home', 'End', 'Space', 'K']) assert.ok(help.includes(`<kbd>${k}</kbd>`), k);
    assert.doesNotMatch(html.slice(html.indexOf('id="player-keys"') - 40, html.indexOf('id="player-keys"')), /sr-only|hidden/);
  });

  test('pose link and copy control are present with a status region and a labelled manual-copy field', () => {
    assert.match(html, /<a class="pose-link" id="pose-link" href="\/taegeuk-1\.html\?pose=1#player">Link to pose 1<\/a>/);
    assert.match(html, /id="btn-copy-link">Copy pose link</);
    assert.match(html, /id="player-status" role="status"/);
    assert.match(html, /<div class="pose-fallback" id="copy-fallback" hidden>/);
    assert.match(html, /<input type="text" id="pose-url" readonly>/);
    assert.match(html, /not the form’s movements/);
  });

  test('the lesson script uses no browser storage and starts no playback on load', () => {
    const src = readFileSync(new URL('../js/pages/lesson-player.js', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|document\.cookie/);
    assert.doesNotMatch(src.slice(src.indexOf('function init()')), /\.play\(\)/, 'init never starts playback');
  });
});
