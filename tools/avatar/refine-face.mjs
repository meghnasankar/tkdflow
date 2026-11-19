// A modest refinement of the lesson avatar's face toward a slimmer, softer oval (a generic young woman's face; no
// photograph or texture is used). The lower face is narrowed toward the midline: up to 7% at the jaw and chin, fading
// to nothing at the eyes (1.67 m), at the neck below the chin (1.53 m), toward the back of the head, and toward the
// outer contour by the ears (beyond 4–6 cm from the midline, so the hairline and sideburns stay covered), so
// the eyes, brows, hair, collar and every other group are untouched. Only `skin` vertex positions in that region
// change; normals, weights, indices and all other bytes are identical. Runs on the sleeve-repaired asset only.
// Run: node tools/avatar/refine-face.mjs   (rewrites assets/animation/avatar-v2.{bin,json})
import {readFileSync, writeFileSync} from 'node:fs';
import {fnv1a} from '../../js/animation/avatar-core.js';

export const SOURCE_FNV1A = 'd63f5a42';   // the asset after tools/avatar/repair-sleeve-weights.mjs
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const FACE = Object.freeze({narrow: .07, edge: .04, neck: 1.53, chin: 1.56, full: 1.61, eyes: 1.67, front: .03, back: -.02});

/* How much a skin vertex at rest (x, y, z) is narrowed (0–1). */
export function faceWeight(x, y, z, f = FACE) {
  return (1 - smooth((Math.abs(x) - f.edge) / .02)) * smooth((y - f.neck) / (f.chin - f.neck)) * (1 - smooth((y - f.full) / (f.eyes - f.full))) * smooth((z - f.back) / (f.front - f.back));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL('../../assets/animation/', import.meta.url), meta = JSON.parse(readFileSync(new URL('avatar-v2.json', dir))), bin = readFileSync(new URL('avatar-v2.bin', dir));
  const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  if (fnv1a(buf) !== SOURCE_FNV1A || meta.fnv1a !== SOURCE_FNV1A) throw new Error(`expected the sleeve-repaired asset ${SOURCE_FNV1A}, found ${fnv1a(buf)}`);
  const g = meta.groups.find(x => x.material === 'skin'), n = g.vertices, P = new Float32Array(buf, g.position, n * 3);
  let moved = 0, most = 0;
  for (let i = 0; i < n; i++) { const w = faceWeight(P[3 * i], P[3 * i + 1], P[3 * i + 2]); if (w <= 0) continue; const dx = P[3 * i] * FACE.narrow * w; P[3 * i] -= dx; moved++; most = Math.max(most, Math.abs(dx)); }
  meta.fnv1a = fnv1a(buf);
  writeFileSync(new URL('avatar-v2.bin', dir), new Uint8Array(buf)); writeFileSync(new URL('avatar-v2.json', dir), JSON.stringify(meta) + '\n');
  console.log(JSON.stringify({from: SOURCE_FNV1A, to: meta.fnv1a, verticesMoved: moved, largestMoveMm: +(most * 1000).toFixed(1)}));
}
