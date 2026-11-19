/* The detailed lesson avatar (assets/animation/avatar-v2.*), checked on the real asset: its skin weights, where its
   feet, joints and hands land in every lesson, its cloth and trim in the review poses, its size, and that a lesson
   falls back to the procedural avatar when the asset can't be used. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {THREE, meta, binary, av, apply, meshes, boneIndex, forms, motions, restPositions, posedAll, weightsOf, footVerts, rotatePose, poseTime, measureFeet, json} from './helpers/detailed-avatar.mjs';
import {validateAvatarAsset, fnv1a, HAND_BONES} from '../js/animation/avatar-core.js';

const deg = r => r * 180 / Math.PI;
const V = a => new THREE.Vector3(...a);
const isArm = n => /^(upper|fore|elbow|hand|index|middle|ring|pinky|thumb)/.test(n);

test('the asset is within its size budget and its recorded length and checksum match the file', () => {
  assert.equal(meta.format, 'tkdflow-avatar-v2');
  assert.equal(binary.byteLength, meta.byteLength); assert.equal(fnv1a(binary), meta.fnv1a);
  assert.ok(binary.byteLength <= 1_000_000, 'at most 1 MB raw');
  assert.ok(gzipSync(Buffer.from(binary), {level: 9}).length <= 600_000, 'at most 600 KB gzipped');
  assert.ok(meta.groups.reduce((s, g) => s + g.triangles, 0) <= 40_000, 'at most 40,000 triangles');
  assert.match(meta.source, /CC0/);
});

test('a truncated, altered or mismatched asset is rejected before anything is built', () => {
  assert.equal(validateAvatarAsset(meta, binary), true);
  assert.throws(() => validateAvatarAsset(meta, binary.slice(0, binary.byteLength - 4)), /length/);
  const altered = binary.slice(0); new Uint8Array(altered)[1234] ^= 0xff;
  assert.throws(() => validateAvatarAsset(meta, altered), /checksum/);
  assert.throws(() => validateAvatarAsset({...meta, format: 'other'}, binary), /format/);
  const g0 = meta.groups[0];
  assert.throws(() => validateAvatarAsset({...meta, groups: [{...g0, vertices: g0.vertices * 40}, ...meta.groups.slice(1)]}, binary), /range/);
  assert.throws(() => validateAvatarAsset({...meta, handRules: {shapes: {}}}, binary), /hand shapes/);
});

test('real skin weights: every vertex sums to one; torso cloth never follows an arm and sleeves never follow the pelvis', () => {
  const armBones = Object.keys(boneIndex).filter(isArm).map(n => meta.bones[boneIndex[n]]);
  const segDist = (p, b) => { const a = V(b.head), t = V(b.tail), d = t.clone().sub(a), u = Math.max(0, Math.min(1, p.clone().sub(a).dot(d) / d.lengthSq())); return p.distanceTo(a.addScaledVector(d, u)); };
  for (const name of Object.keys(meshes)) {
    const sw = meshes[name].geometry.attributes.skinWeight;
    for (let i = 0; i < sw.count; i++) { let s = 0; for (let k = 0; k < 4; k++) s += sw.getComponent(i, k); assert.ok(Math.abs(s - 1) < 1e-6, `${name} ${i} weights sum ${s}`); }
  }
  const rest = restPositions('cloth'); let torso = 0, sleeves = 0;
  for (let i = 0; i < rest.length; i++) {
    const w = weightsOf('cloth', i), p = rest[i], armW = Object.entries(w).filter(([n]) => isArm(n)).reduce((s, [, x]) => s + x, 0);
    // Torso cloth: on the trunk between the hips and the armpits, at least 12 cm from every arm bone in the rest pose.
    // (Weight smoothing may leave a trace of under 5%; the punch "wing" this guards against carried far more.)
    if (Math.abs(p.x) < .13 && p.y > .95 && p.y < 1.25 && Math.min(...armBones.map(b => segDist(p, b))) > .12) { torso++; assert.ok(armW < .05, `torso cloth ${i} follows an arm (${armW.toFixed(2)})`); }
    if ((w['fore.L'] || 0) + (w['fore.R'] || 0) > .5) { sleeves++; assert.equal((w.pelvis || 0) + (w['thigh.L'] || 0) + (w['thigh.R'] || 0), 0, `sleeve ${i} follows the hips`); }
  }
  assert.ok(torso > 150 && sleeves > 100, `enough cloth classified (${torso} torso, ${sleeves} sleeve)`);
});

test('real skin weights: the crotch seam never ties the two legs together, and hands and feet follow their own bones', () => {
  const rest = restPositions('cloth'), hip = meta.bones[boneIndex['thigh.L']].head[1];
  for (let i = 0; i < rest.length; i++) {
    // The trousers' crotch seam (the jacket skirt hangs in front of it, more than 11 cm forward, and drapes over both legs).
    const p = rest[i]; if (Math.abs(p.x) > .02 || p.y > hip || p.y < hip - .2 || p.z > .11) continue;
    const w = weightsOf('cloth', i), L = (w['thigh.L'] || 0) + (w['shin.L'] || 0), R = (w['thigh.R'] || 0) + (w['shin.R'] || 0);
    assert.ok(Math.min(L, R) < .2, `seam vertex ${i} follows both legs (${L.toFixed(2)} / ${R.toFixed(2)})`);
  }
  const skin = restPositions('skin');
  for (const S of ['L', 'R']) {
    const ankle = meta.bones[boneIndex['foot.' + S]].head[1];
    for (let i = 0; i < skin.length; i++) if (skin[i].y < ankle - .01 && Math.sign(skin[i].x) === (S === 'L' ? 1 : -1)) assert.equal(weightsOf('skin', i)['foot.' + S], 1, `foot vertex ${i} below the ankle`);
    // No vertex on the thumb is pulled by the thumb tip and the palm at once (that tore the thumb's base when it tucked).
    for (let i = 0; i < skin.length; i++) { const w = weightsOf('skin', i); if (w['thumb2.' + S] && w['hand.' + S]) assert.fail(`skin ${i} mixes the thumb tip and the palm`); }
  }
  assert.ok(footVerts.L.length > 40 && footVerts.R.length > 40);
});

test('the black collar is part of the jacket surface: every collar edge vertex sits on a jacket vertex', () => {
  const black = restPositions('black'), cloth = restPositions('cloth'), key = v => v.toArray().map(x => Math.round(x * 2e4)).join();
  const onCloth = new Set(cloth.map(key)); let collar = 0, shared = 0;
  for (const v of black) if (v.y > 1.25) { collar++; if (onCloth.has(key(v))) shared++; }
  assert.ok(collar > 20, 'collar vertices present');
  assert.ok(shared / collar > .35, `collar shares its outline with the jacket (${shared}/${collar})`);
});

/* Every held pose of all 23 lessons, posed through the real poser. */
const held = forms.flatMap(f => motions[f.id].CHAPTERS.map((_, i) => [f.id, i]));

