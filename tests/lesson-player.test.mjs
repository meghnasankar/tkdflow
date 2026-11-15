import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LessonPlayer } from '../js/lib/lesson-player.js';
import { POSES, LESSON } from '../js/lessons/taegeuk-1-data.js';

/** Manual clock so playback can be stepped deterministically. */
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

function setup(count = 5) {
  const clock = fakeClock();
  const p = new LessonPlayer(count, { holdMs: 100, transitionMs: 0, schedule: clock.schedule, cancel: clock.cancel });
  const events = [];
  p.subscribe((s) => events.push(s));
  return { p, clock, events };
}

test('every navigation action emits one state with the new index', () => {
  const { p, events } = setup();
  p.next(); p.next(); p.prev(); p.last(); p.first(); p.select(3);
  assert.deepEqual(events.map((e) => e.index), [1, 2, 1, 4, 0, 3]);
  assert.deepEqual(events.map((e) => e.cause), ['next', 'next', 'prev', 'last', 'first', 'select']);
  assert.ok(events.every((e) => e.playing === false));
});

test('next/prev clamp at the ends', () => {
  const { p } = setup(3);
  p.prev(); assert.equal(p.index, 0);
  p.last(); p.next(); assert.equal(p.index, 2);
  p.select(99); assert.equal(p.index, 2);
  p.select(-5); assert.equal(p.index, 0);
  p.select('x'); assert.equal(p.index, 0);
});

test('playback advances, stops at the end, and replay restarts from the first pose', () => {
  const { p, clock, events } = setup(3);
  p.play();
  clock.tick(100); clock.tick(100);
  assert.equal(p.index, 2);
  clock.tick(100);
  assert.equal(p.playing, false);
  assert.equal(events.at(-1).cause, 'ended');
  p.play(); // replay
  assert.equal(p.index, 0);
  assert.equal(events.at(-1).index, 0, 'UI receives the reset index immediately');
  assert.equal(events.at(-1).playing, true);
});

test('pause keeps the position; resume continues from it', () => {
  const { p, clock } = setup(5);
  p.play(); clock.tick(100);
  assert.equal(p.index, 1);
  p.pause(); clock.tick(1000);
  assert.equal(p.index, 1, 'no advance while paused');
  assert.equal(clock.pending(), 0, 'timer cleared');
  p.play(); clock.tick(100);
  assert.equal(p.index, 2);
});

test('manual navigation during playback pauses it and leaves no stray timers', () => {
  const { p, clock } = setup(5);
  p.play(); p.next();
  assert.equal(p.playing, false);
  assert.equal(clock.pending(), 0);
  clock.tick(1000);
  assert.equal(p.index, 1);
});

test('lesson data: official movement numbers are separate from animation poses and agree everywhere', () => {
  assert.equal(POSES.length, LESSON.poseCount);
  const official = new Set(POSES.flatMap((p) => p.official ?? []));
  assert.deepEqual([...official].sort((a, b) => a - b), Array.from({ length: LESSON.officialMovements }, (_, i) => i + 1));
  const forms = JSON.parse(await_read());
  assert.equal(forms.find((f) => f.id === 'taegeuk-1').moves, LESSON.officialMovements, 'library and lesson agree');
  for (const p of POSES) for (const k of ['head', 'neck', 'ls', 'rs', 'le', 're', 'lh', 'rh', 'lhi', 'rhi', 'lk', 'rk', 'lf', 'rf']) {
    assert.ok(Array.isArray(p.p[k]) && p.p[k].length === 2, `${p.name} has ${k}`);
  }
  assert.equal(LESSON.mappingStatus, 'draft');
  assert.equal(LESSON.review.status, 'pending');
  assert.equal(LESSON.review.reviewer, null, 'no reviewer may be recorded without a real review');
  const kihaps = POSES.filter((p) => p.kihap).flatMap((p) => p.official);
  assert.deepEqual(kihaps, LESSON.kihapMovements);
});

import { readFileSync } from 'node:fs';
function await_read() { return readFileSync(new URL('../data/forms.json', import.meta.url), 'utf8'); }
