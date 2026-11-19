/* Sparring fighters for the referee practice arena: a small pose solver that produces the same pose format the
   lesson character's poser reads (avatar-core.js), keyframe interpolation, and the scoring-target geometry
   (trunk protector, head) and striking points used both to draw contact and to test it. */
import {BODY, add, sub, scale, dot, len, norm, rotY, rotX, solveTwoBone, softArmTarget, minimumJerk, clamp} from '../animation/motion-math.js';

const SIDES = ['left', 'right'], sign = s => (s === 'left' ? 1 : -1);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const forward = yaw => rotY([0, 0, 1], yaw);
export const leftOf = yaw => rotY([1, 0, 0], yaw);

/* Scoring areas, in the fighter's body frame (x left, y up, z forward from the pelvis), turned by lean and chest yaw.
   The trunk protector (hogu) is a moulded shell around the front, ribs and back, fitted to the lesson character's
   jacket by ray-casting its skinned mesh: about 2 cm of padding in front, a squarer front (exponent 6) and a rounder
   back (3.5), around a vertical axis 4 cm in front of the pelvis, from just above the belt to under the collarbones,
   with the top cut lower at the sides for the arms. Each row: height, half-width, front depth, back depth. The same
   shell is drawn in the arena and used to score contact, so what lands visibly on the protector is what scores.
   The head protector is a sphere. */
export const TRUNK = Object.freeze({
  axisZ: .04, bottom: .045, top: Object.freeze({side: .22, front: .36, back: .32}), nFront: 6, nBack: 3.5, aimY: .22,
  rows: Object.freeze([[.045, .205, .14, .19], [.12, .198, .145, .158], [.20, .202, .15, .168], [.26, .222, .155, .178], [.30, .222, .158, .178], [.38, .19, .15, .168]].map(Object.freeze))
});
export const HEAD = Object.freeze({centre: [0, .70, .05], radius: .13});
const bodyPoint = (pose, p) => add(pose.pelvis, rotY(rotX(p, pose.lean || 0), pose.chestYaw ?? pose.yaw));
export const toBody = (pose, p) => rotX(rotY(sub(p, pose.pelvis), -(pose.chestYaw ?? pose.yaw)), -(pose.lean || 0));
export const trunkCentre = pose => bodyPoint(pose, [0, TRUNK.aimY, TRUNK.axisZ]);
export const headCentre = pose => bodyPoint(pose, HEAD.centre);

/* The shell's top edge at angle a (radians about the axis, 0 = straight ahead, positive to the fighter's left). */
export function trunkTop(a) {
  const c = Math.cos(a), {side, front, back} = TRUNK.top;
  return side + (front - side) * Math.max(0, c) ** 2 + (back - side) * Math.max(0, -c) ** 2;
}
/* Distance from the axis to the shell's outer surface at height y and angle a. */
export function trunkRadius(y, a) {
  const r = TRUNK.rows, yy = clamp(y, r[0][0], r[r.length - 1][0]);
  let i = 1; while (i < r.length - 1 && yy > r[i][0]) i++;
  const u = (yy - r[i - 1][0]) / (r[i][0] - r[i - 1][0]), at = k => r[i - 1][k] + (r[i][k] - r[i - 1][k]) * u;
  const front = Math.cos(a) >= 0, w = at(1), d = front ? at(2) : at(3), n = front ? TRUNK.nFront : TRUNK.nBack;
  return 1 / ((Math.abs(Math.sin(a)) / w) ** n + (Math.abs(Math.cos(a)) / d) ** n) ** (1 / n);
}
/* A point on the shell (body frame) at angle a and height fraction v (0 = bottom edge, 1 = top edge), pushed out by `out`. */
export function trunkShellPoint(a, v, out = 0) {
  const y = TRUNK.bottom + (trunkTop(a) - TRUNK.bottom) * v, r = trunkRadius(y, a) + out;
  return [Math.sin(a) * r, y, TRUNK.axisZ + Math.cos(a) * r];
}
/* The world point on a fighter's trunk protector at angle a and height y (body frame), `depth` metres into it. */
export function trunkSurface(pose, a, y, depth = 0) {
  const yy = clamp(y, TRUNK.bottom, trunkTop(a)), r = trunkRadius(yy, a) - depth;
  return bodyPoint(pose, [Math.sin(a) * r, yy, TRUNK.axisZ + Math.cos(a) * r]);
}