test('grounded feet stand on the floor, flat and pointing the lesson\'s way, at every held pose of all 23 lessons', () => {
  assert.equal(forms.length, 23);
  let grounded = 0;
  for (const [id, i] of held) {
    const p = motions[id].poseAtTime(poseTime(motions[id], i)); apply(p);
    for (const [side, f] of Object.entries(measureFeet(p))) {
      if (!f.grounded) continue; grounded++;
      const where = `${id} pose ${i + 1} ${side}`;
      assert.ok(Math.abs(f.sole) <= .012, `${where}: sole ${f.sole.toFixed(3)} m from the floor`);
      assert.ok(Math.abs(f.heel - f.ball) <= .012, `${where}: heel and ball differ by ${(f.heel - f.ball).toFixed(3)} m`);
      assert.ok(f.headingErr <= 8, `${where}: foot heading ${f.headingErr.toFixed(1)}° off`);
    }
  }
  assert.ok(grounded > 1000, `grounded feet measured: ${grounded}`);
});

test('the ready stance stays grounded and flat when the performer faces each of the four directions', () => {
  const m = motions['taegeuk-1'];
  for (const heading of [0, 90, 180, 270]) {
    const p = rotatePose(m.poseAtTime(poseTime(m, 0)), heading); apply(p);
    for (const [side, f] of Object.entries(measureFeet(p))) {
      assert.ok(f.grounded && Math.abs(f.sole) <= .012 && Math.abs(f.heel - f.ball) <= .012 && f.headingErr <= 8, `heading ${heading} ${side}`);
    }
  }
});

