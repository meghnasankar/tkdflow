# Stage A: build a fully clothed TKDflow avatar from the CC0 realistic female base mesh.
# Only the head and neck, hands and feet keep skin; the dobok is a fitted shell grown from the body
# surface, and every other body vertex is deleted before saving. No photograph is used anywhere.
# Run: Blender -b -Y --factory-startup <bundle.blend> --python build_avatar.py -- <out_dir>
import bpy, bmesh, sys, os, json, math
from mathutils.bvhtree import BVHTree
from mathutils import Vector, Matrix
out = sys.argv[sys.argv.index('--') + 1]; os.makedirs(out, exist_ok=True)
SCALE = 1.10                     # 1.64 m base → about 1.80 m, the runtime character's head height
SKIN = (0.22, 0.095, 0.05)       # linear colour of a warm medium-brown skin (Blender preview only; the runtime colour is COLOURS.skin in js/animation/avatar-core.js)
CLOTH = (0.86, 0.85, 0.82); BLACK = (0.012, 0.014, 0.018); HAIR = (0.008, 0.006, 0.007); GOLD = (0.80, 0.58, 0.20)

# Start from an empty scene that only borrows the base mesh data.
src = bpy.data.objects['GEO-body_female_realistic']
for m in src.modifiers:
    if m.type == 'MULTIRES': m.levels = m.render_levels = 1
dg = bpy.context.evaluated_depsgraph_get()
body = bpy.data.meshes.new_from_object(src.evaluated_get(dg)); body.transform(src.matrix_world)
eyes_src = [bpy.data.objects['GEO-body_female_realistic.eye.L'], bpy.data.objects['GEO-body_female_realistic.eye.R']]
xs = [v.co.x for v in body.vertices]; ys = [v.co.y for v in body.vertices]; zs = [v.co.z for v in body.vertices]
shift = Matrix.Translation(Vector((-(min(xs)+max(xs))/2, -(min(ys)+max(ys))/2, -min(zs))))
place = Matrix.Scale(SCALE, 4) @ shift
body.transform(place)
# Copy the eye meshes we need, then remove every bundle object and collection so nothing else is saved.
eye_data = [(e.name, e.data.copy(), e.matrix_world.copy()) for e in eyes_src]
eye_pts = [place @ (e.matrix_world @ Vector(c)) for e in eyes_src for c in e.bound_box]
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
for t in list(bpy.data.texts): bpy.data.texts.remove(t)
scene = bpy.context.scene; coll = scene.collection
def link(name, mesh):
    o = bpy.data.objects.new(name, mesh); coll.objects.link(o); return o
def mat(name, colour, rough=.7, sheen=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*colour, 1); b.inputs['Roughness'].default_value = rough
    if 'Subsurface Weight' in b.inputs and name == 'skin': b.inputs['Subsurface Weight'].default_value = .06; b.inputs['Subsurface Radius'].default_value = (.9, .45, .3)
    return m
def hair_strands(m):
    # Fine strand grooves for review renders (a wave texture in bump); the web export uses plain colour.
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; tc = nt.nodes.new('ShaderNodeTexCoord'); w = nt.nodes.new('ShaderNodeTexWave')
    w.wave_type = 'BANDS'; w.bands_direction = 'Z'; w.inputs['Scale'].default_value = 140; w.inputs['Distortion'].default_value = 6
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .25
    nt.links.new(tc.outputs['Object'], w.inputs['Vector']); nt.links.new(w.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = 0.0
M = {k: mat(k, c, r) for k, c, r in [('tail_sankar', BLACK, .6), ('tail_emblem', BLACK, .6), ('skin', SKIN, .55), ('cloth', CLOTH, .85), ('black', BLACK, .6), ('hair', HAIR, .74), ('gold', GOLD, .4),
                                      ('sclera', (.56, .51, .46), .35), ('pupil', (.004, .003, .003), .2), ('iris', (.075, .038, .022), .3), ('brow', (.02, .014, .012), .8), ('lip', (.30, .14, .11), .5)]}

hair_strands(M['hair'])
# Landmarks measured on the scaled body.
top = max(v.co.z for v in body.vertices)
facing = -1.0                                 # base faces -Y (checked below from the eyes)
eye_c = sum(eye_pts, Vector()) / len(eye_pts)
neck_cut = top - .265 * SCALE                 # collar line
ankle_cut = .095 * SCALE
hip_hem = top - .86 * SCALE                   # jacket hem, about the top of the thigh
tips_z = min(v.co.z for v in body.vertices if abs(v.co.x) >= .28 * SCALE and v.co.z > .3)
wrist_z = tips_z + .195 * SCALE

def part(keep):
    bm = bmesh.new(); bm.from_mesh(body)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context='VERTS')
    m = bpy.data.meshes.new('tmp'); bm.to_mesh(m); bm.free(); return m
