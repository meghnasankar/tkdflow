# Export the rigged prototype as a compact binary for a three.js lab (no glTF loader needed).
# Axes are converted to the runtime's: x = the performer's left, y = up, z = forward.
# Run: Blender -b -Y --factory-startup avatar_stage_b.blend --python export_web.py -- out_dir
import bpy, bmesh, sys, os, json, struct, math
from mathutils import Vector, Matrix
out = sys.argv[sys.argv.index('--') + 1]; os.makedirs(out, exist_ok=True)
sc = bpy.context.scene; rig = bpy.data.objects['rig']; arm = rig.data
R = lambda v: (v[0], v[2], -v[1])                     # Blender (x, y, z) → runtime (x, z, -y)
# Rest pose everywhere before reading geometry.
rig.matrix_world = Matrix.Identity(4)
for pb in rig.pose.bones:
    for c in pb.constraints: c.mute = True
    pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
bpy.context.view_layer.update()
bones = [b for b in arm.bones]; index = {b.name: i for i, b in enumerate(bones)}
MAT = {'tail_sankar': 'tail_sankar', 'tail_emblem': 'tail_emblem', 'skin': 'skin', 'lip': 'skin', 'cloth': 'cloth', 'black': 'black', 'hair': 'hair', 'gold': 'gold', 'sclera': 'sclera', 'iris': 'iris', 'pupil': 'pupil', 'brow': 'brow'}
groups = {}                                            # material → (positions, normals, skin idx, skin w, indices)
def add(mat, verts, faces):
    g = groups.setdefault(mat, {'p': [], 'n': [], 'i': [], 'w': [], 'f': []}); base = len(g['p'])
    for p, n, si, sw in verts: g['p'].append(p); g['n'].append(n); g['i'].append(si); g['w'].append(sw)
    for f in faces: g['f'].append(tuple(base + k for k in f))
for o in sc.objects:
    if o.type != 'MESH' or o.name in ('floor',): continue
    me = o.data; me.calc_loop_triangles()
    mw = o.matrix_world if not o.modifiers.get('rig') else Matrix.Identity(4) @ o.matrix_world
    rigid = None if o.modifiers.get('rig') else index.get(o.parent_bone or 'pelvis', 0)
    gname = {g.index: g.name for g in o.vertex_groups}
    nm = mw.to_3x3().inverted().transposed()
    def weights(v):
        if rigid is not None: return (rigid, 0, 0, 0), (1.0, 0, 0, 0)
        ws = sorted(((g.weight, index[gname[g.group]]) for g in v.groups if gname.get(g.group) in index and g.weight > 1e-4), reverse=True)[:4]
        tot = sum(w for w, _ in ws) or 1; ws = [(w / tot, i) for w, i in ws] + [(0.0, 0)] * (4 - len(ws))
        return tuple(i for _, i in ws), tuple(w for w, _ in ws)
    # Split per material; vertices are shared within a material.
    per_mat = {}
    for tri in me.loop_triangles:
        slot = o.material_slots[tri.material_index].material.name if o.material_slots else 'skin'
        per_mat.setdefault(MAT.get(slot.split('.')[0], 'cloth'), []).append(tri)
    uvl = me.uv_layers.active
    for mat, tris in per_mat.items():
        remap, verts, faces, uvs = {}, [], [], []
        textured = mat.startswith('tail_')
        for tri in tris:
            face = []
            for k, vi in enumerate(tri.vertices):
                uv = tuple(round(x, 4) for x in uvl.data[tri.loops[k]].uv) if textured and uvl else None
                key = (vi, tuple(round(x, 3) for x in tri.split_normals[k]) if not me.polygons[tri.polygon_index].use_smooth else None, uv)
                if key not in remap:
                    v = me.vertices[vi]; n = (nm @ (Vector(tri.split_normals[k]) if key[1] else v.normal)).normalized()
                    remap[key] = len(verts); verts.append((R(mw @ v.co), R(n), *weights(v))); uvs.append(uv)
                face.append(remap[key])
            faces.append(face)
        add(mat, verts, faces)
        if textured: groups[mat].setdefault('uv', []).extend(uvs)
# Binary: per group positions f32×3, normals i16×3, skin indices u8×4, skin weights u8×4, indices u16/u32.
blob = bytearray(); meta = {'groups': [], 'bones': []}
def put(fmt, values):
    off = len(blob); blob.extend(struct.pack('<' + fmt * len(values), *[x for v in values for x in (v if isinstance(v, tuple) else (v,))]) if False else b''); return off