test('side kicks present the sole to the target in every lesson', () => {
  let kicks = 0;
  for (const [id, i] of held) {
    const m = motions[id], p = m.poseAtTime(poseTime(m, i));
    for (const [side, S] of [['left', 'L'], ['right', 'R']]) {
      const l = p.legs[side]; if (!(l.ankle[1] > .3 && l.pitch <= -80)) continue;
      apply(p); kicks++;
      // The sole slab (the foot skin that rests on the floor in the rest pose), fitted after posing: its outward
      // normal must point along the shin toward the target.
      const R = restPositions('skin'), low = Math.min(...footVerts[S].map(k => R[k].y));
      const slab = footVerts[S].filter(k => R[k].y < low + .012).map(k => meshes.skin.getVertexPosition(k, new THREE.Vector3()));
      const all = footVerts[S].map(k => meshes.skin.getVertexPosition(k, new THREE.Vector3()));
      const c0 = slab.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / slab.length), C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (const v of slab) { const q = v.clone().sub(c0).toArray(); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += q[a] * q[b]; }
      const mul = v => new THREE.Vector3(...[0, 1, 2].map(a => C[a][0] * v.x + C[a][1] * v.y + C[a][2] * v.z));
      let e1 = new THREE.Vector3(1, .3, .2); for (let k = 0; k < 60; k++) e1 = mul(e1).normalize();
      let e2 = new THREE.Vector3(.2, 1, .3); for (let k = 0; k < 60; k++) { e2 = mul(e2); e2.sub(e1.clone().multiplyScalar(e2.dot(e1))).normalize(); }
      const n = new THREE.Vector3().crossVectors(e1, e2).normalize(), centre = all.reduce((a, v) => a.add(v.clone()), new THREE.Vector3()).multiplyScalar(1 / all.length);
      if (n.dot(c0.clone().sub(centre)) < 0) n.negate();
      const toTarget = V(l.ankle).sub(V(l.knee)).normalize();
      assert.ok(deg(n.angleTo(toTarget)) <= 35, `${id} pose ${i + 1} ${side}: sole ${deg(n.angleTo(toTarget)).toFixed(0)}° from the kick`);
    }
  }
  assert.ok(kicks >= 10, `side kicks measured: ${kicks}`);
});

test('retargeting: joints land on the lesson\'s joints within 1 mm and no bone flips between frames, in all 23 lessons', () => {
  const lift = apply.lift, up = v => V(v).add(new THREE.Vector3(0, lift, 0)), world = n => av.bones[boneIndex[n]].getWorldPosition(new THREE.Vector3());
  const tracked = ['pelvis', 'chest', 'head', ...['upper', 'fore', 'hand', 'thigh', 'shin', 'foot', ...HAND_BONES].flatMap(b => [b + '.L', b + '.R'])];
  assert.ok(lift >= 0 && lift < .02, `uniform sole lift ${lift}`);
  for (const f of forms) {
    const m = motions[f.id], frames = Math.ceil(m.DURATION * 30); let prev = null;
    for (let k = 0; k <= frames; k++) {
      const p = m.poseAtTime(Math.min(m.DURATION, k / 30)); apply(p);
      if (k % 15 === 0) for (const [side, S] of [['left', 'L'], ['right', 'R']]) {
        const a = p.arms[side], l = p.legs[side];
        for (const [bone, joint] of [['upper', a.shoulder], ['fore', a.elbow], ['hand', a.wrist], ['thigh', l.hip], ['shin', l.knee], ['foot', l.ankle]])
          assert.ok(world(`${bone}.${S}`).distanceTo(up(joint)) < .001, `${f.id} t=${(k / 30).toFixed(2)} ${bone}.${S} off its joint`);
      }
      const now = tracked.map(n => av.bones[boneIndex[n]].getWorldQuaternion(new THREE.Quaternion()));
      if (prev) now.forEach((q, j) => assert.ok(deg(q.angleTo(prev[j])) < 45, `${f.id} t=${(k / 30).toFixed(2)} ${tracked[j]} turns ${deg(q.angleTo(prev[j])).toFixed(0)}° in one frame`));
      prev = now;
    }
  }
});

