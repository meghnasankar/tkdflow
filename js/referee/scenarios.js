/* Referee practice scenarios: deterministic exchanges between Chung (blue) and Hong (red), each with its rule profile,
   round clock, sensor and judge evidence, and the facts the decision rests on. The movement is authored so the
   contact (or the miss, the line crossing, the fall) is visible and is checked by tests/referee.test.mjs. */
import {add, sub, scale, norm, len, rotY, BODY} from '../animation/motion-math.js';
import {stance, shifted, footAt, solveFighter, strikePoint, trunkCentre, headCentre, trunkSurface, toBody, TRUNK, HEAD, forward, leftOf} from './fighter.js';

/* Make the strike point of `limb` land exactly on `strike`: move the hand or foot by the remaining error, or, when the
   limb is at full reach, the whole body (pelvis and feet). Deterministic: a fixed number of passes. Steps are halved
   after the first few, because a near-horizontal leg turns its knee as the foot moves and the heel can overshoot. */
function landOn(state, limb, strike) {
  const [kind, side] = limb.split(':');
  for (let pass = 0; pass < 48; pass++) {
    const pose = solveFighter(state), err = scale(sub(strike, strikePoint(pose, limb)), pass < 4 ? 1 : .5);
    if (len(err) < 1e-4) break;
    if (kind === 'fist') { const w = state.handsWorld[side], reach = len(sub(add(w, err), pose.arms[side].shoulder));
      if (reach < .52) state.handsWorld[side] = add(w, err); else { for (const k of ['pelvis']) state[k] = add(state[k], [err[0], 0, err[2]]); for (const f of Object.values(state.feet)) f.pos = add(f.pos, [err[0], 0, err[2]]); state.handsWorld[side] = add(w, err); } }
    else { const f = state.feet[side], l = pose.legs[side], reach = len(sub(add(f.pos, err), l.hip));
      if (reach < .86) f.pos = add(f.pos, err); else { state.pelvis = add(state.pelvis, [err[0], 0, err[2]]); const o = state.feet[side === 'left' ? 'right' : 'left']; o.pos = add(o.pos, [err[0], 0, err[2]]); f.pos = add(f.pos, err); } }
  }
  return state;
}

export const ARENA = Object.freeze({apothem: 4.0});            // the boundary line: an octagon 8 m across its flats
const flat = v => norm([v[0], 0, v[2]]);
const yawOf = d => Math.atan2(d[0], d[2]) * 180 / Math.PI;

/* The point on a fighter's scoring area facing `from`, pushed in by `depth` (negative depth stops short). */
function surfacePoint(pose, region, from, depth = .012) {
  if (region === 'head') { const c = headCentre(pose), d = norm(sub(from, c)); return add(c, scale(d, HEAD.radius - depth)); }
  // The trunk protector: the shell point facing `from` (in plan), a little toward its height, around the solar plexus.
  const f = toBody(pose, from), a = Math.atan2(f[0], f[2] - TRUNK.axisZ);
  return trunkSurface(pose, a, Math.min(.30, Math.max(.12, TRUNK.aimY + .3 * (f[1] - TRUNK.aimY))), depth);
}
function thighPoint(pose, from, depth = .012) {
  const l = pose.legs.left, m = add(l.hip, scale(sub(l.knee, l.hip), .55)), d = flat(sub(from, m)); return add(m, scale(d, .08 - depth));
}

