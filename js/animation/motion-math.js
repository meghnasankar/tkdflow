export const BODY = Object.freeze({
  thigh: 0.45, shin: 0.44, ankleHeight: 0.07,
  ballOffset: 0.10,                  // ankle → ball of the foot, along the foot
  upperArm: 0.30, forearm: 0.27,
  hipOffset: [0.095, -0.07, 0],      // from pelvis (x = left)
  shoulderOffset: [0.19, 0.455, 0],  // from chest origin (= pelvis)
});

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ── vectors ([x, y, z] arrays) ── */
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a); return l > 1e-9 ? scale(a, 1 / l) : [0, 0, 0]; };
const RAD = Math.PI / 180;
export function rotY(v, deg) {
  const c = Math.cos(deg * RAD); const s = Math.sin(deg * RAD);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
export function rotX(v, deg) {
  const c = Math.cos(deg * RAD); const s = Math.sin(deg * RAD);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

/** Analytic two-bone IK. Returns the middle joint (knee/elbow) and the end
 *  (ankle/wrist). The middle joint bends toward `pole`. Out-of-reach targets
 *  are pulled in along the root→target line, so lengths are always exact. */
export function solveTwoBone(root, target, l1, l2, pole) {
  const toT = sub(target, root);
  const dist = len(toT);
  const dir = dist > 1e-9 ? scale(toT, 1 / dist) : [0, -1, 0];
  const d = clamp(dist, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let bend = sub(sub(pole, root), scale(dir, dot(sub(pole, root), dir)));
  if (len(bend) < 1e-6) bend = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
  bend = norm(sub(bend, scale(dir, dot(bend, dir))));
  return { joint: add(add(root, scale(dir, a)), scale(bend, h)), end: add(root, scale(dir, d)) };
}

/** C2 soft reach avoids the singular straight-elbow configuration. */
export function softArmTarget(root,target,l1,l2){
 const v=sub(target,root),d=len(v),limit=l1+l2-.035,band=.05,start=limit-band;
 if(d<=start)return target;
 const u=clamp((d-start)/(2*band),0,1);
 const mapped=start+band*(2*u-2*u**3+u**4);
 return add(root,scale(v,mapped/d));
}


export function minimumJerk(x){const u=clamp(x,0,1);return u*u*u*(10+u*(-15+6*u));}