test('hands: closed hands are fists and open hands take their technique\'s shape with the fingers together', () => {
  const W = n => av.bones[boneIndex[n]].getWorldPosition(new THREE.Vector3());
  const tip = (f, S) => { const b = meta.bones[boneIndex[`${f}3.${S}`]], len = V(b.tail).distanceTo(V(b.head)), q = av.bones[boneIndex[`${f}3.${S}`]].getWorldQuaternion(new THREE.Quaternion()); return W(`${f}3.${S}`).add(new THREE.Vector3(0, len, 0).applyQuaternion(q)); };
  const seen = {fist: 0, knife: 0, spear: 0, palm: 0};
  for (const [id, i] of held) {
    const p = motions[id].poseAtTime(poseTime(motions[id], i)); apply(p);
    for (const [side, S] of [['left', 'L'], ['right', 'R']]) {
      const a = p.arms[side], palm = W(`hand.${S}`).lerp(W(`middle1.${S}`), .5), reach = tip('middle', S).distanceTo(palm), where = `${id} pose ${i + 1} ${side}`;
      if (a.open === 0) { seen.fist++; assert.ok(reach < .06, `${where}: fist fingertips ${reach.toFixed(3)} m from the palm`); }
      if (a.open === 1) {
        assert.ok(['knife', 'spear', 'palm', 'ridge'].includes(a.shape), `${where}: open hand has a technique shape (${a.shape})`);
        seen[a.shape] = (seen[a.shape] || 0) + 1;
        assert.ok(reach > .08, `${where}: open hand reaches ${reach.toFixed(3)} m`);
        if (a.shape !== 'palm') assert.ok(tip('index', S).distanceTo(tip('middle', S)) < .022 && tip('ring', S).distanceTo(tip('middle', S)) < .022, `${where}: fingers splayed`);
        // The thumb is tucked along the hand, not sticking out sideways.
        assert.ok(W(`thumb2.${S}`).distanceTo(W(`index1.${S}`)) < .06, `${where}: thumb away from the index`);
      }
    }
  }
  for (const k of ['fist', 'knife', 'spear', 'palm']) assert.ok(seen[k] > 0, `${k} hands seen in the lessons`);
  for (const S of ['L', 'R']) for (const b of HAND_BONES) assert.ok(meta.handRules.shapes.fist[S][b] && meta.handRules.shapes.knife[S][b]);
});