/* A kick with leg `side` from attacker state A0 to defender state D (static during the strike), contact at tc. */
function kick({A0, D, side, kind, region, tc, depth = .012, approach = .45, recover = .55, land = .25}) {
  const dp = solveFighter(D), facing = flat(sub(D.pelvis, A0.pelvis)), baseYaw = yawOf(facing), sx = side === 'left' ? 1 : -1;
  const turning = kind === 'back' || kind === 'spin';
  // Where the strike lands, seen from the attacker's side.
  const from = add(A0.pelvis, scale(leftOf(baseYaw), kind === 'roundhouse' ? sx * .5 : 0));
  const strike = region === 'below-waist' ? thighPoint(dp, from, depth) : surfacePoint(dp, region, add(from, [0, region === 'head' ? .25 : 0, 0]), depth);
  const dir = kind === 'roundhouse' ? norm(sub(strike, add(from, [0, -.1, 0]))) : norm(sub(strike, add(A0.pelvis, [0, -.15, 0])));
  // Body at contact: roundhouse turns the hips (kicking side back), turning kicks spin past the back.
  const yaw = baseYaw + (kind === 'roundhouse' ? sx * 70 : kind === 'front' ? sx * 15 : kind === 'back' ? 180 : 200) * (kind === 'roundhouse' ? -1 : 1) * (kind === 'roundhouse' ? 1 : 1);
  const foot = footAt(strike, dir, {heel: turning, pole: kind === 'roundhouse' ? add(norm([dir[0], 0, dir[2]]), [0, 1, 0]) : [0, .3, 0].map((v, i) => v + facing[i])});
  const hipToAnkle = .80, vert = foot.pos[1] - (.95 + BODY.hipOffset[1]), horiz = Math.sqrt(Math.max(.04, hipToAnkle ** 2 - vert ** 2));
  const hipOffset = rotY([sx * BODY.hipOffset[0], 0, 0], yaw), pelvis = sub(sub([foot.pos[0], .95, foot.pos[2]], scale(facing, horiz)), [hipOffset[0], 0, hipOffset[2]]);
  pelvis[1] = .95;
  const support = side === 'left' ? 'right' : 'left', supportPos = add(sub(pelvis, scale(facing, .12)), scale(leftOf(yaw), -sx * .1));
  const strikeState = {
    pelvis, yaw, chestYaw: yaw + (turning ? 0 : sx * -10), lean: turning ? 8 : -12,
    feet: {[side]: foot, [support]: {pos: [supportPos[0], BODY.ankleHeight, supportPos[2]], yaw: yaw + (kind === 'roundhouse' ? sx * 40 : 0), pitch: 0}},
    hands: {left: [.13, .40, .18], right: [-.13, .40, .18]}, open: {left: 0, right: 0}
  };
  landOn(strikeState, `${turning ? 'heel' : 'ball'}:${side}`, strike);
  const chamber = structuredClone(strikeState), knee = add(scale(add(foot.pos, [pelvis[0], .95, pelvis[2]]), .5), [0, .1, 0]);
  chamber.feet[side] = {pos: add(sub(knee, scale(facing, .25)), [0, -.15, 0]), yaw: foot.yaw, pitch: 20, pole: foot.pole};
  chamber.yaw = (A0.yaw * .4 + yaw * .6); chamber.chestYaw = chamber.yaw;
  const landed = stance({x: pelvis[0] - facing[0] * .05, z: pelvis[2] - facing[2] * .05, yaw: A0.yaw, lead: side});
  return {keys: [{t: 0, state: A0}, {t: tc - approach, state: A0}, {t: tc - .14, state: chamber}, {t: tc, state: strikeState}, {t: tc + recover * .5, state: chamber}, {t: tc + recover + land, state: landed}], strike, limb: `${turning ? 'heel' : 'ball'}:${side}`};
}
function punch({A0, D, side, region, tc, depth = .012}) {
  const dp = solveFighter(D), facing = flat(sub(D.pelvis, A0.pelvis));
  const strike = surfacePoint(dp, region, add(A0.pelvis, [0, region === 'head' ? .55 : .35, 0]), depth);
  const pelvis = sub([strike[0], .93, strike[2]], scale(facing, region === 'head' ? .30 : .38)), yaw = yawOf(facing), sx = side === 'left' ? 1 : -1;
  const s = stance({x: pelvis[0], z: pelvis[2], yaw, lead: side === 'left' ? 'right' : 'left'});
  s.chestYaw = yaw - sx * 25; s.handsWorld = {[side]: sub(strike, scale(norm(sub(strike, add(pelvis, [0, .45, 0]))), .07))};
  landOn(s, `fist:${side}`, strike);
  const back = stance({x: pelvis[0] - facing[0] * .2, z: pelvis[2] - facing[2] * .2, yaw, lead: side === 'left' ? 'right' : 'left'});
  return {keys: [{t: 0, state: A0}, {t: tc - .4, state: A0}, {t: tc, state: s}, {t: tc + .5, state: back}], strike, limb: `fist:${side}`};
}