for mat, g in groups.items():
    n = len(g['p']); entry = {'material': mat, 'vertices': n, 'triangles': len(g['f'])}
    entry['position'] = len(blob); blob.extend(struct.pack(f'<{3 * n}f', *[c for p in g['p'] for c in p]))
    entry['normal'] = len(blob); blob.extend(struct.pack(f'<{3 * n}h', *[int(max(-1, min(1, c)) * 32767) for q in g['n'] for c in q]))
    if g.get('uv'):
        entry['uv'] = len(blob); blob.extend(struct.pack(f'<{2 * n}f', *[c for q in g['uv'] for c in q]))
    entry['skinIndex'] = len(blob); blob.extend(struct.pack(f'<{4 * n}B', *[c for q in g['i'] for c in q]))
    q8 = []
    for ws in g['w']:
        b = [int(round(w * 255)) for w in ws]; b[0] += 255 - sum(b); q8 += b
    entry['skinWeight'] = len(blob); blob.extend(struct.pack(f'<{4 * n}B', *q8))
    wide = n > 65535; entry['indexType'] = 'u32' if wide else 'u16'
    while len(blob) % 4: blob.append(0)
    entry['index'] = len(blob); blob.extend(struct.pack(f"<{3 * len(g['f'])}{'I' if wide else 'H'}", *[k for f in g['f'] for k in f]))
    while len(blob) % 4: blob.append(0)
    meta['groups'].append(entry)
for b in bones:
    m3 = b.matrix_local.to_3x3(); cols = [Vector(R(m3.col[k])) for k in range(3)]
    q = Matrix((cols[0], cols[1], cols[2])).transposed().to_quaternion()   # the bone's rest orientation in runtime axes
    meta['bones'].append({'name': b.name, 'parent': index[b.parent.name] if b.parent else -1, 'head': [round(x, 5) for x in R(b.head_local)], 'tail': [round(x, 5) for x in R(b.tail_local)], 'q': [round(x, 6) for x in (q.x, q.y, q.z, q.w)]})
# Each hand's palm normal and the across-knuckles direction, measured from the bones (runtime axes).
meta['hands'] = {}
for S, sx in (('L', 1), ('R', -1)):
    B_ = arm.bones; w = B_['hand.' + S].head_local; m = B_['middle1.' + S].head_local; lat = (B_['pinky1.' + S].head_local - B_['index1.' + S].head_local).normalized()
    n = (m - w).cross(lat).normalized()
    if n.x * sx > 0: n = -n
    meta['hands'][S] = {'palm': [round(x, 4) for x in R(n)], 'across': [round(x, 4) for x in R(lat)]}
# Each foot in the rest pose, measured from the skin: heading of heel → toes, and how far the sole sits below the ankle joint.
sk = bpy.data.objects['skin']; skg = {g.index: g.name for g in sk.vertex_groups}; meta['feet'] = {}
for S in ('L', 'R'):
    pts = [Vector(R(sk.matrix_world @ v.co)) for v in sk.data.vertices if sum(g.weight for g in v.groups if skg[g.group] == 'foot.' + S) > .6]
    ankle = Vector(R(arm.bones['foot.' + S].head_local))
    toe = max(pts, key=lambda c: c.z); heel = min(pts, key=lambda c: c.z)
    # Rest tilt of the sole: lowest point under the heel third vs under the toe third (positive = toes lower).
    span = toe.z - heel.z; heel_low = min(c.y for c in pts if c.z < heel.z + span / 3); ball_low = min(c.y for c in pts if c.z > toe.z - span / 3)
    drop = math.atan2(heel_low - ball_low, span * 2 / 3); th = -drop
    # The sole depth after the runtime levels the foot (rotation by -drop about the ankle's x axis).
    level_low = min(ankle.y + (c.y - ankle.y) * math.cos(th) - (c.z - ankle.z) * math.sin(th) for c in pts)
    meta['feet'][S] = {'restHeadingDeg': round(math.degrees(math.atan2(toe.x - heel.x, toe.z - heel.z)), 2), 'soleBelowAnkle': round(ankle.y - level_low, 4),
                       'restToeDropDeg': round(math.degrees(drop), 2)}
print('FEET', meta['feet'])
meta['units'] = 'metres, runtime axes (x left, y up, z forward)'
meta['handRules'] = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hand_rules.json')))
meta['source'] = 'Blender Studio Human Base Meshes v1.4.1 (CC0), cropped and clothed; no photograph'
open(os.path.join(out, 'avatar.bin'), 'wb').write(blob)
json.dump(meta, open(os.path.join(out, 'avatar.json'), 'w'), indent=1)
print('EXPORT_OK', len(blob), 'bytes', sum(g['triangles'] for g in meta['groups']), 'triangles', [(g['material'], g['vertices']) for g in meta['groups']])
