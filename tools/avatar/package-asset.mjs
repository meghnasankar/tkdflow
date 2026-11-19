// Package the Blender export (avatar.json + avatar.bin from export_web.py) as the site's detailed avatar asset:
// keeps only what the runtime reads, and records the binary's length and FNV-1a checksum so the browser can reject a
// truncated or mismatched file and fall back to the procedural avatar.
// Run: node tools/avatar/package-asset.mjs <export_dir>
import {readFileSync, writeFileSync} from 'node:fs';
import {fnv1a} from '../../js/animation/avatar-core.js';
const dir = process.argv[2]; if (!dir) throw new Error('usage: package-asset.mjs <export_dir>');
const meta = JSON.parse(readFileSync(dir + '/avatar.json', 'utf8')), bin = readFileSync(dir + '/avatar.bin');
const {shapes, knuckles} = meta.handRules;
const out = {
  format: 'tkdflow-avatar-v2',
  source: 'Blender Studio Human Base Meshes v1.4.1 (CC0): head, hands and feet kept and clothed; no photograph. See AVATAR-SOURCE.md.',
  units: meta.units, byteLength: bin.byteLength, fnv1a: fnv1a(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)),
  groups: meta.groups, bones: meta.bones, hands: meta.hands, feet: meta.feet, handRules: {shapes, knuckles}
};
writeFileSync(new URL('../../assets/animation/avatar-v2.bin', import.meta.url), bin);
writeFileSync(new URL('../../assets/animation/avatar-v2.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('packaged', bin.byteLength, 'bytes', out.groups.reduce((s, g) => s + g.triangles, 0), 'triangles', out.bones.length, 'bones');