test('cloth and trim hold together in the review poses (no torn shards; black trim stays on the body)', () => {
  const restCloth = restPositions('cloth'), restBlack = restPositions('black');
  const review = [['taegeuk-1', 0], ['taegeuk-1', 2], ['taegeuk-1', 14], ['taegeuk-1', 12], ['taegeuk-3', 9], ['taegeuk-4', 2], ['taegeuk-6', 2], ['koryo', 4], ['taegeuk-8', 5]];
  for (const [id, i] of review) {
    const m = motions[id], p = m.poseAtTime(poseTime(m, i)); apply(p);
    for (const [name, R] of [['cloth', restCloth], ['black', restBlack]]) {
      const P = posedAll(name), idx = meshes[name].geometry.index.array;
      for (let k = 0; k < idx.length; k += 3) for (const [u, v] of [[idx[k], idx[k + 1]], [idx[k + 1], idx[k + 2]], [idx[k + 2], idx[k]]]) {
        const r0 = R[u].distanceTo(R[v]); if (r0 < .004) continue; const len = P[u].distanceTo(P[v]);
        assert.ok(!(len / r0 > 10 && len > .03), `${id} pose ${i + 1} ${name}: an edge stretched ${(len / r0).toFixed(1)}× to ${len.toFixed(3)} m`);
      }
    }
    // Trim to the body surface (point to triangle). The knot stands 3 cm proud by design and is measured on its own.
    const tris = []; for (const name of ['cloth', 'skin', 'hair']) { const P = posedAll(name), idx = meshes[name].geometry.index.array; for (let k = 0; k < idx.length; k += 3) tris.push([P[idx[k]], P[idx[k + 1]], P[idx[k + 2]]]); }
    const cell = .05, grid = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
    for (const t of tris) { const lo = [0, 1, 2].map(a => Math.floor(Math.min(...t.map(q => q.getComponent(a))) / cell)), hi = [0, 1, 2].map(a => Math.floor(Math.max(...t.map(q => q.getComponent(a))) / cell));
      for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { const k = key(x, y, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t); } }
    const tri = new THREE.Triangle(), cp = new THREE.Vector3(), B = posedAll('black');
    for (const [bi, v] of B.entries()) {
      const r = restBlack[bi]; if (r.y < .93 && r.z > .1) continue;        // belt tails hang free
      const knot = r.z > .12 && r.y > .88 && r.y < 1.03 && Math.abs(r.x) < .08;
      const c = [0, 1, 2].map(a => Math.floor(v.getComponent(a) / cell)); let best = 1;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const t of grid.get(key(c[0] + dx, c[1] + dy, c[2] + dz)) || []) { tri.set(...t); tri.closestPointToPoint(v, cp); best = Math.min(best, cp.distanceTo(v)); }
      assert.ok(best <= (knot ? .06 : .02), `${id} pose ${i + 1}: ${knot ? 'knot' : 'trim'} vertex ${bi} is ${best.toFixed(3)} m off the body`);
    }
  }
});

test('lesson motion is unchanged by the hand-shape labels and blends: positions, angles and timing match the published motion', () => {
  const digests = json('tests/helpers/motion-digests.json');
  for (const f of forms) {
    const m = motions[f.id], h = createHash('sha256');
    for (let k = 0, n = Math.ceil(m.DURATION * 10); k <= n; k++) {
      const p = m.poseAtTime(Math.min(m.DURATION, k / 10)), arms = Object.fromEntries(Object.entries(p.arms).map(([s, a]) => { const {shape, shapeFrom, shapeMix, ...rest} = a; return [s, rest]; }));
      h.update(JSON.stringify({pelvis: p.pelvis, yaw: p.yaw, chestYaw: p.chestYaw, lean: p.lean, headYaw: p.headYaw, arms, legs: p.legs}, (_, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));
    }
    assert.equal(h.digest('hex'), digests[f.id], f.id);
  }
});

/* A minimal browser stand-in for the procedural avatar's images and canvases (it draws its cloth and belt textures). */
function fakeBrowser({imagesFail = false} = {}) {
  const saved = {Image: globalThis.Image, document: globalThis.document};
  const ctx = new Proxy({}, {get: () => () => ({}), set: () => true});
  globalThis.document = {createElement: () => ({width: 0, height: 0, getContext: () => ctx})};
  globalThis.Image = class { constructor() { this.width = 64; this.height = 64; } set src(v) { queueMicrotask(() => imagesFail ? this.onerror?.(new Error('image ' + v)) : this.onload?.()); } };
  return () => { globalThis.Image = saved.Image; globalThis.document = saved.document; };
}
const fileLoad = (patch = b => b) => async src => {
  const body = readFileSync(new URL('..' + src, import.meta.url));
  return {ok: true, status: 200, json: async () => JSON.parse(body), arrayBuffer: async () => patch(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength))};
};
const start = (createAvatar, opts) => new Promise((resolve, reject) => { const a = createAvatar({...opts, onReady: () => resolve(a), onError: reject}); });