const BLUE0 = stance({x: 0, z: -.75, yaw: 0}), RED0 = stance({x: 0, z: .75, yaw: 180});
const still = (s, d = 4) => [{t: 0, state: s}, {t: d, state: s}];
/* Defender reacting a little after the contact (rocks back), so the hit reads in the replay. */
const rock = (s, tc, back = .06) => { const f = forward(s.yaw); return [{t: 0, state: s}, {t: tc, state: s}, {t: tc + .25, state: shifted(s, -f[0] * back, -f[2] * back, {lean: -6})}, {t: tc + 1, state: s}]; };

function scenario(o) { return Object.freeze({duration: 3.2, ...o}); }

const kickRed = (kind, region, extra = {}) => kick({A0: BLUE0, D: RED0, side: 'right', kind, region, tc: 1.5, ...extra});
const S = [];

/* ── WT, 1 November 2026 ── */
{ const k = kickRed('roundhouse', 'trunk'); S.push(scenario({
  id: 'wt-trunk-kick', profile: 'wt-2026', title: 'Roundhouse kick to the trunk', clock: 42, tc: 1.5,
  keys: {blue: k.keys, red: rock(RED0, 1.5)}, contact: {by: 'blue', limb: k.limb, region: 'trunk', on: 'red'},
  evidence: {pss: 'Hong’s trunk protector registered a valid hit at 1.50 s.', judges: '—'},
  facts: {attacker: 'blue', technique: 'kick', target: 'trunk', contact: true, pss: true, judges: false, clock: 42},
  steps: ['Chung (blue) steps in with a right roundhouse kick.', 'The ball of the foot lands on Hong’s red trunk protector at 1.50 s.', 'The trunk PSS registers the impact.', 'Chung recovers to stance.'],
  options: [{label: 'Blue +1', outcome: {blue: 1, red: 0}}, {label: 'Blue +2', outcome: {blue: 2, red: 0}}, {label: 'Blue +4', outcome: {blue: 4, red: 0}}, {label: 'No points', outcome: {blue: 0, red: 0}}]
})); }
{ const k = kickRed('roundhouse', 'head'); S.push(scenario({
  id: 'wt-head-kick', profile: 'wt-2026', title: 'Roundhouse kick to the head', clock: 51, tc: 1.5,
  keys: {blue: k.keys, red: rock(RED0, 1.5, .04)}, contact: {by: 'blue', limb: k.limb, region: 'head', on: 'red'},
  evidence: {pss: 'Hong’s head protector registered a valid hit at 1.50 s.', judges: '—'},
  facts: {attacker: 'blue', technique: 'kick', target: 'head', contact: true, pss: true, judges: false, clock: 51},
  steps: ['Chung (blue) raises a right roundhouse kick high.', 'The foot lands on Hong’s head protector at 1.50 s.', 'The head PSS registers the impact.'],
  options: [{label: 'Blue +2', outcome: {blue: 2, red: 0}}, {label: 'Blue +3', outcome: {blue: 3, red: 0}}, {label: 'Blue +6', outcome: {blue: 6, red: 0}}, {label: 'Red +1', outcome: {blue: 0, red: 1}}]
})); }
{ const p = punch({A0: BLUE0, D: RED0, side: 'right', region: 'trunk', tc: 1.3}); S.push(scenario({
  id: 'wt-punch', profile: 'wt-2026', title: 'Straight punch to the trunk', clock: 75, tc: 1.3, duration: 2.6,
  keys: {blue: p.keys, red: rock(RED0, 1.3, .04)}, contact: {by: 'blue', limb: p.limb, region: 'trunk', on: 'red'},
  evidence: {pss: 'Sensing gloves: impact detected on Hong’s trunk protector at 1.30 s.', judges: 'Corner judges: technique validated (2 of 3).'},
  facts: {attacker: 'blue', technique: 'punch', target: 'trunk', contact: true, pss: true, judges: true, clock: 75},
  steps: ['Chung (blue) steps in with a straight right punch.', 'The fist lands on Hong’s trunk protector at 1.30 s.', 'The sensing glove registers the impact and two of three corner judges validate the punch.'],
  options: [{label: 'Blue +1', outcome: {blue: 1, red: 0}}, {label: 'Blue +2', outcome: {blue: 2, red: 0}}, {label: 'No points (punches never score)', outcome: {blue: 0, red: 0}}]
})); }
{ const k = kickRed('back', 'trunk'); S.push(scenario({
  id: 'wt-turning-trunk', profile: 'wt-2026', title: 'Back kick to the trunk', clock: 33, tc: 1.5,
  keys: {blue: k.keys, red: rock(RED0, 1.5, .08)}, contact: {by: 'blue', limb: k.limb, region: 'trunk', on: 'red'},
  evidence: {pss: 'Hong’s trunk protector registered a valid hit at 1.50 s.', judges: 'Corner judges: turning kick confirmed; head and shoulders rotated with the kick.'},
  facts: {attacker: 'blue', technique: 'turning-kick', target: 'trunk', contact: true, pss: true, judges: true, clock: 33},
  steps: ['Chung (blue) spins, turning head and shoulders, into a back kick.', 'The heel lands on Hong’s trunk protector at 1.50 s.', 'The trunk PSS registers the impact; the judges confirm the turning kick.'],
  options: [{label: 'Blue +2', outcome: {blue: 2, red: 0}}, {label: 'Blue +3', outcome: {blue: 3, red: 0}}, {label: 'Blue +4', outcome: {blue: 4, red: 0}}, {label: 'Blue +6', outcome: {blue: 6, red: 0}}]
})); }
{ const k = kickRed('spin', 'head'); S.push(scenario({
  id: 'wt-turning-head', profile: 'wt-2026', title: 'Spinning kick to the head', clock: 58, tc: 1.5,
  keys: {blue: k.keys, red: rock(RED0, 1.5, .04)}, contact: {by: 'blue', limb: k.limb, region: 'head', on: 'red'},
  evidence: {pss: 'Hong’s head protector registered a valid hit at 1.50 s.', judges: 'Corner judges: turning kick confirmed.'},
  facts: {attacker: 'blue', technique: 'turning-kick', target: 'head', contact: true, pss: true, judges: true, clock: 58},
  steps: ['Chung (blue) spins into a high turning kick.', 'The heel lands on Hong’s head protector at 1.50 s.', 'The head PSS registers the impact; the judges confirm the turning kick.'],
  options: [{label: 'Blue +3', outcome: {blue: 3, red: 0}}, {label: 'Blue +5', outcome: {blue: 5, red: 0}}, {label: 'Blue +6', outcome: {blue: 6, red: 0}}, {label: 'Blue +4', outcome: {blue: 4, red: 0}}]
})); }
{ const k = kickRed('roundhouse', 'trunk', {depth: .004}); S.push(scenario({
  id: 'wt-no-pss', profile: 'wt-2026', title: 'A light trunk kick the sensors don’t register', clock: 47, tc: 1.5,
  keys: {blue: k.keys, red: still(RED0)}, contact: {by: 'blue', limb: k.limb, region: 'trunk', on: 'red'},
  evidence: {pss: 'Trunk PSS: no valid hit registered (impact below the set level).', judges: '—'},
  facts: {attacker: 'blue', technique: 'kick', target: 'trunk', contact: true, pss: false, judges: false, clock: 47},
  steps: ['Chung (blue) reaches with a right roundhouse kick.', 'The foot touches Hong’s trunk protector at 1.50 s without force; Hong doesn’t move.', 'The trunk PSS registers no valid hit.'],
  options: [{label: 'Blue +2 (it touched the protector)', outcome: {blue: 2, red: 0}}, {label: 'No points', outcome: {blue: 0, red: 0}}, {label: 'The judges award 2', outcome: {blue: 2, red: 0}}]
})); }
{ const p = punch({A0: RED0, D: BLUE0, side: 'right', region: 'head', tc: 1.3}); S.push(scenario({
  id: 'wt-hand-head', profile: 'wt-2026', title: 'A punch to the head', clock: 36, tc: 1.3, duration: 2.6,
  keys: {red: p.keys, blue: rock(BLUE0, 1.3, .04)}, contact: {by: 'red', limb: p.limb, region: 'head', on: 'blue'},
  evidence: {pss: 'No PSS score (hand techniques to the head are not permitted).', judges: '—'},
  facts: {attacker: 'red', technique: 'hand-to-head', target: 'head', contact: true, pss: false, judges: false, clock: 36},
  steps: ['Hong (red) steps in with a right punch.', 'The fist hits Chung’s head protector at 1.30 s.'],
  options: [{label: 'Red +1', outcome: {blue: 0, red: 1}}, {label: 'Blue +1', outcome: {blue: 1, red: 0}}, {label: 'Red +3', outcome: {blue: 0, red: 3}}, {label: 'No decision', outcome: {blue: 0, red: 0}}]
})); }
{ const p = punch({A0: RED0, D: BLUE0, side: 'right', region: 'head', tc: 1.3}); S.push(scenario({
  id: 'wt-hand-head-last10', profile: 'wt-2026', title: 'A punch to the head with 6 seconds left', clock: 6, tc: 1.3, duration: 2.6,
  keys: {red: p.keys, blue: rock(BLUE0, 1.3, .04)}, contact: {by: 'red', limb: p.limb, region: 'head', on: 'blue'},
  evidence: {pss: 'No PSS score (hand techniques to the head are not permitted).', judges: '—'},
  facts: {attacker: 'red', technique: 'hand-to-head', target: 'head', contact: true, pss: false, judges: false, clock: 6},
  steps: ['With 6 seconds left in the round, Hong (red) steps in with a right punch.', 'The fist hits Chung’s head protector at 1.30 s.'],
  options: [{label: 'Blue +1', outcome: {blue: 1, red: 0}}, {label: 'Blue +2 (last ten seconds)', outcome: {blue: 2, red: 0}}, {label: 'Red +1', outcome: {blue: 0, red: 1}}]
})); }
{ const k = kick({A0: RED0, D: BLUE0, side: 'right', kind: 'front', region: 'below-waist', tc: 1.5}); S.push(scenario({
  id: 'wt-below-waist', profile: 'wt-2026', title: 'A kick to the thigh', clock: 64, tc: 1.5,
  keys: {red: k.keys, blue: rock(BLUE0, 1.5, .03)}, contact: {by: 'red', limb: k.limb, region: 'below-waist', on: 'blue'},
  evidence: {pss: 'No PSS score (below the trunk protector).', judges: '—'},
  facts: {attacker: 'red', technique: 'below-waist', target: null, contact: true, pss: false, judges: false, clock: 64},
  steps: ['Hong (red) kicks low with the right foot.', 'The foot strikes the front of Chung’s thigh at 1.50 s; Chung was not lowering into the kick.'],
  options: [{label: 'Blue +1', outcome: {blue: 1, red: 0}}, {label: 'Red +2', outcome: {blue: 0, red: 2}}, {label: 'No decision', outcome: {blue: 0, red: 0}}]
})); }
/* Boundary crossings: near one side of the octagon (the line at z = 4.0). Red retreats with nobody pushing. */
function retreatOut(clock, id, title) {
  const near = 3.25, red0 = stance({x: 0, z: near, yaw: 180}), blue0 = stance({x: 0, z: near - 1.5, yaw: 0});
  const red1 = shifted(red0, 0, .55), blue1 = shifted(blue0, 0, .35);
  const crossT = 1.42;   // the rear heel reaches the line (checked in tests)
  return scenario({
    id, profile: 'wt-2026', title, clock, tc: crossT,
    keys: {red: [{t: 0, state: red0}, {t: .6, state: red0}, {t: 1.9, state: red1}, {t: 3.2, state: red1}], blue: [{t: 0, state: blue0}, {t: .6, state: blue0}, {t: 1.9, state: blue1}, {t: 3.2, state: blue1}]},
    boundary: {fighter: 'red', side: 'right', line: ARENA.apothem},
    evidence: {pss: '—', judges: '—'},
    facts: {attacker: 'blue', technique: null, target: null, contact: false, pss: false, judges: false, clock, penalties: [{on: 'red', act: 'boundary', why: 'crossing the boundary line', cite: 'boundary'}]},
    steps: [`With ${clock} seconds left, Chung (blue) advances; nobody touches Hong (red).`, 'Hong backs away and the right (rear) foot crosses the boundary line.'],
    options: [{label: 'Blue +1', outcome: {blue: 1, red: 0}}, {label: 'Blue +2', outcome: {blue: 2, red: 0}}, {label: 'No penalty', outcome: {blue: 0, red: 0}}]
  });
}
S.push(retreatOut(40, 'wt-boundary', 'Stepping over the boundary line'));
S.push(retreatOut(8, 'wt-boundary-last10', 'Stepping over the line with 8 seconds left'));
{ // Prolonged push: Blue keeps both hands on Red and drives Red over the line.
  const near = 3.25, red0 = stance({x: 0, z: near, yaw: 180}), blue0 = stance({x: 0, z: near - 1.25, yaw: 0});
  const push = t => { const b = shifted(blue0, 0, .55 + t * .7); const r = solveFighter(shifted(red0, 0, t * .7)); b.handsWorld = {left: trunkSurface(r, -.5, .22, .02), right: trunkSurface(r, .5, .22, .02)}; b.lean = 8; return b; };
  S.push(scenario({
    id: 'wt-pushed-out', profile: 'wt-2026', title: 'Pushed over the line', clock: 25, tc: 1.45,
    keys: {blue: [{t: 0, state: blue0}, {t: .5, state: blue0}, {t: .9, state: push(0)}, {t: 1.9, state: push(1)}, {t: 3.2, state: shifted(blue0, 0, .8)}], red: [{t: 0, state: red0}, {t: .9, state: red0}, {t: 1.9, state: shifted(red0, 0, .7)}, {t: 3.2, state: shifted(red0, 0, .7)}]},
    boundary: {fighter: 'red', side: 'right', line: ARENA.apothem}, push: {by: 'blue', on: 'red', from: .9, to: 1.9},
    evidence: {pss: '—', judges: '—'},
    facts: {attacker: 'blue', technique: null, target: null, contact: false, pss: false, judges: false, clock: 25, penalties: [{on: 'blue', act: 'push', why: 'pushing the opponent out of the boundary line with prolonged contact', cite: 'push'}], cleared: [{on: 'red', act: 'boundary', why: 'Hong crossed the line because of Chung’s prohibited push, so Hong gets no penalty', cite: 'boundary'}]},
    steps: ['Chung (blue) puts both hands on Hong’s (red) trunk protector at 0.90 s and keeps pushing.', 'Hong is driven backwards for a full second and the rear foot crosses the boundary line.'],
    options: [{label: 'Blue +1 (red crossed the line)', outcome: {blue: 1, red: 0}}, {label: 'Red +1', outcome: {blue: 0, red: 1}}, {label: 'No decision', outcome: {blue: 0, red: 0}}]
  }));
}
{ // A scoring back kick, then the kicker loses balance and falls.
  const k = kickRed('back', 'trunk'); const last = k.keys[k.keys.length - 1].state, f = forward(BLUE0.yaw);
  const fallen = shifted(last, f[0] * .1, f[2] * .1, {lean: 25}); fallen.pelvis[1] = .42;
  fallen.feet.left = {pos: add(fallen.pelvis, [.18, -.35, .32]).map((v, i) => i === 1 ? .07 : v), yaw: 0, pitch: 0, pole: [0, 1, .3]};
  fallen.feet.right = {pos: add(fallen.pelvis, [-.15, -.35, .1]).map((v, i) => i === 1 ? .07 : v), yaw: 0, pitch: 0, pole: [0, 1, .3]};
  fallen.handsWorld = {left: [fallen.pelvis[0] + .3, .02 + .03, fallen.pelvis[2] - .05], right: [fallen.pelvis[0] - .3, .05, fallen.pelvis[2] + .05]};
  const keys = [...k.keys.slice(0, 5), {t: 2.15, state: fallen}, {t: 3.4, state: fallen}];
  S.push(scenario({
    id: 'wt-turning-then-fall', profile: 'wt-2026', title: 'A scoring back kick, then a fall', clock: 19, tc: 1.5, duration: 3.4,
    keys: {blue: keys, red: rock(RED0, 1.5, .08)}, contact: {by: 'blue', limb: k.limb, region: 'trunk', on: 'red'}, fall: {fighter: 'blue', by: 2.15},
    evidence: {pss: 'Hong’s trunk protector registered a valid hit at 1.50 s.', judges: 'Corner judges: turning kick confirmed.'},
    facts: {attacker: 'blue', technique: 'turning-kick', target: 'trunk', contact: true, pss: true, judges: true, clock: 19, fall: {by: 'blue', afterScoringTurningKick: true, target: 'trunk', why: 'Chung fell after scoring with a turning kick, so the fall is not penalized'}},
    steps: ['Chung (blue) spins into a back kick that lands on Hong’s trunk protector at 1.50 s; the PSS and judges confirm it.', 'Chung loses balance after the kick and goes down to the floor at 2.15 s.'],
    options: [{label: 'Blue +4', outcome: {blue: 4, red: 0}}, {label: 'Blue +4, Red +1 (fall)', outcome: {blue: 4, red: 1}}, {label: 'Blue +2, Red +1', outcome: {blue: 2, red: 1}}]
  }));
}

