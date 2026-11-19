// Repair the sleeve weights of the packaged lesson avatar (assets/animation/avatar-v2.{json,bin}).
//
// The rig's automatic weighting (rig_pose.py, stage B) gave the underside of each sleeve, the side that faces the
// torso in the rest A-pose, torso weight all the way down the arm: about a quarter chest and a third shoulder helper on
// the upper arm, and a tenth chest on the forearm. When an arm crosses the chest, rises or reaches forward, that cloth is
// left behind and folds inside out. This tool gives each sleeve vertex the weights of the outer sleeve at the same
// point along the arm (the outer sleeve follows the arm correctly), fully on the underside and fading to nothing on
// the outer side, keeping the armpit seam band of the upper arm as it is so the sleeve stays joined to the jacket.
//
// Only skin weights and indices change: every position, normal, index and other byte of the asset is identical, so the
// rest shape, face, hair, hands, belt and proportions are untouched. It runs on the exact published asset only.
// Run: node tools/avatar/repair-sleeve-weights.mjs   (rewrites assets/animation/avatar-v2.{bin,json})
import {readFileSync, writeFileSync} from 'node:fs';
import {fnv1a} from '../../js/animation/avatar-core.js';

export const SOURCE_FNV1A = '814b1ca7';   // the published asset this repair applies to
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0), len = a => Math.hypot(...a);