is_hand = lambda c: abs(c.x) >= .17 * SCALE and c.z <= wrist_z + .045 and c.z > .3   # reaches 1 cm inside the cuff (the cuff is cut 3.5 cm above the wrist)
is_head = lambda c: c.z >= neck_cut - .05 and abs(c.x) < .12 * SCALE   # extends under the collar
is_foot = lambda c: c.z <= ankle_cut + .03                            # tucks into the trouser hem
neck_axis_y = slab_y = None
def neck_ok(c):
    # Below the collar line keep only the neck itself, so skin can't show through the jacket's shoulder slope.
    return c.z >= neck_cut + .02 or math.hypot(c.x, c.y - neck_y) < .072 * SCALE
neck_y = sum(v.co.y for v in body.vertices if abs(v.co.z - neck_cut) < .01 and abs(v.co.x) < .06 * SCALE) / max(1, sum(1 for v in body.vertices if abs(v.co.z - neck_cut) < .01 and abs(v.co.x) < .06 * SCALE))
skin = link('skin', part(lambda c: (is_head(c) and neck_ok(c)) or is_hand(c) or is_foot(c)))
# Drop thigh slivers that the hand test can catch beside the hands (connected islands that never reach the hands).
bm = bmesh.new(); bm.from_mesh(skin.data); seen = set(); drop = []
for v in bm.verts:
    if v in seen: continue
    island, stack = [], [v]; seen.add(v)
    while stack:
        u = stack.pop(); island.append(u)
        for e in u.link_edges:
            w = e.other_vert(u)
            if w not in seen: seen.add(w); stack.append(w)
    if max(u.co.z for u in island) < neck_cut and min(u.co.z for u in island) > ankle_cut and max(abs(u.co.x) for u in island) < .28 * SCALE: drop += island
bmesh.ops.delete(bm, geom=drop, context='VERTS'); bm.to_mesh(skin.data); bm.free()
skin.data.materials.append(M['skin'])

# No painted lip patch: the modelled lips read through shape and shading alone.
front_y = min(v.co.y for v in skin.data.vertices if v.co.z > eye_c.z - .12 and v.co.z < eye_c.z)

# The dobok: grow a shell from the body surface (torso and arms for the jacket, hips and legs for the trousers).
def largest_islands(bm, keep_if):
    seen, drop = set(), []
    for v in bm.verts:
        if v in seen: continue
        island, stack = [], [v]; seen.add(v)
        while stack:
            u = stack.pop(); island.append(u)
            for e in u.link_edges:
                w = e.other_vert(u)
                if w not in seen: seen.add(w); stack.append(w)
        if not keep_if(island): drop += island
    bmesh.ops.delete(bm, geom=drop, context='VERTS')
def cut(bm, co, no, only=None):
    # Remove everything on the side the normal points to, leaving a clean straight edge.
    # `only` limits the cut to faces whose centre passes the test (for example one sleeve).
    if only:
        faces = [f for f in bm.faces if only(f.calc_center_median())]
        geom = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=Vector(no).normalized(), clear_outer=False)
        n = Vector(no).normalized(); co = Vector(co)
        dead = [f for f in bm.faces if only(f.calc_center_median()) and (f.calc_center_median() - co).dot(n) > 1e-6]
        bmesh.ops.delete(bm, geom=dead, context='FACES'); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        return
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=Vector(no).normalized(), clear_outer=True)
def shell(name, keep, push, smooth_iter, cuts=(), islands=None):
    o = link(name, part(keep)); o.data.materials.append(M['cloth'])
    bm = bmesh.new(); bm.from_mesh(o.data)
    if islands: largest_islands(bm, islands)
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * (push(v.co) if callable(push) else push)
    for _ in range(smooth_iter): bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    for c_ in cuts: cut(bm, *c_)
    bm.normal_update(); bm.to_mesh(o.data); bm.free()
    return o   # single layer, drawn double-sided: an inner shell could poke through when the cloth bends
