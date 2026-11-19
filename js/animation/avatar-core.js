/* The detailed avatar: build it from the packaged binary (assets/animation/avatar-v2.*) and pose it from the
   lesson's own joint positions. THREE is passed in, so the same code runs in the browser and in the Node tests.
   The mesh is a clothed character made from the CC0 Blender Studio Human Base Meshes (see AVATAR-SOURCE.md). */

/* FNV-1a (32-bit) over the whole binary: the JSON records it, so a truncated or mismatched file is rejected. */
export function fnv1a(buffer) {
  const bytes = new Uint8Array(buffer); let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/* Every check the browser makes before building: format, length, checksum, and that each attribute and index
   range lies inside the buffer and every index and bone reference is in range. Throws on the first problem. */
export function validateAvatarAsset(meta, buffer) {
  const fail = why => { throw new Error('avatar asset rejected: ' + why); };
  if (!meta || meta.format !== 'tkdflow-avatar-v2') fail('format');
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== meta.byteLength) fail('length');
  if (fnv1a(buffer) !== meta.fnv1a) fail('checksum');
  const bones = meta.bones?.length || 0; if (!bones || bones > 255) fail('bones');
  meta.bones.forEach((b, i) => { if (!(b.parent === -1 || (b.parent >= 0 && b.parent < i))) fail('bone order'); });
  for (const g of meta.groups || []) {
    const n = g.vertices, inside = (off, bytes) => Number.isInteger(off) && off >= 0 && off + bytes <= buffer.byteLength;
    if (!inside(g.position, n * 12) || !inside(g.normal, n * 6) || !inside(g.skinIndex, n * 4) || !inside(g.skinWeight, n * 4)) fail('attribute range');
    if (g.uv !== undefined && !inside(g.uv, n * 8)) fail('uv range');
    const wide = g.indexType === 'u32'; if (!inside(g.index, g.triangles * 3 * (wide ? 4 : 2))) fail('index range');
    const idx = wide ? new Uint32Array(buffer, g.index, g.triangles * 3) : new Uint16Array(buffer, g.index, g.triangles * 3);
    for (let i = 0; i < idx.length; i++) if (idx[i] >= n) fail('index value');
    const si = new Uint8Array(buffer, g.skinIndex, n * 4); for (let i = 0; i < si.length; i++) if (si[i] >= bones) fail('bone index');
  }
  for (const S of ['L', 'R']) for (const k of ['fist', 'knife', 'spear', 'palm', 'ridge']) if (!meta.handRules?.shapes?.[k]?.[S]) fail('hand shapes');
  return true;
}

export const HAND_BONES = ['index1', 'index2', 'index3', 'middle1', 'middle2', 'middle3', 'ring1', 'ring2', 'ring3', 'pinky1', 'pinky2', 'pinky3', 'thumb0', 'thumb1', 'thumb2'];