/* ── AAU, 1 November 2026 ── */
{ const k = kickRed('roundhouse', 'head', {depth: .006}); S.push(scenario({
  id: 'aau-grassroot-head-touch', profile: 'aau-grassroot', title: 'Grassroot: a kick that touches the head', clock: 30, tc: 1.5,
  keys: {blue: k.keys, red: still(RED0)}, contact: {by: 'blue', limb: k.limb, region: 'head', on: 'red'},
  evidence: {pss: 'Light touch on Hong’s head protector at 1.50 s.', judges: '—'},
  facts: {attacker: 'blue', technique: 'kick', target: 'head', contact: true, pss: true, judges: false, clock: 30},
  steps: ['In a Grassroot division, Chung (blue) throws a right roundhouse kick high.', 'The foot lightly touches Hong’s head protector at 1.50 s.'],
  options: [{label: 'Blue +3', outcome: {blue: 3, red: 0}}, {label: 'Red +1', outcome: {blue: 0, red: 1}}, {label: 'Verbal warning only', outcome: {blue: 0, red: 0}}]
})); }
{ const k = kickRed('roundhouse', 'head', {depth: -.10}); S.push(scenario({
  id: 'aau-grassroot-head-miss', profile: 'aau-grassroot', title: 'Grassroot: a head kick that misses', clock: 44, tc: 1.5,
  keys: {blue: k.keys, red: still(RED0)}, miss: {by: 'blue', limb: k.limb, region: 'head', on: 'red', clearance: .08},
  evidence: {pss: 'No contact.', judges: '—'},
  facts: {attacker: 'blue', technique: 'kick', target: 'head', contact: false, pss: false, judges: false, clock: 44},
  steps: ['In a Grassroot division, Chung (blue) throws a strong right roundhouse kick at head height.', 'The foot passes about 10 cm short of Hong’s head protector at 1.50 s; there is no contact.'],
  options: [{label: 'Red +1', outcome: {blue: 0, red: 1}}, {label: 'No points; the referee may give a verbal warning', outcome: {blue: 0, red: 0}}, {label: 'Blue +3', outcome: {blue: 3, red: 0}}]
})); }
{ const k = kickRed('spin', 'head', {depth: .006}); S.push(scenario({
  id: 'aau-youth-turning-head', profile: 'aau-youth', title: 'Youth color belt: a light spinning kick to the head', clock: 50, tc: 1.5,
  keys: {blue: k.keys, red: still(RED0)}, contact: {by: 'blue', limb: k.limb, region: 'head', on: 'red'},
  evidence: {pss: 'Light, controlled contact on Hong’s head protector at 1.50 s.', judges: 'Technical judge: turning kick.'},
  facts: {attacker: 'blue', technique: 'turning-kick', target: 'head', contact: true, pss: true, judges: true, clock: 50},
  steps: ['In a 12–17 color-belt Olympic-style division, Chung (blue) spins into a high turning kick.', 'The heel touches Hong’s head protector lightly, with control, at 1.50 s.'],
  options: [{label: 'Blue +3', outcome: {blue: 3, red: 0}}, {label: 'Blue +6', outcome: {blue: 6, red: 0}}, {label: 'Red +1', outcome: {blue: 0, red: 1}}]
})); }
export const SCENARIOS = Object.freeze(S);
export const scenarioById = id => SCENARIOS.find(s => s.id === id);