/* Signed distance (metres) from a point to a fighter's scoring area: negative inside. For the trunk protector it is
   measured from the shell's axis (exact on the flat front, close elsewhere) and past its top and bottom edges. */
export function distanceToTarget(pose, region, p) {
  if (region === 'head') return len(sub(p, headCentre(pose))) - HEAD.radius;
  if (region === 'trunk') {
    const q = toBody(pose, p), dx = q[0], dz = q[2] - TRUNK.axisZ, a = Math.atan2(dx, dz), top = trunkTop(a);
    const radial = Math.hypot(dx, dz) - trunkRadius(clamp(q[1], TRUNK.bottom, top), a);
    const vert = q[1] < TRUNK.bottom ? TRUNK.bottom - q[1] : q[1] > top ? q[1] - top : 0;
    return vert ? (radial > 0 ? Math.hypot(radial, vert) : vert) : radial;
  }
  if (region === 'below-waist') {   // the front of either thigh, a capsule from hip to knee (radius 8 cm)
    return Math.min(...SIDES.map(s => { const l = pose.legs[s], d = sub(l.knee, l.hip), u = clamp(dot(sub(p, l.hip), d) / dot(d, d), 0, 1); return len(sub(p, add(l.hip, scale(d, u)))) - .08; }));
  }
  throw new Error('unknown region ' + region);
}

/* The point that strikes: the ball of the foot for kicks, the heel/sole for back kicks, the fist for punches. */
export function strikePoint(pose, limb) {
  const [kind, side] = limb.split(':');
  if (kind === 'fist') { const a = pose.arms[side]; return add(a.wrist, scale(norm(sub(a.wrist, a.elbow)), .07)); }
  const l = pose.legs[side];
  if (kind === 'heel') return add(l.ankle, scale(norm(sub(l.ankle, l.knee)), .08));
  return add(l.ankle, scale(rotY(rotX([0, 0, 1], l.pitch), l.yaw), .11));   // ball of the foot
}

/* Fighter state → pose. State: pelvis [x, y, z], yaw, chestYaw (absolute), lean, feet {side: {pos, yaw, pitch, pole?}},
   hands {side: body-frame point} or handsWorld {side: world point}, open {side}, elbowOut. */
export function solveFighter(s) {
  const pelvis = s.pelvis, yaw = s.yaw, chestYaw = s.chestYaw ?? yaw, lean = s.lean || 0, legs = {}, arms = {};
  for (const side of SIDES) {
    const sx = sign(side), f = s.feet[side], hip = add(pelvis, rotY([sx * BODY.hipOffset[0], BODY.hipOffset[1], 0], yaw));
    const pole = add(hip, scale(norm(f.pole || forward(f.yaw ?? yaw)), .6));
    const leg = solveTwoBone(hip, f.pos, BODY.thigh, BODY.shin, pole);
    let lateral = cross(norm(sub(leg.joint, hip)), norm(sub(leg.end, leg.joint)));
    lateral = len(lateral) < 1e-6 ? leftOf(yaw) : norm(lateral);
    legs[side] = {hip, knee: leg.joint, ankle: leg.end, yaw: f.yaw ?? yaw, pitch: f.pitch || 0, lateral};
    const shoulder = bodyPoint({pelvis, yaw, chestYaw, lean}, [sx * BODY.shoulderOffset[0], BODY.shoulderOffset[1], 0]);
    const want = s.handsWorld?.[side] || bodyPoint({pelvis, yaw, chestYaw, lean}, s.hands[side]);
    const target = softArmTarget(shoulder, want, BODY.upperArm, BODY.forearm);
    const elbowPole = add(shoulder, rotY([sx * (s.elbowOut ?? .5), -.8, -.2], chestYaw));
    const arm = solveTwoBone(shoulder, target, BODY.upperArm, BODY.forearm, elbowPole);
    arms[side] = {shoulder, elbow: arm.joint, wrist: arm.end, open: s.open?.[side] || 0, roll: s.roll?.[side] || 0, shape: s.open?.[side] ? 'knife' : null};
  }
  return {pelvis, yaw, chestYaw, lean, headYaw: s.headYaw || 0, breath: 0, arms, legs};
}

