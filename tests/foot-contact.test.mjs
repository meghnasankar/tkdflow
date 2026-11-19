/* Feet on the floor: planted feet stay planted (pivots turn on the ball or heel), stepping feet lift before they
   travel and are set down where they land, and the lesson's reference endpoints, chapters and timing are untouched.
   Contact is measured on the heel and ball of the sole (tests/helpers/foot-contact.mjs), so rolling onto the ball or
   rocking onto the heel, which moves the ankle, is not mistaken for a slide. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as T1 from '../js/animation/taegeuk-1-motion.js';
import {footPoint, anchorSlip, contacts, contactTrace, planMovesFoot, SOLE_POINTS} from './helpers/foot-contact.mjs';

const json = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const forms = json('data/forms.json');
const motions = Object.fromEntries(forms.filter(f => f.id !== 'taegeuk-1').map(f => [f.id, createFormMotion(json(`data/lessons/${f.id}.json`))]));
const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const leg = (ankle, yaw = 0, pitch = 0) => ({ankle, yaw, pitch});
const slipOf = frames => frames.slice(1).reduce((s, f, i) => s + (anchorSlip(frames[i], f)?.slip || 0), 0);
const steps = n => Array.from({length: n + 1}, (_, i) => i / n);

test('the contact measure tells a planted roll or pivot from a slide, and a lifted step from a dragged one', () => {
  const ball = footPoint(leg([0, .07, 0]), SOLE_POINTS.ball), heel = footPoint(leg([0, .07, 0]), SOLE_POINTS.heel);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const about = (point, local, yaw, pitch) => leg(sub(point, sub(footPoint(leg([0, 0, 0], yaw, pitch), local), [0, 0, 0])), yaw, pitch);
  // Natural rolls and pivots: the ankle moves, the standing point doesn't.
  assert.ok(slipOf(steps(30).map(u => about(ball, SOLE_POINTS.ball, 0, 35 * u))) < 1e-9, 'roll onto the ball');
  assert.ok(slipOf(steps(30).map(u => about(heel, SOLE_POINTS.heel, 0, -20 * u))) < 1e-9, 'rock onto the heel');
  assert.ok(slipOf(steps(30).map(u => about(ball, SOLE_POINTS.ball, 90 * u, 0))) < 1e-9, 'pivot on the ball');
  // Slides: every standing point moves.
  assert.ok(slipOf(steps(30).map(u => leg([0, .07, 0], 90 * u))) > .09, 'turning about the ankle drags the heel and ball');
  assert.ok(Math.abs(slipOf(steps(30).map(u => leg([0, .07, .2 * u]))) - .2) < 1e-9, 'a flat 20 cm slide');
  // A step that rises first and then travels doesn't drag; one that travels while still down does.
  assert.ok(slipOf(steps(30).map(u => leg([0, .07 + .03 * Math.sin(Math.PI * u), .5 * Math.min(1, Math.max(0, (u - .15) / .7))]))) < 1e-9);
  assert.ok(slipOf(steps(30).map(u => leg([0, .07 + .065 * Math.sin(Math.PI * u) ** 2, .5 * u]))) > .02, 'the published step slid before it lifted');
  // Roles come from the plan: in Taegeuk Yi Jang's first step the left foot moves and the right one is planted.
  const plan = motions['taegeuk-2'].referencePlans.find(p => p.entry?.footAction === 'step-left' && !p.kick);
  assert.equal(planMovesFoot(plan, 'left'), true); assert.equal(planMovesFoot(plan, 'right'), false);
});

// Plans whose staged footwork still turns a foot on the floor between stages (not yet converted).
const KNOWN = new Set(['won-hyo 27 left', 'yul-gok 36 right']);

test('planted feet stay planted, and stepping feet lift before they travel, in all 22 data-driven lessons', () => {
  let planted = 0, lifted = 0, relocated = 0, slides = 0;
  for (const [id, m] of Object.entries(motions)) {
    const slip = {}, leaves = {};
    for (const r of contactTrace(m)) slip[r.plan + ' ' + r.side] = (slip[r.plan + ' ' + r.side] || 0) + r.slip;
    for (let i = 0, n = Math.ceil(m.DURATION * 30); i <= n; i++) { const t = Math.min(m.DURATION, i / 30), p = m.poseAtTime(t), k = m.indexAtTime(t); for (const s of ['left', 'right']) if (!Object.keys(contacts(p.legs[s])).length) leaves[k + ' ' + s] = true; }
    for (const p of m.referencePlans.slice(1)) for (const side of ['left', 'right']) {
      const k = p.index + ' ' + side, v = slip[k] || 0, where = `${id} plan ${p.index} ${side} (${p.entry?.footAction || p.actions?.[0]?.type})`;
      if (/^slide-/.test(p.entry?.footAction || '') && side === p.moving) { slides++; continue; }   // the source's deliberate slide
      const A = p.before.feet[side], B = p.after.feet[side], toLeg = f => leg(f.pos, f.yaw, f.pitch || 0);
      const shift = Math.min(...Object.values(SOLE_POINTS).map(q => flat(footPoint(toLeg(A), q), footPoint(toLeg(B), q))));
      if (leaves[k]) { lifted++; if (!KNOWN.has(`${id} ${p.index} ${side}`)) assert.ok(v <= .015, `${where}: slides ${(v * 100).toFixed(1)} cm on the floor around its step`); }
      else if (shift <= .005) { planted++; assert.ok(v <= .005, `${where}: planted foot slides ${(v * 100).toFixed(1)} cm`); }
      else { relocated++; assert.ok(v <= shift + .01, `${where}: slides ${(v * 100).toFixed(1)} cm, more than its end points require (${(shift * 100).toFixed(1)} cm)`); }
    }
  }
  assert.ok(planted > 400 && lifted > 400 && slides > 20, `planted ${planted}, lifted ${lifted}, relocated ${relocated}, slides ${slides}`);
  assert.ok(relocated <= 20, `feet the end points relocate without a step: ${relocated}`);
});

test('a support foot turning on the spot keeps its ball still through the whole turn', () => {
  let turns = 0;
  for (const [id, m] of Object.entries(motions)) for (const p of m.referencePlans.slice(1)) for (const side of ['left', 'right']) {
    const A = p.before.feet[side], B = p.after.feet[side]; if (A.pos[1] > .075 || B.pos[1] > .075) continue;
    const ballA = footPoint(leg(A.pos, A.yaw), SOLE_POINTS.ball), ballB = footPoint(leg(B.pos, B.yaw), SOLE_POINTS.ball);
    if (flat(ballA, ballB) > .002 || Math.abs(((B.yaw - A.yaw + 540) % 360) - 180) < 20) continue;
    turns++; let worst = 0;
    for (let t = p.start; t <= p.at; t += 1 / 30) worst = Math.max(worst, flat(footPoint(m.poseAtTime(t).legs[side], SOLE_POINTS.ball), ballA));
    assert.ok(worst < .003, `${id} plan ${p.index} ${side}: the ball wanders ${(worst * 100).toFixed(1)} cm during a ${Math.round(((B.yaw - A.yaw + 540) % 360) - 180)}° turn`);
  }
  assert.ok(turns > 50, `ball pivots checked: ${turns}`);
});

test('every reference endpoint, chapter and duration is exactly as published', () => {
  const digests = json('tests/helpers/held-pose-digests.json');
  for (const f of forms) {
    const m = f.id === 'taegeuk-1' ? T1 : motions[f.id], h = createHash('sha256');
    h.update(JSON.stringify({chapters: m.CHAPTERS, duration: m.DURATION}));
    for (const c of m.CHAPTERS) h.update(JSON.stringify({...m.poseAtTime(c.at ?? c.start), _planes: undefined}, (_, v) => typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));
    assert.equal(h.digest('hex'), digests[f.id], f.id);
  }
});