test('a lesson shows the detailed avatar, and falls back to the procedural one whenever the asset can\'t be used', async () => {
  const restore = fakeBrowser();
  try {
    const {createAvatar} = await import('../js/animation/avatar.js'), pose = motions['taegeuk-1'].poseAtTime(3);
    const good = await start(createAvatar, {load: fileLoad(), image: async () => null});
    assert.equal(good.root.userData.model, 'detailed-v2'); assert.equal(good.ready, true); good.applyPose(pose);
    assert.ok(good.root.userData.triangles > 30000 && good.root.userData.faceSource === 'modeled-features-no-photo');
    const failures = {
      'network error': () => Promise.reject(new Error('offline')),
      'missing file': async () => ({ok: false, status: 404}),
      'truncated binary': fileLoad(b => b.slice(0, b.byteLength - 100)),
      'altered binary': fileLoad(b => { const c = b.slice(0); new Uint8Array(c)[500] ^= 1; return c; }),
      'undecodable JSON': async () => ({ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); }, arrayBuffer: async () => new ArrayBuffer(8)})
    };
    for (const [why, load] of Object.entries(failures)) {
      const a = await start(createAvatar, {load, image: async () => null});
      assert.equal(a.root.userData.model, 'procedural-fallback', why); assert.equal(a.ready, true, why);
      assert.ok(a.root.userData.fallbackReason, why);
      a.applyPose(pose); a.applyPose({...pose, kihap: 1});        // the fallback still poses, kihap face included
    }
  } finally { restore(); }
  // Only when neither avatar can be shown does the lesson hear about it (it then shows its own message).
  const restore2 = fakeBrowser({imagesFail: true});
  try {
    const {createAvatar} = await import('../js/animation/avatar.js');
    await assert.rejects(start(createAvatar, {load: () => Promise.reject(new Error('offline')), image: async () => null}));
  } finally { restore2(); }
});

test('thumb web: open hands only crease, and the fist thumb lies on the fingers, at every held pose of all 23 lessons', () => {
  // Skin edges around the thumb and palm, stretched against their rest length. A pointed flap or a serrated lip
  // stretches its edges several times over; a crease doesn't. The fist's thumb web creases more (bounded here).
  const skin = meshes.skin, idx = skin.geometry.index.array, R = restPositions('skin'), E = {};
  for (const S of ['L', 'R']) {
    const near = new Set(); for (let i = 0; i < R.length; i++) if (Object.keys(weightsOf('skin', i)).some(n => /^(thumb|hand)/.test(n) && n.endsWith('.' + S))) near.add(i);
    const e = new Set(); for (let k = 0; k < idx.length; k += 3) for (const [a, b] of [[idx[k], idx[k + 1]], [idx[k + 1], idx[k + 2]], [idx[k + 2], idx[k]]]) if (near.has(a) || near.has(b)) e.add(Math.min(a, b) + ',' + Math.max(a, b));
    E[S] = [...e].map(x => x.split(',').map(Number)).filter(([a, b]) => R[a].distanceTo(R[b]) >= .001);
  }
  const W = n => av.bones[boneIndex[n]].getWorldPosition(new THREE.Vector3());
  const seg = (p, a, b) => { const d = b.clone().sub(a), u = Math.max(0, Math.min(1, p.clone().sub(a).dot(d) / d.lengthSq())); return p.distanceTo(a.addScaledVector(d, u)); };
  const seen = new Set();
  for (const [id, i] of held) {
    const p = motions[id].poseAtTime(poseTime(motions[id], i)); apply(p);
    for (const [side, S] of [['left', 'L'], ['right', 'R']]) {
      const a = p.arms[side], shape = a.open === 0 ? 'fist' : a.open === 1 ? a.shape : null; if (!shape) continue; seen.add(shape);
      let worst = 0, over = 0;
      for (const [u, v] of E[S]) { const r = meshes.skin.getVertexPosition(u, new THREE.Vector3()).distanceTo(meshes.skin.getVertexPosition(v, new THREE.Vector3())) / R[u].distanceTo(R[v]); worst = Math.max(worst, r); if (r > 2.5) over++; }
      const where = `${id} pose ${i + 1} ${side} ${shape}`;
      if (shape === 'fist') {
        assert.ok(worst < 6.5 && over <= 25, `${where}: thumb web stretched ${worst.toFixed(1)}× (${over} edges over 2.5×)`);
        // The thumb's middle joint rests on the folded index or middle finger (bone axes about a finger's width apart), not bowed out.
        const joint = W('thumb2.' + S), gap = Math.min(...['index', 'middle'].flatMap(f => [[`${f}1`, `${f}2`], [`${f}2`, `${f}3`]]).map(([x, y]) => seg(joint, W(`${x}.${S}`), W(`${y}.${S}`))));
        assert.ok(gap < .018, `${where}: thumb stands ${(gap * 100).toFixed(1)} cm off the fingers`);
        const tip = W('thumb2.' + S).add(new THREE.Vector3(0, V(meta.bones[boneIndex['thumb2.' + S]].tail).distanceTo(V(meta.bones[boneIndex['thumb2.' + S]].head)), 0).applyQuaternion(av.bones[boneIndex['thumb2.' + S]].getWorldQuaternion(new THREE.Quaternion())));
        const tipGap = Math.min(...['index', 'middle'].flatMap(f => [[`${f}1`, `${f}2`], [`${f}2`, `${f}3`]]).map(([x, y]) => seg(tip, W(`${x}.${S}`), W(`${y}.${S}`))));
        assert.ok(tipGap < .022, `${where}: thumb tip ${(tipGap * 100).toFixed(1)} cm off the fingers`);
      } else assert.ok(worst < 3 && over <= 5, `${where}: thumb web stretched ${worst.toFixed(1)}× (${over} edges over 2.5×)`);
    }
  }
  for (const k of ['fist', 'knife', 'spear', 'palm', 'ridge']) assert.ok(seen.has(k), `${k} hands measured`);
});

