/* The shipped detailed avatar, built in Node from the real asset with the real poser, plus the lesson motions.
   Measurements use the actual skinned vertex positions (three.js applies the skin weights on the CPU). */
import {readFileSync} from 'node:fs';
import * as THREE from '../../vendor/three/three.module.js';
import {createAvatarCore} from '../../js/animation/avatar-core.js';
import {createFormMotion} from '../../js/animation/form-motion.js';
import * as T1 from '../../js/animation/taegeuk-1-motion.js';
import {POSES as T1_POSES} from '../../js/lessons/taegeuk-1-data.js';

const read = p => readFileSync(new URL('../../' + p, import.meta.url));
export const json = p => JSON.parse(read(p));
export const meta = json('assets/animation/avatar-v2.json');
const bin = read('assets/animation/avatar-v2.bin');
export const binary = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
export {THREE};
export const core = createAvatarCore(THREE);
export const av = core.buildAvatar(meta, binary.slice(0));
export const apply = core.createPoser(av);
export const meshes = Object.fromEntries(av.root.children.filter(c => c.isSkinnedMesh).map(m => [m.name, m]));
export const boneIndex = Object.fromEntries(meta.bones.map((b, i) => [b.name, i]));
export const forms = json('data/forms.json');
export const motions = Object.fromEntries(forms.map(f => [f.id, f.id === 'taegeuk-1' ? {...T1, POSES: T1_POSES} : createFormMotion(json(`data/lessons/${f.id}.json`))]));

export const restPositions = name => { const a = meshes[name].geometry.attributes.position, o = []; for (let i = 0; i < a.count; i++) o.push(new THREE.Vector3().fromBufferAttribute(a, i)); return o; };
export const posed = (name, i) => meshes[name].getVertexPosition(i, new THREE.Vector3());
export const posedAll = name => { const n = meshes[name].geometry.attributes.position.count, o = new Array(n); for (let i = 0; i < n; i++) o[i] = posed(name, i); return o; };
/* Per-vertex skin weights by bone name (from the shipped u8 weights). */
export function weightsOf(name, i) {
  const g = meshes[name].geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, out = {};
  for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > 0) { const b = meta.bones[si.getComponent(i, k)].name; out[b] = (out[b] || 0) + w; } }
  return out;
}
/* Skin vertices that belong to each foot (more than 60% foot weight). */
export const footVerts = Object.fromEntries(['L', 'R'].map(S => {
  const out = []; for (let i = 0; i < meshes.skin.geometry.attributes.position.count; i++) if ((weightsOf('skin', i)['foot.' + S] || 0) > .6) out.push(i);
  return [S, out];
}));
/* The same lesson pose turned to another heading about the vertical axis. */
export function rotatePose(p, deg) {
  if (!deg) return p;
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), R = v => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  const arms = Object.fromEntries(Object.entries(p.arms).map(([k, a]) => [k, {...a, shoulder: R(a.shoulder), elbow: R(a.elbow), wrist: R(a.wrist)}]));
  const legs = Object.fromEntries(Object.entries(p.legs).map(([k, l]) => [k, {...l, hip: R(l.hip), knee: R(l.knee), ankle: R(l.ankle), yaw: l.yaw + deg, lateral: l.lateral ? R(l.lateral) : l.lateral}]));
  return {...p, pelvis: R(p.pelvis), yaw: p.yaw + deg, chestYaw: p.chestYaw + deg, arms, legs};
}
export const poseTime = (m, i) => { const c = m.CHAPTERS[i]; return c.at ?? c.start; };

/* Feet after posing: lowest sole point, heel and ball heights, and heel→toe heading against the lesson's foot yaw. */
export function measureFeet(p) {
  const out = {};
  for (const [side, S] of [['left', 'L'], ['right', 'R']]) {
    const l = p.legs[side], pts = footVerts[S].map(i => posed('skin', i));
    const fwd = new THREE.Vector3(Math.sin(l.yaw * Math.PI / 180), 0, Math.cos(l.yaw * Math.PI / 180)), ank = new THREE.Vector3(...l.ankle);
    const along = pts.map(v => v.clone().sub(ank).dot(fwd)), lo = Math.min(...along), hi = Math.max(...along);
    const minY = a => Math.min(...a.map(v => v.y));
    const heel = pts.filter((v, i) => along[i] < lo + .04), ball = pts.filter((v, i) => along[i] > hi - .06);
    const dir = pts[along.indexOf(hi)].clone().sub(pts[along.indexOf(lo)]), flat = new THREE.Vector3(dir.x, 0, dir.z);
    out[side] = {grounded: l.ankle[1] <= .075, sole: minY(pts), heel: minY(heel), ball: minY(ball), headingErr: flat.angleTo(fwd) * 180 / Math.PI, pts, l};
  }
  return out;
}