export function createAvatarCore(THREE) {
const V = a => new THREE.Vector3(...a);
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const COLOURS = {skin: [0xc4957a, .62], cloth: [0xf3f2ef, .86], black: [0x12151b, .7], hair: [0x161214, .78], gold: [0xeac979, .4], sclera: [0xd8d0c6, .4], iris: [0x4a2a1a, .35], pupil: [0x070606, .3], brow: [0x2a1d1a, .85]};
// The character's belt texture, as on the procedural avatar: "Sankar" in gold on one tail; the emblem and two gold
// bars on the other.
function beltTexture(label, emblem) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const ctx = c.getContext('2d');
  ctx.fillStyle = '#13161b'; ctx.fillRect(0, 0, 256, 1024);
  if (label) { ctx.save(); ctx.translate(130, 130); ctx.rotate(Math.PI / 2); ctx.font = 'bold 180px Georgia,serif'; ctx.fillStyle = '#eac979'; ctx.fillText(label, 0, 0); ctx.restore(); }
  else { ctx.drawImage(emblem, 30, 280, 196, 148); ctx.fillStyle = '#eac979'; ctx.fillRect(30, 855, 196, 18); ctx.fillRect(30, 900, 196, 18); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildAvatar(meta, buf, {beltName = 'Sankar', emblem = null} = {}) {
  validateAvatarAsset(meta, buf);
  // Bones carry the Blender rig's real rest orientation (including roll), so local rotations mean the same thing here.
  const bones = meta.bones.map(b => { const bone = new THREE.Bone(); bone.name = b.name; return bone; });
  const Q0 = meta.bones.map(b => new THREE.Quaternion(...b.q)), H0 = meta.bones.map(b => V(b.head));
  meta.bones.forEach((b, i) => {
    if (b.parent < 0) { bones[i].position.copy(H0[i]); bones[i].quaternion.copy(Q0[i]); return; }
    const inv = Q0[b.parent].clone().invert();
    bones[i].position.copy(H0[i].clone().sub(H0[b.parent]).applyQuaternion(inv)); bones[i].quaternion.copy(inv.multiply(Q0[i]));
    bones[b.parent].add(bones[i]);
  });
  const root = new THREE.Group(); root.name = 'detailed-avatar';
  root.add(bones[meta.bones.findIndex(b => b.parent < 0)]); root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  for (const g of meta.groups) {
    const geo = new THREE.BufferGeometry(), n = g.vertices;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, g.position, n * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Int16Array(buf, g.normal, n * 3), 3, true));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(new Uint8Array(buf, g.skinIndex, n * 4)), 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(buf, g.skinWeight, n * 4), 4, true));
    geo.setIndex(new THREE.BufferAttribute(g.indexType === 'u32' ? new Uint32Array(buf, g.index, g.triangles * 3) : new Uint16Array(buf, g.index, g.triangles * 3), 1));
    if (g.uv !== undefined) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, g.uv, n * 2), 2));
    const [colour, rough] = COLOURS[g.material] || COLOURS.black;
    const material = new THREE.MeshStandardMaterial({color: colour, roughness: rough, side: g.material === 'cloth' ? THREE.DoubleSide : THREE.FrontSide});
    if (g.material.startsWith('tail_') && typeof document !== 'undefined' && (g.material === 'tail_sankar' || emblem)) { material.color.set(0xffffff); material.roughness = .8; material.map = beltTexture(g.material === 'tail_sankar' ? beltName : null, emblem); }
    const mesh = new THREE.SkinnedMesh(geo, material);
    // The skeleton travels while the mesh root stays at the stage origin, so a cached rest bounding sphere would cull it.
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = g.material;
    root.add(mesh); mesh.bind(skeleton, new THREE.Matrix4());
  }
  const rest = {}; meta.bones.forEach((b, i) => { rest[b.name] = {i, head: V(b.head), tail: V(b.tail), parent: b.parent, q: Q0[i]}; });
  return {root, bones, skeleton, rest, meta, bytes: buf.byteLength};
}

/* ── pose from the runtime's joint positions ──
   Each limb bone is placed at the lesson's joint and turned with the same elbow-plane and knee frames the runtime
   uses; hands, feet, chest and head follow the pose's open, shape, roll, pitch, yaw, chestYaw and headYaw. */
