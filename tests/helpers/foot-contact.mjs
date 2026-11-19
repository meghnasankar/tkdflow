/* Foot-floor contact, measured from what the foot actually touches rather than from the ankle.
   Each foot has two floor points in its own frame (the heel and the ball, on the sole 7 cm below the ankle). After the
   foot's yaw and pitch, a point is on the floor when it is within 12 mm of it. Between two frames the foot's anchor is
   the floor point that stays on the floor and moves least: a foot pivoting on its ball, or rolling onto its ball or
   heel, keeps a still anchor even though its ankle moves; a foot that slides moves every point it stands on. */
import {BODY} from '../../js/animation/motion-math.js';

export const FLOOR_TOLERANCE = .012;
export const SOLE_POINTS = {heel: [0, -BODY.ankleHeight, -.06], ball: [0, -BODY.ankleHeight, BODY.ballOffset]};
const RAD = Math.PI / 180;

/* World position of a point given in the foot's frame (x left, y up, z toes), turned by pitch then yaw as the avatar does. */
export function footPoint(leg, local) {
  const p = leg.pitch * RAD, y = leg.yaw * RAD, [x0, y0, z0] = local;
  const y1 = y0 * Math.cos(p) - z0 * Math.sin(p), z1 = y0 * Math.sin(p) + z0 * Math.cos(p);
  return [leg.ankle[0] + x0 * Math.cos(y) + z1 * Math.sin(y), leg.ankle[1] + y1, leg.ankle[2] - x0 * Math.sin(y) + z1 * Math.cos(y)];
}
export const contacts = leg => Object.fromEntries(Object.entries(SOLE_POINTS).map(([k, v]) => [k, footPoint(leg, v)]).filter(([, q]) => q[1] <= FLOOR_TOLERANCE));
const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/* Between two frames of one foot: null if the foot isn't standing on a common point in both; otherwise the anchor
   (the common floor point that moved least) and how far it slid along the floor. */
export function anchorSlip(a, b) {
  const ca = contacts(a), cb = contacts(b); let best = null;
  for (const k of Object.keys(ca)) if (cb[k]) { const d = flat(ca[k], cb[k]); if (!best || d < best.slip) best = {anchor: k, slip: d}; }
  return best;
}

/* Every frame step of a lesson, per foot: the anchor slip while standing, labelled with the plan and whether the plan
   moves that foot (its standing points at the plan's end are more than 3 cm from where they started). */
export function contactTrace(motion, {fps = 30} = {}) {
  const out = [], dt = 1 / fps, plans = motion.referencePlans || [];
  const planAt = t => { let k = 0; for (let i = 0; i < plans.length; i++) if (plans[i].start <= t + 1e-9) k = i; return plans[k]; };
  let prev = motion.poseAtTime(0);
  for (let i = 1, n = Math.ceil(motion.DURATION * fps); i <= n; i++) {
    const t = Math.min(motion.DURATION, i * dt), p = motion.poseAtTime(t), plan = planAt(t);
    for (const side of ['left', 'right']) {
      const s = anchorSlip(prev.legs[side], p.legs[side]);
      if (s) out.push({t, side, plan: plan?.index ?? 0, moving: planMovesFoot(plan, side), ...s});
    }
    prev = p;
  }
  return out;
}
export function planMovesFoot(plan, side) {
  if (!plan?.before?.feet || !plan?.after?.feet) return false;
  const leg = f => ({ankle: f.pos, yaw: f.yaw, pitch: f.pitch || 0});
  const a = SOLE_POINTS, A = leg(plan.before.feet[side]), B = leg(plan.after.feet[side]);
  return Math.min(...Object.values(a).map(q => flat(footPoint(A, q), footPoint(B, q)))) > .03 || (plan.footStages?.length > 2);
}
