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
      if (leaves[k]) { lifted++; assert.ok(v <= .015, `${where}: slides ${(v * 100).toFixed(1)} cm on the floor around its step`); }
      else if (shift <= .005) { planted++; assert.ok(v <= .005, `${where}: planted foot slides ${(v * 100).toFixed(1)} cm`); }
      else { relocated++; assert.ok(v <= shift + .01, `${where}: slides ${(v * 100).toFixed(1)} cm, more than its end points require (${(shift * 100).toFixed(1)} cm)`); }
    }
  }
  assert.ok(planted > 400 && lifted > 400 && slides > 20, `planted ${planted}, lifted ${lifted}, relocated ${relocated}, slides ${slides}`);
  assert.ok(relocated <= 20, `feet the end points relocate without a step: ${relocated}`);
});

test('staged moves land, then turn; a jump travels only in the air; staged footwork keeps a foot on the floor', () => {
  const grounded = leg => Object.keys(contacts(leg)).length > 0;
  // Won-Hyo 27 (land, then turn left): the body doesn't turn while the kicking foot comes down, the standing left foot
  // stays planted through the landing, and the whole 200° turn happens after it. Both feet are never off the floor.
  const wh = motions['won-hyo'], p = wh.referencePlans[27];
  assert.equal(p.entry.footAction, 'land-then-turn-left');
  let landed = null, prev = wh.poseAtTime(p.start), leftSlip = 0;
  for (let t = p.start + 1 / 30; t <= p.at; t += 1 / 30) {
    const ps = wh.poseAtTime(t);
    assert.ok(grounded(ps.legs.left) || grounded(ps.legs.right), `won-hyo 27: both feet off the floor at ${t.toFixed(2)} s`);
    if (landed === null) { assert.ok(Math.abs(ps.yaw - p.before.yaw) < 1, `won-hyo 27: turning before the landing (${(ps.yaw - p.before.yaw).toFixed(1)}° at ${t.toFixed(2)} s)`); leftSlip += anchorSlip(prev.legs.left, ps.legs.left)?.slip || 0; }
    if (landed === null && grounded(ps.legs.right)) landed = t;
    prev = ps;
  }
  assert.ok(landed !== null && landed < p.start + .6 * p.duration, 'the kicking foot lands in the first stage');
  assert.ok(leftSlip < 1e-3, `won-hyo 27: the standing foot slides ${(leftSlip * 100).toFixed(2)} cm while the other lands`);
  assert.equal(wh.poseAtTime(p.at).yaw - p.before.yaw, p.dyaw, 'the full turn, after the landing');
  // Yul-Gok 36 (jump back): the foot that isn't stepping doesn't travel or turn while its sole is within 4 cm of the floor.
  const yg = motions['yul-gok'], q = yg.referencePlans[36], R0 = q.before.feet.right, R1 = q.after.feet.right;
  assert.equal(q.entry.footAction, 'jump-back');
  for (let t = q.start; t <= q.at; t += 1 / 60) {
    const r = yg.poseAtTime(t).legs.right, low = Math.min(...Object.values(SOLE_POINTS).map(l => footPoint(r, l)[1])) < .04;
    if (!low) continue;
    const atStart = flat(r.ankle, R0.pos) < 1e-6, atEnd = flat(r.ankle, R1.pos) < 1e-6;
    assert.ok(atStart || atEnd, `yul-gok 36: the right foot travels ${(Math.min(flat(r.ankle, R0.pos), flat(r.ankle, R1.pos)) * 100).toFixed(1)} cm while still near the floor at ${t.toFixed(2)} s`);
  }
  // Every staged (non-kick, non-jump) plan in all 22 lessons keeps at least one foot on the floor.
  let staged = 0;
  for (const [id, m] of Object.entries(motions)) for (const pl of m.referencePlans.slice(1)) {
    if (!pl.footStages || pl.kick || /jump|hop/.test(pl.entry?.footAction || '') || pl.entry?.travel === 'hop') continue;
    staged++;
    for (let t = pl.start; t <= pl.at; t += 1 / 30) { const ps = m.poseAtTime(t); assert.ok(grounded(ps.legs.left) || grounded(ps.legs.right), `${id} plan ${pl.index}: both feet off the floor at ${t.toFixed(2)} s`); }
  }
  assert.ok(staged >= 5, `staged plans checked: ${staged}`);
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