def jacket_ease(c):
    # Modest ease on the body; sleeves narrow to a fitted cuff over the last 12 cm above the wrist.
    if abs(c.x) > .19 * SCALE and c.z < wrist_z + .12 * SCALE: return .017 + .007 * max(0.0, min(1.0, (c.z - wrist_z) / (.12 * SCALE)))   # a fitted cuff with room for the wrist to bend
    return .024
jacket = shell('jacket', lambda c: c.z < neck_cut + .03 and c.z >= hip_hem - .03 and not (abs(c.x) >= .17 * SCALE and c.z <= wrist_z),
               jacket_ease, 6, cuts=[((0, 0, neck_cut + .01), (0, -.45, 1)),            # neck opening, lower at the front
                              ((0, 0, hip_hem), (0, 0, -1))]                     # straight jacket hem
               + [((sx * .345 * SCALE, 0, wrist_z + .035), (sx * .40, 0, -1), lambda c, sx=sx: sx * c.x > .24 * SCALE and c.z < wrist_z + .15) for sx in (-1, 1)],   # clean cuffs across each forearm, just above the wrist
               islands=lambda isl: len(isl) > 200)
trousers = shell('trousers', lambda c: c.z < hip_hem + .12 * SCALE and c.z > ankle_cut - .02 and abs(c.x) < .26 * SCALE, .034, 8,
                 cuts=[((0, 0, ankle_cut + .012), (0, 0, -1))],                 # trouser hems just above the ankle
                 islands=lambda isl: max(abs(u.co.x) for u in isl) < .25 * SCALE and len(isl) > 500)
# Wider trouser legs toward the hem, like a dobok.
for v in trousers.data.vertices:
    if v.co.z < .55 * SCALE:
        cx = math.copysign(.10 * SCALE, v.co.x); k = (.55 * SCALE - v.co.z) / (.55 * SCALE) * .05   # straight legs, not flared
        v.co.x += (v.co.x - cx) * k; v.co.y += v.co.y * k
