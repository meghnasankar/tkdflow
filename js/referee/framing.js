/* Camera framing for the referee arena. One framing per scenario: landmarks of both fighters (soles, ankles, knees,
   hands, head protectors, trunk protectors) sampled through the whole exchange, and the point the camera looks at.
   For any orbit angle the camera stands just far enough back for every landmark to stay inside the picture with a
   margin, so the default view, the presets, Reset view and plain orbiting always show both whole fighters from the
   first frame to the last (boundary crossings and falls included). Zooming in on purpose can crop. Pure maths, so
   tests/referee.test.mjs checks the arena's real camera. */
import {solveFighter, stateAt, strikePoint, headCentre, trunkSurface, trunkTop, solePoints, TRUNK} from './fighter.js';

export const FOV = 32;                 // vertical field of view, degrees
export const MARGIN = .86;             // landmarks stay within 86% of the half-width and half-height of the picture
export const ZOOM = Object.freeze({min: .6, max: 3});
export const HOME = Object.freeze({azimuth: 90, elevation: 16, zoom: 1});
export const PRESETS = Object.freeze({
  side: Object.freeze({azimuth: 90, elevation: 16}), referee: Object.freeze({azimuth: 35, elevation: 22}),
  above: Object.freeze({azimuth: 90, elevation: 62}), behind: Object.freeze({azimuth: 180, elevation: 14})
});
const HEAD_REACH = .17;                // head protector plus hair, from the head centre

/* The landmarks of one posed fighter (world points). */
export function landmarks(pose) {
  const out = [], h = headCentre(pose);
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) out.push(h.map((v, i) => v + d[i] * HEAD_REACH));
  for (const side of ['left', 'right']) {
    const a = pose.arms[side], l = pose.legs[side];
    out.push(a.shoulder, a.elbow, a.wrist, strikePoint(pose, `fist:${side}`), l.hip, l.knee, l.ankle, strikePoint(pose, `ball:${side}`), strikePoint(pose, `heel:${side}`), ...solePoints(l));
  }
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) out.push(trunkSurface(pose, a, TRUNK.bottom), trunkSurface(pose, a, trunkTop(a)));
  return out;
}

/* Landmarks of both fighters through the whole scenario (every 1/30 s and the last frame), and the look-at point:
   the middle of their bounding box. */
export function framing(scenario, step = 1 / 30) {
  const points = [], times = [];
  for (let t = 0; t < scenario.duration; t += step) times.push(t);
  times.push(scenario.duration);
  for (const t of times) for (const who of ['blue', 'red']) points.push(...landmarks(solveFighter(stateAt(scenario.keys[who], t))));
  const lo = [0, 1, 2].map(i => Math.min(...points.map(p => p[i]))), hi = [0, 1, 2].map(i => Math.max(...points.map(p => p[i])));
  return {points, centre: lo.map((v, i) => (v + hi[i]) / 2), cache: new Map()};
}

const unit = (az, el) => { const a = az * Math.PI / 180, e = el * Math.PI / 180; return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function basis(az, el) {        // camera axes for a camera on direction `back` from the target, looking at it, world up
  const back = unit(az, el), right = norm(cross([0, 1, 0], back)), up = cross(back, right);
  return {back, right, up};
}

/* The smallest distance from the look-at point at which every landmark fits within the margin. */
export function fitDistance(frame, azimuth, elevation, aspect) {
  const key = `${azimuth.toFixed(2)}|${elevation.toFixed(2)}|${aspect.toFixed(3)}`;
  if (frame.cache?.has(key)) return frame.cache.get(key);
  const {back, right, up} = basis(azimuth, elevation), ty = Math.tan(FOV * Math.PI / 360) * MARGIN, tx = ty * aspect;
  let d = 0;
  for (const p of frame.points) {
    const q = [p[0] - frame.centre[0], p[1] - frame.centre[1], p[2] - frame.centre[2]], along = dot(q, back);
    d = Math.max(d, along + Math.abs(dot(q, up)) / ty, along + Math.abs(dot(q, right)) / tx);
  }
  frame.cache?.set(key, d);
  return d;
}

/* Where the camera stands and what it looks at for a view {azimuth, elevation, zoom}. */
export function cameraFor(frame, view, aspect) {
  const d = fitDistance(frame, view.azimuth, view.elevation, aspect) / (view.zoom || 1), dir = unit(view.azimuth, view.elevation);
  return {position: frame.centre.map((c, i) => c + dir[i] * d), target: frame.centre, distance: d};
}

/* A world point in normalised device coordinates (x and y from -1 to 1 inside the picture) for a camera looking from
   `position` at `target` with world up; the same projection three.js's PerspectiveCamera.lookAt gives. */
export function project(p, position, target, aspect, fov = FOV) {
  const back = norm(position.map((v, i) => v - target[i])), right = norm(cross([0, 1, 0], back)), up = cross(back, right);
  const q = p.map((v, i) => v - position[i]), depth = -dot(q, back), ty = Math.tan(fov * Math.PI / 360);
  return [dot(q, right) / (depth * ty * aspect), dot(q, up) / (depth * ty), depth];
}

/* The old camera (before the fix): 4.6 m from the midpoint of the pelvises at hip height, whatever the exchange. */
export function legacyCamera(poses, view) {
  const c = [(poses.blue.pelvis[0] + poses.red.pelvis[0]) / 2, .95, (poses.blue.pelvis[2] + poses.red.pelvis[2]) / 2], dir = unit(view.azimuth, view.elevation);
  return {position: c.map((v, i) => v + dir[i] * 4.6), target: c};
}