/* The repair itself, on a decoded cloth group: returns the new u8 skin indices and weights and what changed. */
export function repairSleeves({meta, positions: P, normals: N, skinIndex: SI, skinWeight: SW, vertices: n, index = null}) {
  const names = meta.bones.map(b => b.name), bi = x => names.indexOf(x), head = x => meta.bones[bi(x)].head;
  const outSI = Uint8Array.from(SI), outSW = Uint8Array.from(SW), touched = new Set(), report = [];
  const weightsOf = i => { const o = new Map(); for (let k = 0; k < 4; k++) if (SW[4 * i + k]) o.set(SI[4 * i + k], (o.get(SI[4 * i + k]) || 0) + SW[4 * i + k] / 255); return o; };
  for (const S of ['L', 'R']) {
    const toTorso = S === 'L' ? -1 : 1, armRe = new RegExp(`^(upper|shoulder|elbow|fore|hand)\\.${S}$`), chest = bi('chest');
    // Each sleeve vertex goes with the arm segment it lies along (closest centre line if near the elbow).
    const segs = [['upper', head('upper.' + S), head('fore.' + S)], ['fore', head('fore.' + S), head('hand.' + S)]], member = new Map();
    for (let i = 0; i < n; i++) {
      const v = [P[3 * i], P[3 * i + 1], P[3 * i + 2]], nr = [N[3 * i], N[3 * i + 1], N[3 * i + 2]];
      let arm = 0; for (let k = 0; k < 4; k++) if (armRe.test(names[SI[4 * i + k]])) arm += SW[4 * i + k] / 255; if (arm <= .3) continue;
      for (const [seg, A, B] of segs) {
        const AB = sub(B, A), f = dot(sub(v, A), AB) / dot(AB, AB); if (f < -.05 || f > 1.05) continue;
        const foot = A.map((x, j) => x + AB[j] * Math.max(0, Math.min(1, f))), o = sub(v, foot), r = len(o);
        if (r > .12 || dot(nr, o) / ((len(nr) || 1) * (r || 1)) <= .3) continue;   // sleeve surface: faces away from its arm's centre line
        const prev = member.get(i); if (!prev || r < prev.r) member.set(i, {seg, f, r, tau: o[0] * toTorso / r});
      }
    }
    for (const seg of ['upper', 'fore']) {
      const verts = [...member].filter(([, m]) => m.seg === seg);
      // Reference: the outer sleeve's mean weights in 10% bands along the segment, smoothed across neighbouring bands.
      const bands = Array.from({length: 11}, () => ({w: new Map(), c: 0}));
      for (const [i, m] of verts) if (m.tau < -.2) { const b = bands[Math.max(0, Math.min(10, Math.round(m.f * 10)))]; b.c++; for (const [k, w] of weightsOf(i)) b.w.set(k, (b.w.get(k) || 0) + w); }
      const ref = f => { const x = Math.max(0, Math.min(10, f * 10)), lo = Math.floor(x), out = new Map(); let total = 0;
        for (const [j, wt] of [[lo - 1, .25], [lo, 1 - (x - lo)], [lo + 1, x - lo], [lo + 2, .25]]) { const b = bands[Math.max(0, Math.min(10, j))]; if (!b.c) continue; total += wt; for (const [k, w] of b.w) out.set(k, (out.get(k) || 0) + wt * w / b.c); }
        for (const [k, w] of out) out.set(k, w / total); return out; };
      let changed = 0, chestBefore = 0, chestAfter = 0, under = 0;
      for (const [i, m] of verts) {
        const side = smooth((m.tau + .3) / .6), along = seg === 'upper' ? smooth((m.f - .02) / .38) : 1, beta = side * along; if (beta < .01) continue;
        const orig = weightsOf(i), target = ref(m.f), mix = new Map();
        for (const [k, w] of orig) mix.set(k, (1 - beta) * w); for (const [k, w] of target) mix.set(k, (mix.get(k) || 0) + beta * w);
        // Four largest influences, quantised to bytes that sum to exactly 255.
        const top = [...mix].filter(([, w]) => w > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, [, w]) => s + w, 0);
        const bytes = top.map(([k, w]) => [k, Math.floor(w / sum * 255)]); let rest = 255 - bytes.reduce((s, [, b]) => s + b, 0);
        const order = top.map(([, w], j) => [j, w / sum * 255 - bytes[j][1]]).sort((a, b) => b[1] - a[1]); for (let j = 0; rest > 0; j = (j + 1) % order.length, rest--) bytes[order[j][0]][1]++;
        for (let k = 0; k < 4; k++) { outSI[4 * i + k] = bytes[k] ? bytes[k][0] : 0; outSW[4 * i + k] = bytes[k] ? bytes[k][1] : 0; }
        touched.add(i); changed++;
        if (m.tau > .2) { under++; chestBefore += orig.get(chest) || 0; chestAfter += (bytes.find(([k]) => k === chest)?.[1] || 0) / 255; }
      }
      report.push({side: S, segment: seg, vertices: changed, underside: under, chestOnUndersideBefore: +(chestBefore / Math.max(1, under)).toFixed(3), chestOnUndersideAfter: +(chestAfter / Math.max(1, under)).toFixed(3)});
    }
  }
  // Smooth the result across the mesh around what changed (the changed vertices and their neighbours, a few passes),
  // so no two neighbouring vertices differ sharply in weight: a jump between a reweighted vertex and its untouched
  // neighbour in the armpit seam stretched that edge when the arm moved.
  if (index && touched.size) {
    const nbr = new Map(), add = (a, b) => { (nbr.get(a) || nbr.set(a, new Set()).get(a)).add(b); };
    for (let t = 0; t < index.length; t += 3) for (const [a, b] of [[index[t], index[t + 1]], [index[t + 1], index[t + 2]], [index[t + 2], index[t]]]) { add(a, b); add(b, a); }
    const region = new Set(touched); for (const i of touched) for (const j of nbr.get(i) || []) region.add(j);
    const wmap = i => { const o = new Map(); for (let k = 0; k < 4; k++) if (outSW[4 * i + k]) o.set(outSI[4 * i + k], (o.get(outSI[4 * i + k]) || 0) + outSW[4 * i + k] / 255); return o; };
    let cur = new Map([...region].map(i => [i, wmap(i)]));
    for (let pass = 0; pass < 4; pass++) {
      const next = new Map();
      for (const i of region) { const mix = new Map(cur.get(i)); let c = 1; for (const j of nbr.get(i) || []) { const wj = cur.get(j) || wmap(j); for (const [b, w] of wj) mix.set(b, (mix.get(b) || 0) + w); c++; } for (const [b, w] of mix) mix.set(b, w / c); next.set(i, mix); }
      cur = next;
    }
    for (const i of region) {
      const top = [...cur.get(i)].filter(([, w]) => w > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s2, [, w]) => s2 + w, 0);
      const bytes = top.map(([k, w]) => [k, Math.floor(w / sum * 255)]); let rest = 255 - bytes.reduce((s2, [, b]) => s2 + b, 0);
      const order = top.map(([, w], j) => [j, w / sum * 255 - bytes[j][1]]).sort((a, b) => b[1] - a[1]); for (let j = 0; rest > 0; j = (j + 1) % order.length, rest--) bytes[order[j][0]][1]++;
      for (let k = 0; k < 4; k++) { outSI[4 * i + k] = bytes[k] ? bytes[k][0] : 0; outSW[4 * i + k] = bytes[k] ? bytes[k][1] : 0; }
      touched.add(i);
    }
  }
  return {skinIndex: outSI, skinWeight: outSW, touched, report};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL('../../assets/animation/', import.meta.url), meta = JSON.parse(readFileSync(new URL('avatar-v2.json', dir))), bin = readFileSync(new URL('avatar-v2.bin', dir));
  const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  if (fnv1a(buf) !== SOURCE_FNV1A || meta.fnv1a !== SOURCE_FNV1A) throw new Error(`expected the published asset ${SOURCE_FNV1A}, found ${fnv1a(buf)}: already repaired or a different build`);
  const g = meta.groups.find(x => x.material === 'cloth'), n = g.vertices;
  const index = g.indexType === 'uint32' ? new Uint32Array(buf, g.index, g.triangles * 3) : new Uint16Array(buf, g.index, g.triangles * 3);
  const r = repairSleeves({meta, vertices: n, index, positions: new Float32Array(buf, g.position, n * 3), normals: new Int16Array(buf, g.normal, n * 3), skinIndex: new Uint8Array(buf, g.skinIndex, n * 4), skinWeight: new Uint8Array(buf, g.skinWeight, n * 4)});
  const out = new Uint8Array(buf.slice(0)); out.set(r.skinIndex, g.skinIndex); out.set(r.skinWeight, g.skinWeight);
  meta.fnv1a = fnv1a(out.buffer);
  writeFileSync(new URL('avatar-v2.bin', dir), out); writeFileSync(new URL('avatar-v2.json', dir), JSON.stringify(meta) + '\n');
  console.log(JSON.stringify({from: SOURCE_FNV1A, to: meta.fnv1a, vertices: r.touched.size, report: r.report}, null, 1));
}