def hull2d(pts):
    pts = sorted(set(pts))
    if len(pts) < 3: return pts
    def half(seq):
        h = []
        for p in seq:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (p[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (p[0] - h[-2][0]) <= 0: h.pop()
            h.append(p)
        return h
    lo = half(pts); up = half(reversed(pts)); return lo[:-1] + up[:-1]
def ray_hull(cx, cy, dx, dy, hull):
    best = None
    for i in range(len(hull)):
        (x1, y1), (x2, y2) = hull[i], hull[(i + 1) % len(hull)]
        ex, ey = x2 - x1, y2 - y1; den = dx * ey - dy * ex
        if abs(den) < 1e-12: continue
        t = ((x1 - cx) * ey - (y1 - cy) * ex) / den; u = ((x1 - cx) * dy - (y1 - cy) * dx) / den
        if t > 0 and -1e-9 <= u <= 1 + 1e-9: best = t if best is None else min(best, t)
    return best
def drape(o):
    # A dobok jacket hangs as relaxed straight fabric: fill every concavity of each horizontal slice
    # (no moulded cups or under-bust curve), then let the front fall straight from the chest to the hem.
    vs = o.data.vertices; armpit = top - .40 * SCALE
    torso = [v for v in vs if abs(v.co.x) < .16 * SCALE and hip_hem - .05 < v.co.z < armpit]
    bins = {}
    for v in torso: bins.setdefault(round(v.co.z / .02), []).append(v)
    for group in bins.values():
        if len(group) < 6: continue
        hull = hull2d([(round(v.co.x, 5), round(v.co.y, 5)) for v in group]); cx = sum(v.co.x for v in group) / len(group); cy = sum(v.co.y for v in group) / len(group)
        for v in group:
            dx, dy = v.co.x - cx, v.co.y - cy; r = math.hypot(dx, dy)
            if r < 1e-6: continue
            t = ray_hull(cx, cy, dx / r, dy / r, hull)
            if t and t > r: v.co.x, v.co.y = cx + dx / r * t, cy + dy / r * t
    front = [v for v in torso if v.co.y < 0 and armpit - .25 * SCALE < v.co.z]
    apex = min(front, key=lambda v: v.co.y); bz = apex.co.z
    band = [v for v in torso if abs(v.co.z - bz) < .015 and v.co.y < 0]
    for v in torso:
        if v.co.y < 0 and v.co.z < bz:
            near = [u.co.y for u in band if abs(u.co.x - v.co.x) < .03]
            if near: v.co.y = min(v.co.y, min(near) + (bz - v.co.z) * .07)
    bm = bmesh.new(); bm.from_mesh(o.data); tv = set(v.index for v in torso); bm.verts.ensure_lookup_table()
    for _ in range(3): bmesh.ops.smooth_vert(bm, verts=[bm.verts[i] for i in tv], factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=False)
    bm.to_mesh(o.data); bm.free()
drape(jacket)
def cinch(o, waist_z):
    # The belt gathers the jacket at the waist: pull fabric in to an ellipse just inside the belt, blending over ±7 cm.
    sl = [v.co for v in body.vertices if abs(v.co.z - waist_z) < .01 and abs(v.co.x) < .2 * SCALE]
    ax = max(abs(c.x) for c in sl) + .022; ay = max(abs(c.y) for c in sl) + .022
    for v in o.data.vertices:
        w = 1 - min(1.0, abs(v.co.z - waist_z) / (.07 * SCALE))
        if w <= 0 or abs(v.co.x) > ax + .03: continue
        k = math.hypot(v.co.x / ax, v.co.y / ay)
        if k > 1: v.co.x -= v.co.x * (1 - 1 / k) * w; v.co.y -= v.co.y * (1 - 1 / k) * w
    return ax, ay
belt_ax, belt_ay = cinch(jacket, hip_hem + .13 * SCALE - .022)
# Black collar (black-belt dobok): a flat black V cut into the jacket's own surface. Same vertices and skinning as
# the jacket, so it can never separate from it. The V's four edges are cut as straight lines (protected from
# decimation below); no back band or tabs.
dgj = bpy.context.evaluated_depsgraph_get(); jm = jacket.evaluated_get(dgj).to_mesh()
bvh = BVHTree.FromPolygons([v.co.copy() for v in jm.vertices], [list(p.vertices) for p in jm.polygons]); jacket.evaluated_get(dgj).to_mesh_clear()
neck_top = neck_cut + .01
V_OUT_TIP, V_IN_TIP = neck_top - .235, neck_top - .175              # bottom of the outer and inner edges of the V
V_OUT_X, V_IN_X = .087, .050                                         # half-width of the V at the neckline
K_OUT, K_IN = (neck_top - V_OUT_TIP) / V_OUT_X, (neck_top - V_IN_TIP) / V_IN_X
front_zone = lambda c: c.y < 0 and abs(c.x) < .16 and c.z > V_OUT_TIP - .03
def split(bm, co, no, only):
    faces = [f for f in bm.faces if only(f.calc_center_median())]
    geom = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(co), plane_no=Vector(no).normalized(), clear_outer=False, clear_inner=False)
bm = bmesh.new(); bm.from_mesh(jacket.data)
for sx in (-1, 1):
    for tip, k in ((V_OUT_TIP, K_OUT), (V_IN_TIP, K_IN)):
        # The line z = tip + k|x| on this side: a plane with normal (-sx k, 0, 1) through (0, 0, tip).
        split(bm, (0, 0, tip), (-sx * k, 0, 1), lambda c, sx=sx: front_zone(c) and sx * c.x >= -.01)
collar_line = lambda c: any(abs(c.z - (tip + k * abs(c.x))) < .0015 for tip, k in ((V_OUT_TIP, K_OUT), (V_IN_TIP, K_IN)))
inside = lambda c, tip, k: c.z > tip + k * abs(c.x)
jacket.data.materials.append(M['black'])
painted = 0
for f in bm.faces:
    c = f.calc_center_median()
    if front_zone(c) and inside(c, V_OUT_TIP, K_OUT) and not inside(c, V_IN_TIP, K_IN): f.material_index = len(jacket.data.materials) - 1; painted += 1
bm.to_mesh(jacket.data); bm.free()
COLLAR_EDGE = collar_line
print('COLLAR_FACES', painted)
# Belt: a flattened band at the waist, a knot and two tails; "Sankar" in gold on one tail.
waist_z = hip_hem + .13 * SCALE
wv = [v.co for v in jacket.data.vertices if abs(v.co.z - waist_z) < .01 and abs(v.co.x) < .2 * SCALE]
# The band is laid on the cinched jacket itself: rays from the waist's centre out to the cloth, 6 mm proud of it,
# so it touches the belly in front and the seat behind instead of floating on an ellipse.
cy = sum(v.co.y for v in jacket.data.vertices if abs(v.co.z - waist_z) < .012) / max(1, sum(1 for v in jacket.data.vertices if abs(v.co.z - waist_z) < .012))
# Only the jacket's torso faces (the hanging sleeves sit beside the hips at this height).
jm2 = jacket.data; torso_faces = [list(p_.vertices) for p_ in jm2.polygons if abs(p_.center.x) < .20 * SCALE]
bvh_torso = BVHTree.FromPolygons([v.co.copy() for v in jm2.vertices], torso_faces)
def waist_hit(ang, z):
    d = Vector((math.sin(ang), math.cos(ang), 0)); r = bvh_torso.ray_cast(Vector((0, cy, z)) + d * .6, -d)
    return (r[0] + d * .006) if r[0] else None
bm = bmesh.new(); rows = []
for k in range(64):
    ang = 2 * math.pi * k / 64; band_hi, band_lo = waist_hit(ang, waist_z), waist_hit(ang, waist_z - .045 * SCALE)
    if band_hi and band_lo: rows.append((bm.verts.new(band_hi), bm.verts.new(band_lo)))
for (a1, b1), (a2, b2) in zip(rows, rows[1:] + rows[:1]): bm.faces.new((a1, a2, b2, b1))
belt_m = bpy.data.meshes.new('belt'); bm.to_mesh(belt_m); bm.free()
belt = link('belt', belt_m); belt.data.materials.append(M['black']); sol = belt.modifiers.new('t', 'SOLIDIFY'); sol.thickness = .006
front = waist_hit(math.pi, waist_z - .022 * SCALE); fy = front.y - .002   # the band's front surface at the knot
def box(name, size, loc, rot=0, material='black', front=None):
    # `front`: a material for the front face (facing -Y), UV-mapped across its width and down its length, top at v = 1.
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        is_front = front and f.normal.y < -.9; f.material_index = 1 if is_front else 0
        for loop in f.loops: loop[uv].uv = ((loop.vert.co.x / size[0] + .5, loop.vert.co.z / size[2] + .5) if is_front else (0, 0))
    m = bpy.data.meshes.new(name); bm.to_mesh(m); bm.free(); o = link(name, m)
    o.location = loc; o.rotation_euler = (0, rot, 0); o.data.materials.append(M[material])
    if front: o.data.materials.append(M[front])
    return o
box('belt_knot', (.06, .026, .05), (0, fy - .013, waist_z - .022 * SCALE))
# The approved belt details from the current character: "Sankar" on the performer's left tail, the emblem and
# two gold bars on the right tail. The runtime paints them with the existing canvas belt texture; here the front
# faces only carry UVs and their own materials.
tails = [box('belt_tail_l', (.04, .012, .26), (.03, fy - .012, waist_z - .17), -.10, front='tail_sankar'),
         box('belt_tail_r', (.04, .012, .26), (-.035, fy - .012, waist_z - .17), .12, front='tail_emblem')]

# Eyes from the base, recoloured: sclera with a dark brown iris on the front-facing cap.
for name, m, mw in eye_data:
    m.transform(place @ mw); o = link('eye_' + name[-1], m)
    o.data.materials.append(M['sclera']); o.data.materials.append(M['iris']); o.data.materials.append(M['pupil'])
    cen = sum((v.co for v in m.vertices), Vector()) / len(m.vertices)
    r = max((v.co - cen).length for v in m.vertices)
    for v in m.vertices: v.co = cen + (v.co - cen) * .97 + Vector((0, .0030, -.0010))   # deeper and a touch lower, so the upper lid covers the top of the iris
    cen = cen + Vector((0, .0030, -.0010)); r *= .97
    for p in m.polygons:
        f = (p.center - cen).y / r
        if f < -.93: p.material_index = 2
        elif f < -.70: p.material_index = 1
# Eyebrows: short curved tubes above each eye.
for sx in (-1, 1):
    ex = [v for v in skin.data.vertices]
    cu = bpy.data.curves.new('brow', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = .0019 * SCALE; cu.bevel_resolution = 2
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(2)
    base_x = sx * .034 * SCALE; base_z = eye_c.z + .026 * SCALE
    for i, (dx, dz) in enumerate([(-.016, -.003), (0, .0015), (.018, -.002)]):
        x = base_x + sx * dx * SCALE; z = base_z + dz * SCALE
        near = min((v for v in skin.data.vertices if abs(v.co.z - z) < .01 and v.co.y < 0), key=lambda v: abs(v.co.x - x), default=None)
        y = near.co.y - .0006 if near else front_y + .02
        bp = sp.bezier_points[i]; bp.co = (x, y, z); bp.handle_left_type = bp.handle_right_type = 'AUTO'
    b = bpy.data.objects.new('brow', cu); coll.objects.link(b); b.data.materials.append(M['brow'])

# Hair: a cap over the scalp grown from the head surface, and a tapered ponytail with a black tie.
head_v = [v.co for v in skin.data.vertices if v.co.z > neck_cut + .05]
hcx = sum((c.x for c in head_v)) / len(head_v); hcy = sum((c.y for c in head_v)) / len(head_v)
def scalp(c):
    if c.z < neck_cut + .05: return False
    front = (c.y - hcy) < -.03 * SCALE
    if front: return c.z > eye_c.z + .060 * SCALE
    if abs(c.x - hcx) > .062 * SCALE and c.z < eye_c.z + .035 * SCALE: return False   # leave the ears clear
    return c.z > eye_c.z - .02 * SCALE - max(0, (c.y - hcy)) * 1.4
cap = link('hair_cap', part(lambda c: c.z > neck_cut + .02 and abs(c.x) < .12 * SCALE)); cap.data.materials.append(M['hair'])
bm = bmesh.new(); bm.from_mesh(cap.data)
ez = eye_c.z
# Cut the scalp area first on the head surface itself, so the hairline sits on the skin.
# A natural rounded hairline: lowest at the centre with a slight soft peak, rising toward the temples.
def hairline_z(x):
    u = (x - hcx) / (.068 * SCALE); au = abs(u)
    side = max(0.0, min(1.0, (au - .70) / .30)); side = side * side * (3 - 2 * side)
    # Rounded across the forehead, then sweeping down at the sides toward the top of the ear.
    return ez + (.047 + .013 * min(au, 1) ** 2 - .004 * math.exp(-(u / .22) ** 2) - .042 * side) * SCALE
front_cut = [f for f in bm.faces if f.calc_center_median().y < hcy - .012 * SCALE and any(v.co.z < hairline_z(v.co.x) for v in f.verts)]
bmesh.ops.delete(bm, geom=front_cut, context='FACES')
# Pulled-back hair passes around the ears, not over them: clear a box fitted to each ear (found where it sticks out most).
for sx in (-1, 1):
    band = [v.co for v in skin.data.vertices if sx * (v.co.x - hcx) > 0 and ez - .045 * SCALE < v.co.z < ez + .02 * SCALE and v.co.z > neck_cut]
    ear = max(band, key=lambda c: sx * (c.x - hcx))
    box = [f for f in bm.faces if sx * (f.calc_center_median().x - hcx) > .058 * SCALE and abs(f.calc_center_median().y - ear.y) < .030 * SCALE
           and ez - .050 * SCALE < f.calc_center_median().z < ez + .010 * SCALE]
    bmesh.ops.delete(bm, geom=box, context='FACES')
    # In front of the ear the hair stops near ear-top level (a short sideburn), not down the cheek.
    cheek = [f for f in bm.faces if sx * (f.calc_center_median().x - hcx) > .040 * SCALE and f.calc_center_median().y < ear.y - .018 * SCALE
             and f.calc_center_median().z < ez + .006 * SCALE]
    bmesh.ops.delete(bm, geom=cheek, context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
cut(bm, (0, hcy + .010 * SCALE, ez - .028 * SCALE), (0, -.95, -1))    # in front of the ears, low enough that hair reaches the top of the ear
cut(bm, (0, 0, neck_cut + .065 * SCALE), (0, 0, -1))                  # nape
for sx in (-1, 1): cut(bm, (hcx + sx * .074 * SCALE, 0, 0), (sx, 0, -.25))   # keep the ears clear
# Relax the hairline edge into a smooth curve (no stair steps from the mesh faces).
for _ in range(8):
    moves = {}
    for v in bm.verts:
        if not v.is_boundary: continue
        nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
        if len(nb) == 2: moves[v] = (nb[0].co + nb[1].co) / 2 * .6 + v.co * .4
    for v, c in moves.items(): v.co = c
# Distance from the hairline across the scalp (shortest path along edges).
import heapq
bm.normal_update(); dist = {v: (0.0 if v.is_boundary else 1e9) for v in bm.verts}
heap = [(0.0, i, v) for i, v in enumerate(bm.verts) if v.is_boundary]; heapq.heapify(heap)
while heap:
    d, _, v = heapq.heappop(heap)
    if d > dist[v]: continue
    for e in v.link_edges:
        w = e.other_vert(v); nd = d + e.calc_length()
        if nd < dist[w]: dist[w] = nd; heapq.heappush(heap, (nd, id(w), w))
# Hair grows out from the scalp: almost nothing at the hairline, fuller toward the crown and back where it gathers into the tie.
for v in bm.verts:
    taper = min(1.0, dist[v] / (.022 * SCALE)); taper = taper * taper * (3 - 2 * taper)
    v.co += v.normal * ((.0030 * SCALE + max(0, v.co.y - hcy + .02) * .10 + max(0, v.co.z - ez - .06 * SCALE) * .09) * taper + .0006)
for _ in range(3): bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.normal_update(); bm.to_mesh(cap.data); bm.free()
back_y = max(c.y for c in head_v); tie_z = top - .055 * SCALE
cu = bpy.data.curves.new('pony', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = .026 * SCALE; cu.bevel_resolution = 4; cu.use_fill_caps = True
sp = cu.splines.new('BEZIER'); pts = [(0, back_y - .01, tie_z), (0, back_y + .045, tie_z - .03), (.012, back_y + .06, tie_z - .17), (.02, back_y + .04, tie_z - .32)]
sp.bezier_points.add(len(pts) - 1)
for bp, p, r in zip(sp.bezier_points, pts, [1.15, 1.0, .7, .25]):
    bp.co = p; bp.radius = r; bp.handle_left_type = bp.handle_right_type = 'AUTO'
pony = bpy.data.objects.new('ponytail', cu); coll.objects.link(pony); pony.data.materials.append(M['hair'])
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=.028 * SCALE, radius2=.028 * SCALE, depth=.014)
tie_m = bpy.data.meshes.new('tie'); bm.to_mesh(tie_m); bm.free(); tie = link('hair_tie', tie_m); tie.data.materials.append(M['black'])
tie.location = (0, back_y + .012, tie_z - .004); tie.rotation_euler = (math.pi / 2 - .5, 0, 0)

# Reduce to a web budget (the review renders and the size report use these reduced meshes).
sk = bpy.data.objects['skin']; protect = sk.vertex_groups.new(name='not_hands')
for v in sk.data.vertices:
    if abs(v.co.x) >= .25 * SCALE and .3 < v.co.z <= wrist_z + .03: continue        # hands keep their detail
    protect.add([v.index], .35 if v.co.z > neck_cut - .06 else 1.0, 'REPLACE')     # the face keeps most of its shape
# Keep cloth openings (cuffs, hems, neckline) as cut: decimation may only collapse interior vertices.
for name in ('jacket', 'trousers'):
    o = bpy.data.objects[name]; bm = bmesh.new(); bm.from_mesh(o.data)
    edge = {v.index for v in bm.verts if v.is_boundary}
    ring = {e.other_vert(v).index for v in bm.verts if v.index in edge for e in v.link_edges}
    if name == 'jacket': edge |= {v.index for v in bm.verts if front_zone(v.co) and COLLAR_EDGE(v.co)}   # keep the V's straight edges
    bm.free(); g = o.vertex_groups.new(name='interior')
    g.add([v.index for v in o.data.vertices if v.index not in edge and v.index not in ring], 1.0, 'REPLACE')
for name, ratio in [('skin', .30), ('jacket', .30), ('trousers', .45), ('hair_cap', .30)]:
    d = bpy.data.objects[name].modifiers.new('budget', 'DECIMATE'); d.ratio = ratio
    if name == 'skin': d.vertex_group = 'not_hands'; d.vertex_group_factor = 1.0   # hands keep their finger detail
    if name in ('jacket', 'trousers'): d.vertex_group = 'interior'; d.vertex_group_factor = 1.0
for o in coll.objects:
    if o.type == 'MESH':
        for p in o.data.polygons: p.use_smooth = True
# Joint landmarks for the rig, measured on the scaled body (Blender axes: up Z, the performer faces -Y, +X is her left).
V = [v.co.copy() for v in body.vertices]
def centroid(pts):
    pts = list(pts); return sum(pts, Vector()) / len(pts) if pts else None
def slab(filt, z, h=.012): return centroid(c for c in V if filt(c) and abs(c.z - z) < h)
joints = {'top': top, 'eye': list(eye_c)}
hip_z = .51 * top; knee_z = .285 * top; ankle_z = .048 * top
joints['pelvis'] = [0, slab(lambda c: abs(c.x) < .2 * SCALE, hip_z).y, hip_z + .07]
joints['neck'] = [0, slab(lambda c: abs(c.x) < .07 * SCALE, neck_cut + .03).y, neck_cut + .03]
joints['head'] = [0, hcy, eye_c.z - .02]
for side, sx in (('left', 1), ('right', -1)):
    arm = lambda c, sx=sx: sx * c.x > .20 * SCALE and c.z > .3
    sh = Vector((sx * .175 * SCALE, 0, top - .305 * SCALE)); sh.y = slab(lambda c: sx * c.x > .12 * SCALE and sx * c.x < .2 * SCALE, sh.z - .03).y
    wr = slab(arm, wrist_z)
    el = sh + (wr - sh) * .53; e2 = slab(arm, el.z, .015); el = Vector((e2.x, e2.y, el.z)) if e2 else el
    leg = lambda c, sx=sx: sx * c.x > 0 and abs(c.x) < .25 * SCALE
    hp = Vector((sx * .09 * SCALE, joints['pelvis'][1], hip_z))
    kn = slab(leg, knee_z, .015); an = slab(lambda c, sx=sx: sx * c.x > 0, ankle_z, .01)
    toe = min((c for c in V if sx * c.x > 0 and c.z < .05), key=lambda c: c.y)
    joints[side] = {k: list(v) for k, v in dict(shoulder=sh, elbow=el, wrist=wr, hip=hp, knee=kn, ankle=an, toe=Vector((an.x, toe.y + .02, .02))).items()}
    # Fingers: cut the hand just below the palm; each finger and the thumb is then its own connected island.
    def cut_islands(slab_z):
        bmh = bmesh.new(); bmh.from_mesh(body)
        bmesh.ops.delete(bmh, geom=[v for v in bmh.verts if not (sx * v.co.x >= .25 * SCALE and .3 < v.co.z < slab_z)], context='VERTS')
        seen, found = set(), []
        for v in bmh.verts:
            if v in seen: continue
            isl, st = [], [v]; seen.add(v)
            while st:
                u = st.pop(); isl.append(u.co.copy())
                for e in u.link_edges:
                    w = e.other_vert(u)
                    if w not in seen: seen.add(w); st.append(w)
            if len(isl) > 20: found.append(isl)
        bmh.free(); return found
    fingers4 = thumb_isl = None
    for drop_cm in range(8, 19):
        found = cut_islands(wrist_z - drop_cm / 100 * SCALE)
        if thumb_isl is None and len(found) == 2 and min(len(i) for i in found) >= 100: thumb_isl = min(found, key=len)
        if fingers4 is None and len(found) == 4: fingers4 = found
    islands = (fingers4 or []) + ([thumb_isl] if thumb_isl else [])
    wr_v = Vector(wr)
    digits = []
    for isl in islands:
        tip = max(isl, key=lambda c: (c - wr_v).length); top_z = max(c.z for c in isl)
        base = centroid(c for c in isl if c.z > top_z - .006)
        base = base + (base - tip).normalized() * .040          # the knuckle joint sits well above the finger webs
        digits.append((base, tip))
    print('DIGITS', side, len(islands), [len(i) for i in islands])
    # The thumb island was added last; the four fingers run index → pinky from front (-Y) to back.
    chains = {}
    if len(digits) == 5:
        thumb = digits_thumb = (digits[-1] if thumb_isl else None); rest = sorted(digits[:-1], key=lambda d: d[0].y)
        chains['thumb'] = [list(thumb[0]), list(thumb[1])]
        for name, d in zip(('index', 'middle', 'ring', 'pinky'), rest): chains[name] = [list(d[0]), list(d[1])]
    joints[side]['fingers'] = chains
# Report sizes.
def tris(o):
    d = bpy.context.evaluated_depsgraph_get(); m = o.evaluated_get(d).to_mesh(); n = sum(len(p.vertices) - 2 for p in m.polygons); o.evaluated_get(d).to_mesh_clear(); return n
report = {'joints': joints, 'scale': SCALE, 'head_top_m': round(top, 3), 'eye_centre': [round(v, 3) for v in eye_c], 'parts': {o.name: tris(o) for o in coll.objects if o.type in ('MESH', 'CURVE', 'FONT')}}
report['total_tris'] = sum(report['parts'].values())
json.dump(report, open(os.path.join(out, 'build.json'), 'w'), indent=1)
for m in list(bpy.data.meshes):
    if m.users == 0: bpy.data.meshes.remove(m)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'avatar_stage_a.blend'), copy=True)
print('BUILD_OK', json.dumps(report))