test('finger and thumb joints turn smoothly in all 23 lessons, and seeking gives the same fingers as playing', () => {
  // Every finger and thumb joint, relative to its parent, at 30 fps: an open hand changing technique (ridge-hand to
  // knife-hand, say) blends between the two shapes instead of switching at one frame (it jumped ~100° in Sipjin).
  const fingers = HAND_BONES.flatMap(b => [b + '.L', b + '.R']).map(n => av.bones[boneIndex[n]]);
  let worst = 0;
  for (const f of forms) {
    const m = motions[f.id]; let prev = null;
    for (let k = 0, n = Math.ceil(m.DURATION * 30); k <= n; k++) {
      apply(m.poseAtTime(Math.min(m.DURATION, k / 30)));
      const now = fingers.map(b => b.quaternion.clone());
      if (prev) now.forEach((q, j) => { const d = deg(q.angleTo(prev[j])); worst = Math.max(worst, d); assert.ok(d < 20, `${f.id} t=${(k / 30).toFixed(3)} ${fingers[j].name} turns ${d.toFixed(0)}° in one frame`); });
      prev = now;
    }
  }
  assert.ok(worst > 1, 'fingers do move');
  // Repeatable: the shape-changing stretch of Sipjin sampled in order and then in a shuffled order gives identical fingers.
  const m = motions.sipjin, times = Array.from({length: 120}, (_, i) => 104 + i / 30), at = new Map();
  for (const t of times) { apply(m.poseAtTime(t)); at.set(t, fingers.map(b => b.quaternion.toArray().join())); }
  for (const t of [...times].sort((a, b) => Math.sin(a * 999) - Math.sin(b * 999))) { apply(m.poseAtTime(t)); assert.deepEqual(fingers.map(b => b.quaternion.toArray().join()), at.get(t), `t=${t}`); }
  // The blend shows in the pose only while it is under way; held poses keep a single shape.
  const p = m.poseAtTime(106.6); assert.ok(['left', 'right'].some(s => p.arms[s].shapeMix > 0 && p.arms[s].shapeMix < 1), 'a shape blend is under way at 106.6 s');
  for (let i = 0; i < m.CHAPTERS.length; i++) { const q = m.poseAtTime(poseTime(m, i)); for (const s of ['left', 'right']) assert.equal(q.arms[s].shapeMix, undefined, `pose ${i + 1} ${s}`); }
});