function frame(dir, side) {   // orthonormal basis: Y along dir, X toward `side` (made perpendicular)
  const y = dir.clone().normalize(), x = side.clone().sub(y.clone().multiplyScalar(side.dot(y)));
  if (x.lengthSq() < 1e-8) x.set(1, 0, 0).sub(y.clone().multiplyScalar(y.x));
  x.normalize(); const z = new THREE.Vector3().crossVectors(x, y);
  return new THREE.Matrix4().makeBasis(x, y, z);
}
const quatFromFrames = (f, f0) => new THREE.Quaternion().setFromRotationMatrix(f.clone().multiply(f0.clone().transpose()));
/* A rotation's swing: what's left after removing its twist about the local +Y axis (q = swing · twist). */
function swingOnly(q) {
  const twist = new THREE.Quaternion(0, q.y, 0, q.w); if (twist.lengthSq() < 1e-12) return q.clone(); twist.normalize();
  return q.clone().multiply(twist.invert());
}
function createPoser(av) {
  const R = av.rest, bonesMeta = av.meta.bones, rules = av.meta.handRules, sides = [['left', 'L'], ['right', 'R']], rest0 = {};
  const dir0 = n => R[n].tail.clone().sub(R[n].head);
  for (const [, S] of sides) {
    const n0 = new THREE.Vector3().crossVectors(dir0('upper.' + S), dir0('fore.' + S)); if (n0.lengthSq() < 1e-8) n0.set(0, 0, 1); n0.normalize();
    rest0[S] = {upper: frame(dir0('upper.' + S), n0), fore: frame(dir0('fore.' + S), n0), thigh: frame(dir0('thigh.' + S), new THREE.Vector3(1, 0, 0)), shin: frame(dir0('shin.' + S), new THREE.Vector3(1, 0, 0)), n0};
  }
  const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), world = new Map();
  const Q = v => new THREE.Quaternion(v[1], v[2], v[3], v[0]);
  const shapes = Object.fromEntries(Object.entries(rules.shapes).map(([k, s]) => [k, Object.fromEntries(Object.entries(s).map(([S, b]) => [S, Object.fromEntries(Object.entries(b).map(([n, q]) => [n, Q(q)]))]))]));
  // A bone without its own target rides on its parent, with an optional rotation in its own frame (as Blender pose
  // rotation) and an optional offset `loc` in its own rest frame (as Blender pose location on an unconnected bone).
  function derive(name, pose = null, loc = null) {
    const r = R[name], pn = bonesMeta[r.parent].name, pw = world.get(pn), rp = R[pn];
    const restLocalQ = rp.q.clone().invert().multiply(r.q), restLocalP = r.head.clone().sub(rp.head).applyQuaternion(rp.q.clone().invert());
    if (loc) restLocalP.add(new THREE.Vector3(...loc).applyQuaternion(restLocalQ));
    const q = pw.quat.clone().multiply(restLocalQ); if (pose) q.multiply(pose);
    world.set(name, {pos: pw.pos.clone().add(restLocalP.applyQuaternion(pw.quat)), quat: q});
  }
  const set = (name, pos, worldRot) => world.set(name, {pos, quat: worldRot.clone().multiply(R[name].q)});   // worldRot turns the rest pose
  // The mesh's sole sits a little further below its ankle than the runtime's 7 cm, so the whole figure rises by the difference.
  const lift = Math.max(0, ((av.meta.feet?.L?.soleBelowAnkle ?? .07) + (av.meta.feet?.R?.soleBelowAnkle ?? .07)) / 2 - .07);
  const raise = v => [v[0], v[1] + lift, v[2]];
  function apply(p0) {
    const p = lift ? {...p0, pelvis: raise(p0.pelvis), arms: Object.fromEntries(Object.entries(p0.arms).map(([k, a]) => [k, {...a, shoulder: raise(a.shoulder), elbow: raise(a.elbow), wrist: raise(a.wrist)}])), legs: Object.fromEntries(Object.entries(p0.legs).map(([k, l]) => [k, {...l, hip: raise(l.hip), knee: raise(l.knee), ankle: raise(l.ankle)}]))} : p0;
    world.clear();
    const yawQ = new THREE.Quaternion().setFromAxisAngle(Y, p.yaw * Math.PI / 180);
    const chestQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.lean * Math.PI / 180, p.chestYaw * Math.PI / 180, 0, 'YXZ'));
    const pel = V(p.pelvis);
    set('pelvis', pel.clone().add(R.pelvis.head.clone().sub(R.chest.head).applyQuaternion(yawQ)), yawQ);
    set('chest', pel.clone(), chestQ);
    derive('neck'); world.get('neck').quat = chestQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, (p.headYaw || 0) * Math.PI / 180)).multiply(R.neck.q);
    derive('head');
    for (const [side, S] of sides) {
      const a = p.arms[side], l = p.legs[side], r0 = rest0[S];
      const sh = V(a.shoulder), el = V(a.elbow), wr = V(a.wrist), up = el.clone().sub(sh), lo = wr.clone().sub(el);
      let n = new THREE.Vector3().crossVectors(up, lo);
      if (n.lengthSq() < 1e-6) n = r0.n0.clone().applyQuaternion(chestQ);      // a straight arm keeps the chest's frame
      set('upper.' + S, sh, quatFromFrames(frame(up, n), r0.upper)); set('fore.' + S, el, quatFromFrames(frame(lo, n), r0.fore));
      // Helper bones take half of the joint's turn (the Blender rig's half-strength copy rotation), so the jacket folds
      // round a raised shoulder and a bent elbow instead of collapsing into fins. The shoulder helper takes half of the
      // arm's swing but none of its roll about the upper arm (its rest frame is the upper arm's, so +Y is along the
      // arm): the cloth round the shoulder, shared with the chest, isn't wrung when the arm rolls to cross the chest or
      // turn a block, and the sleeve itself (weighted to the upper arm) rolls with the arm.
      if (R['shoulder.' + S]) {
        const restUp = R.chest.q.clone().invert().multiply(R['upper.' + S].q), actualUp = world.get('chest').quat.clone().invert().multiply(world.get('upper.' + S).quat);
        derive('shoulder.' + S, new THREE.Quaternion().slerp(swingOnly(restUp.invert().multiply(actualUp)), .5));
      }
      if (R['elbow.' + S]) {
        const restFore = R['upper.' + S].q.clone().invert().multiply(R['fore.' + S].q), actual = world.get('upper.' + S).quat.clone().invert().multiply(world.get('fore.' + S).quat);
        derive('elbow.' + S, new THREE.Quaternion().slerp(restFore.invert().multiply(actual), .5));
      }
      derive('hand.' + S, new THREE.Quaternion().setFromAxisAngle(Y, (a.roll || 0) * Math.PI / 180));   // wrist roll about the hand's own axis
      // Hands: the baked shapes. A closed hand is the fist; an open hand is its technique's shape (knife-hand by
      // default; spear, palm or ridge where the lesson marks it); partly open hands blend between the two.
      // A hand changing from one open shape to another (shapeFrom → shape, shapeMix 0 → 1) blends both presets, and their
      // knuckle offsets, before the fist blend, so no finger jumps between frames.
      const k = 1 - Math.max(0, Math.min(1, a.open || 0)), name = n => n || (k < 1 ? 'palm' : 'knife');
      const toSet = (shapes[name(a.shape)] || shapes.knife)[S], fromSet = (shapes[name(a.shapeFrom ?? a.shape)] || shapes.knife)[S], fistSet = shapes.fist[S];
      const m = a.shapeMix === undefined ? 1 : Math.max(0, Math.min(1, a.shapeMix));
      const knuckle = (n, b) => (rules.knuckleSets?.[name(n)] || rules.knuckles)?.[S]?.[b];
      for (const b of HAND_BONES) {
        const kt = knuckle(a.shape, b), kf = knuckle(a.shapeFrom ?? a.shape, b);
        const loc = m === 1 ? kt?.map(x => x * (1 - k)) ?? null : kt || kf ? [0, 1, 2].map(i => ((kf?.[i] || 0) + ((kt?.[i] || 0) - (kf?.[i] || 0)) * m) * (1 - k)) : null;
        const open = m < 1 ? fromSet[b].clone().slerp(toSet[b], m) : toSet[b].clone();   // (three's slerp re-normalises even at 1)
        derive(`${b}.${S}`, open.slerp(fistSet[b], k), loc);
      }
      const lat = l.lateral ? V(l.lateral) : new THREE.Vector3(1, 0, 0).applyAxisAngle(Y, l.yaw * Math.PI / 180);
      const hip = V(l.hip), knee = V(l.knee), ank = V(l.ankle);
      set('thigh.' + S, hip, quatFromFrames(frame(knee.clone().sub(hip), lat), r0.thigh));
      set('shin.' + S, knee, quatFromFrames(frame(ank.clone().sub(knee), lat), r0.shin));
      // Feet: the lesson's yaw and pitch, measured against this mesh's own rest heading (the base foot toes out a little).
      const restYaw = (av.meta.feet?.[S]?.restHeadingDeg || 0) * Math.PI / 180;
      const footRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(l.pitch * Math.PI / 180, l.yaw * Math.PI / 180, 0, 'YXZ'));
      // Side kick: the sole (knife-foot and heel) faces the target along the shin. The lesson's own foot turn is kept
      // and only the smallest extra turn that points the sole along the shin is added, so the foot reads as a blade,
      // keeps the lesson's toe direction, and turns smoothly. It eases in as the kick rises and the foot turns (full
      // from 30 cm and -80°).
      const kick = smooth((ank.y - .15) / .15) * smooth((-l.pitch - 55) / 25);
      if (kick > 0) {
        const sole = new THREE.Vector3(0, -1, 0).applyQuaternion(footRot), d = ank.clone().sub(knee).normalize();
        footRot.premultiply(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(sole, d), kick));
      }
      // Undo the rest foot's own heading and toe drop, so a flat lesson foot puts heel and ball on the floor together.
      const restFix = new THREE.Quaternion().setFromAxisAngle(Y, -restYaw).multiply(new THREE.Quaternion().setFromAxisAngle(X, -(av.meta.feet?.[S]?.restToeDropDeg || 0) * Math.PI / 180));
      set('foot.' + S, ank, footRot.multiply(restFix));
    }
    bonesMeta.forEach((b, i) => {
      if (!world.has(b.name)) derive(b.name);
      const w = world.get(b.name), bone = av.bones[i];
      if (b.parent < 0) { bone.position.copy(w.pos); bone.quaternion.copy(w.quat); return; }
      const pw = world.get(bonesMeta[b.parent].name), inv = pw.quat.clone().invert();
      bone.position.copy(w.pos.clone().sub(pw.pos).applyQuaternion(inv)); bone.quaternion.copy(inv.multiply(w.quat));
    });
    av.root.updateMatrixWorld(true);
  }
  apply.lift = lift; apply.world = world;
  return apply;
}
return {buildAvatar, createPoser};
}