/* Keyframes [{t, state}] → state at time t, eased between keys (minimum jerk), so every replay is identical. */
function mixValue(a, b, u) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mixValue(v, b[i], u));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? mixValue(a[k], b[k], u) : (u < .5 ? a[k] ?? b[k] : b[k] ?? a[k]); return o; }
  return u < .5 ? a : b;
}
/* A hand held at a world point in one key and in the body frame in the next blends through world space: the key that
   lacks the world point gets the wrist position its own pose gives, so the fist travels instead of jumping. */
function withWorldHands(s, sides) {
  if (sides.every(k => s.handsWorld?.[k])) return s;
  const p = solveFighter(s), hw = {...(s.handsWorld || {})};
  for (const k of sides) if (!hw[k]) hw[k] = p.arms[k].wrist;
  return {...s, handsWorld: hw};
}
export function stateAt(keys, t) {
  if (t <= keys[0].t) return keys[0].state;
  for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) {
    let a = keys[i - 1].state, b = keys[i].state; const sides = [...new Set([...Object.keys(a.handsWorld || {}), ...Object.keys(b.handsWorld || {})])];
    if (sides.length) { a = withWorldHands(a, sides); b = withWorldHands(b, sides); }
    return mixValue(a, b, minimumJerk((t - keys[i - 1].t) / (keys[i].t - keys[i - 1].t)));
  }
  return keys[keys.length - 1].state;
}

/* ── state builders ── */
const GUARD = {left: [.11, .44, .30], right: [-.09, .40, .22]};
export function stance({x, z, yaw, lead = 'left', y = .93, twist = 25, lean = 0, hands = GUARD}) {
  const f = forward(yaw), l = leftOf(yaw), base = [x, 0, z], ls = lead === 'left' ? 1 : -1;
  const leadFoot = add(add(base, scale(f, .26)), scale(l, ls * .09)), rearFoot = add(add(base, scale(f, -.30)), scale(l, -ls * .13));
  return {
    pelvis: [x, y, z], yaw, chestYaw: yaw - ls * twist, lean,
    feet: {[lead]: {pos: [leadFoot[0], BODY.ankleHeight, leadFoot[2]], yaw: yaw - ls * 15, pitch: 0}, [lead === 'left' ? 'right' : 'left']: {pos: [rearFoot[0], BODY.ankleHeight, rearFoot[2]], yaw: yaw - ls * 45, pitch: 0}},
    hands: structuredClone(lead === 'left' ? hands : {left: [-hands.right[0], hands.right[1], hands.right[2]], right: [-hands.left[0], hands.left[1], hands.left[2]]}),
    open: {left: 0, right: 0}
  };
}
/* A copy of a state moved by (dx, dz) in world space. */
export function shifted(s, dx, dz, extra = {}) {
  const t = structuredClone(s); t.pelvis[0] += dx; t.pelvis[2] += dz;
  for (const side of SIDES) { t.feet[side].pos[0] += dx; t.feet[side].pos[2] += dz; }
  return Object.assign(t, extra);
}
/* Put a foot so that its strike point lands on `strike`, pointing along `dir` (pitch from dir's rise), knee toward `pole`. */
export function footAt(strike, dir, {pole, heel = false} = {}) {
  const d = norm(dir), yaw = Math.atan2(d[0], d[2]) * 180 / Math.PI;
  if (heel) return {pos: sub(strike, scale(d, .08)), yaw, pitch: -85, pole};
  const pitch = clamp(-Math.asin(clamp(d[1], -1, 1)) * 180 / Math.PI, -45, 60);
  return {pos: sub(strike, scale(rotY(rotX([0, 0, 1], pitch), yaw), .11)), yaw, pitch, pole};
}
/* The sole's furthest points (heel and toe tip) in world space, for boundary-line checks: any part of the foot counts. */
export function solePoints(leg) {
  const f = rotY([0, 0, 1], leg.yaw), a = leg.ankle;
  return [add(a, scale(f, .17)), add(a, scale(f, -.07))].map(p => [p[0], 0, p[2]]);
}
/* How far a foot is past an octagon boundary of the given apothem (positive: over the line). */
export function pastBoundary(leg, apothem) {
  let worst = -Infinity;
  for (const p of solePoints(leg)) for (let k = 0; k < 8; k++) { const n = rotY([0, 0, 1], k * 45); worst = Math.max(worst, dot(p, n) - apothem); }
  return worst;
}
export const SOLVER = {GUARD, SIDES};
