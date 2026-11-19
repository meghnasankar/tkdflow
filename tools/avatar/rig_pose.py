# Stage B: rig the stage A avatar (body, arms, five-finger hands, legs, feet) and pose it with real
# lesson joint positions exported from the frozen repo's own motion code. Renders review stills.
# Run: Blender -b -Y --factory-startup avatar_stage_a.blend --python rig_pose.py -- build.json poses.json out_dir
import bpy, json, math, os, sys
from mathutils import Vector, Matrix
build, poses_path, out = sys.argv[sys.argv.index('--') + 1:][:3]; os.makedirs(out, exist_ok=True)
J = json.load(open(build))['joints']; POSES = json.load(open(poses_path))
sc = bpy.context.scene; vl = bpy.context.view_layer
V = lambda a: Vector(a)
B = lambda v: Vector((v[0], -v[2], v[1]))          # runtime (x left, y up, z forward) → Blender (x left, -y forward, z up)

# Freeze modifiers and curves into plain meshes so weights apply to exactly what is rendered.
dg = bpy.context.evaluated_depsgraph_get()
for o in list(sc.objects):
    if o.type in ('MESH', 'CURVE', 'FONT'):
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); mw = o.matrix_world.copy()
        mats = [s.material for s in o.material_slots]
        n = bpy.data.objects.new(o.name, me); sc.collection.objects.link(n); n.matrix_world = mw
        if not me.materials: [me.materials.append(m) for m in mats]
        bpy.data.objects.remove(o); n.name = n.name.split('.')[0] if n.name.endswith('.001') else n.name

# ── armature ──
arm = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm); sc.collection.objects.link(rig)
vl.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.edit_bones
def bone(name, head, tail, parent=None, roll_to=None):
    b = eb.new(name); b.head = V(head); b.tail = V(tail)
    if parent: b.parent = eb[parent]
    if roll_to is not None: b.align_roll(V(roll_to))
    return b
pel = V(J['pelvis']); neck = V(J['neck']); head = V(J['head']); top = J['top']
bone('pelvis', (0, pel.y, J['left']['hip'][2]), pel)
bone('chest', pel, neck, 'pelvis')
bone('neck', neck, head, 'chest')
bone('head', head, (0, head.y, top), 'neck')
FINGERS = ('index', 'middle', 'ring', 'pinky')
PALM = {}
def palm_normal(s, sx):
    # Measured from the hand itself: across the knuckles (index → pinky) × along the hand (wrist → middle knuckle).
    wrist, mid = V(s['wrist']), V(s['fingers']['middle'][0]); lat = V(s['fingers']['pinky'][0]) - V(s['fingers']['index'][0])
    n = (mid - wrist).cross(lat).normalized()
    if n.x * sx > 0: n = -n                       # the palm faces the thigh in the rest pose
    return n, lat.normalized()
for side, sx in (('left', 1), ('right', -1)):
    s = J[side]; S = side[0].upper()
    bone('upper.' + S, s['shoulder'], s['elbow'], 'chest')
    # Shoulder helper: rests along the upper arm, turns half as far as the upper arm; the armhole seam rides on it.
    bone('shoulder.' + S, s['shoulder'], V(s['shoulder']) + (V(s['elbow']) - V(s['shoulder'])) * .25, 'chest')
    bone('fore.' + S, s['elbow'], s['wrist'], 'upper.' + S)
    # Elbow helper: rests along the forearm, turns half as far as the forearm (see below), and carries the sleeve
    # around the joint so a deeply bent elbow keeps its volume instead of collapsing into fins.
    bone('elbow.' + S, s['elbow'], V(s['elbow']) + (V(s['wrist']) - V(s['elbow'])) * .25, 'upper.' + S); eb['elbow.' + S].use_connect = True
    mid = V(s['fingers']['middle'][0]); pn, lat = palm_normal(s, sx); PALM[S] = (pn, lat); print('PALM', S, [round(x, 2) for x in pn])
    bone('hand.' + S, s['wrist'], mid, 'fore.' + S, roll_to=pn)
    for f in FINGERS:
        base, tip = map(V, s['fingers'][f]); a = base + (tip - base) * .52; b2 = base + (tip - base) * .80   # phalanx proportions about 52 / 28 / 20 %
        bone(f'{f}1.{S}', base, a, 'hand.' + S, roll_to=pn); bone(f'{f}2.{S}', a, b2, f'{f}1.{S}', roll_to=pn); bone(f'{f}3.{S}', b2, tip, f'{f}2.{S}', roll_to=pn)
    tb, tt = map(V, s['fingers']['thumb']); tm = tb + (tt - tb) * .5
    ta = (pn * .5 + lat).normalized()               # the thumb folds across the palm toward the little finger
    bone('thumb0.' + S, s['wrist'], tb, 'hand.' + S, roll_to=ta)
    bone('thumb1.' + S, tb, tm, 'thumb0.' + S, roll_to=ta); bone('thumb2.' + S, tm, tt, 'thumb1.' + S, roll_to=ta)
    bone('thigh.' + S, s['hip'], s['knee'], 'pelvis'); bone('shin.' + S, s['knee'], s['ankle'], 'thigh.' + S)
    bone('foot.' + S, s['ankle'], s['toe'], 'shin.' + S, roll_to=(0, 0, 1))
bpy.ops.object.mode_set(mode='OBJECT')
REST = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in arm.bones}

# ── weights: distance to bone segments, limited to the bones a region may follow ──
smooth = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
def seg_dist(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length
def chain_blend(c, chain):
    # Along a bone chain (root first): the closest segment, blended only with its neighbour within the end quarter
    # of the segment, so the skin at the base of a digit never takes weight from its tip bone.
    d = [(seg_dist(c, *REST[n]), i) for i, n in enumerate(chain)]; _, i = min(d); h, t = REST[chain[i]]
    u = max(0.0, min(1.0, (c - h).dot(t - h) / (t - h).length_squared))
    if u < .25 and i > 0: w = .5 + 2 * u; return [(chain[i], w), (chain[i - 1], 1 - w)]
    if u > .75 and i < len(chain) - 1: w = .5 + 2 * (1 - u); return [(chain[i], w), (chain[i + 1], 1 - w)]
    return [(chain[i], 1.0)]
def allowed(obj, c):
    side = 'L' if c.x > 0 else 'R'
    arm_b = [n for n in REST if n.endswith('.' + side) and (n.startswith(('upper', 'fore', 'hand', 'thumb')) or n[:-3].rstrip('123') in FINGERS)]
    leg_b = ['pelvis', 'thigh.' + side, 'shin.' + side, 'foot.' + side]
    if obj in ('skin',):
        if c.z > J['neck'][2] - .08: return ['chest', 'neck', 'head']
        if c.z < .25:
            # Feet: everything below the ankle follows the foot alone, blending into the shin over 4 cm above the ankle
            # (under the trouser hem), so a foot turned away from its knee keeps its own heading instead of twisting
            # its heel with the shin.
            az = REST['foot.' + side][0].z
            return {'blend': smooth((az + .05 - c.z) / .04), 'arm': ['foot.' + side], 'body': ['shin.' + side]}
        # Hands: the palm follows the hand bone and blends into the fingers just past the knuckles; the thumb follows its own chain.
        w0, k0 = REST['hand.' + side]; axis = (k0 - w0); t = (c - w0).dot(axis) / axis.length_squared
        thumb_b = ['thumb1.' + side, 'thumb2.' + side]
        # The thumb itself follows its chain; the pad at its base (round the metacarpal, thumb0) follows thumb0 too,
        # fading out toward the wrist and across the palm over about 2 cm, so a tucked thumb folds that pad smoothly
        # instead of tearing it along a narrow seam.
        tw, tb = REST['thumb0.' + side]; u = (c - tw).dot(tb - tw) / (tb - tw).length_squared
        # Inside the digit the skin follows the thumb chain; the web and the pad around it follow the thumb's root
        # (thumb0), which then blends into the hand, so no skin ever blends a moving digit bone straight into the palm.
        dd = min(seg_dist(c, *REST[n]) for n in thumb_b)
        digit = smooth((.020 - dd) / .008); web = smooth((.034 - dd) / .016)
        pad = smooth((.030 - seg_dist(c, tw, tb)) / .024) * smooth((u - .25) / .45) * smooth((.88 - t) / .10)   # fades out toward the knuckles (no hard edge)
        thumbness = max(web, pad)
        if thumbness > 0:
            chain = ['thumb0.' + side] + thumb_b; arm_w = {}
            for n, w in chain_blend(c, chain): arm_w[n] = arm_w.get(n, 0) + w * digit
            arm_w[chain[0]] = arm_w.get(chain[0], 0) + (1 - digit)
            return {'blend': thumbness, 'arm': chain, 'arm_w': list(arm_w.items()), 'body': ['hand.' + side]}
        fingers = [n for n in arm_b if n[:-2].rstrip('123') in FINGERS]
        # The palm follows the hand; the forearm keeps a share only in a band at the wrist (half at 1.2 cm before the
        # joint, none 1.2 cm past it), so a rolled wrist turns the palm whole instead of twisting the heel of the hand.
        f = .5 * smooth((.12 - t) / .24)
        return {'blend': max(0.0, min(1.0, (t - .80) / .22)), 'arm': fingers, 'body': ['hand.' + side, 'fore.' + side], 'body_w': [('hand.' + side, 1 - f), ('fore.' + side, f)]}
    if obj == 'trousers':
        # Near the centre seam and around the hips the cloth follows the pelvis, blending into each leg,
        # so vertices either side of the seam never belong to opposite legs.
        hip_z = J['left']['hip'][2]; crotch_z = hip_z - .12; legness = max(smooth((abs(c.x) - .006) / .05), smooth((crotch_z - .02 - c.z) / .06)) * smooth((hip_z + .05 - c.z) / .06)   # only the crotch seam and the waist follow the pelvis; the inner legs below it are legs
        return {'blend': legness, 'arm': ['thigh.' + side, 'shin.' + side, 'foot.' + side], 'body': ['pelvis']}
    if obj.startswith('collar'): return ['chest', 'neck']
    if obj == 'jacket':
        # Sleeve or body panel by distance to the arm bones in the rest pose (arms hang close to the sides).
        S = side; sh, el = REST['upper.' + S]
        # The arm's influence starts a quarter of the way down the upper arm, so the shoulder cap and the back
        # of the armpit stay with the chest and only blend toward the sleeve.
        d_arm = min(seg_dist(c, sh + (el - sh) * .25, el), seg_dist(c, *REST['fore.' + S]))
        near_shoulder = (c - sh).length
        # A smooth band (5-11 cm from the arm bones) blends sleeve and body, so the underarm stretches like a gusset.
        armness = max(0.0, min(1.0, (.11 - d_arm) / .06))
        # In the rest pose the forearms hang beside the hips: below the elbow only the sleeve itself (outside the
        # hip line) may follow the arm, never the jacket's own sides.
        elbow_z = J[('left' if S == 'L' else 'right')]['elbow'][2]
        if c.z < elbow_z - .02: armness *= smooth((abs(c.x) - .20) / .03)
        # Sleeve or torso by the cloth's own surface (see SLEEVE below): a sleeve point is about as far from the
        # cuff along the cloth as along the arm; a torso point beside the arm is much further round.
        armness = min(armness, SLEEVE.get(VERT_KEY(c), 1.0))
        return {'blend': armness, 'arm': ['upper.' + S, 'fore.' + S], 'body': ['pelvis', 'chest', 'neck']}
    return None
# ── sleeve membership on the jacket, by geodesic distance from each cuff ──
import heapq
VERT_KEY = lambda c: (round(c.x, 5), round(c.y, 5), round(c.z, 5))
SLEEVE = {}
def sleeve_map():
    jk0 = bpy.data.objects['jacket']; me0 = jk0.data; mw0 = jk0.matrix_world; P = [mw0 @ v.co for v in me0.vertices]
    nbr = [[] for _ in P]
    for e in me0.edges: a_, b_ = e.vertices; d_ = (P[a_] - P[b_]).length; nbr[a_].append((b_, d_)); nbr[b_].append((a_, d_))
    boundary = set()
    for e in me0.edges:
        pass
    import bmesh as _bm
    bmj = _bm.new(); bmj.from_mesh(me0); bnd = {v.index for v in bmj.verts if v.is_boundary}; bmj.free()
    globals()['bnd'] = bnd
    for side, S, sx in (('left', 'L', 1), ('right', 'R', -1)):
        wr = Vector(J[side]['wrist']); el = Vector(J[side]['elbow']); sh = Vector(J[side]['shoulder'])
        cuff = [i for i in bnd if sx * P[i].x > .25 and (P[i] - wr).length < .09]
        dist = {i: 0.0 for i in cuff}; heap = [(0.0, i) for i in cuff]; heapq.heapify(heap)
        while heap:
            d_, i = heapq.heappop(heap)
            if d_ > dist.get(i, 1e9) or d_ > .9: continue
            for j, w in nbr[i]:
                nd = d_ + w
                if nd < dist.get(j, 1e9): dist[j] = nd; heapq.heappush(heap, (nd, j))
        L1 = (el - wr).length
        def axial(c):
            # Arc length from the wrist along forearm then upper arm to the nearest point on that polyline.
            best = None
            for a_, b_, base in ((wr, el, 0.0), (el, sh, L1)):
                ab = b_ - a_; t = max(0.0, min(1.0, (c - a_).dot(ab) / ab.length_squared)); q = a_ + ab * t; d_ = (c - q).length
                if best is None or d_ < best[0]: best = (d_, base + ab.length * t)
            return best[1]
        n_sleeve = 0
        for i, gd in dist.items():
            if sx * P[i].x <= 0: continue
            excess = gd - axial(P[i]); share = 1 - smooth((excess - .05) / .08)
            # Past the shoulder joint the arm line ends: only the cap within 5-10 cm of the joint is sleeve.
            ab = sh - el; t_raw = (P[i] - el).dot(ab) / ab.length_squared
            if t_raw > .9: share *= 1 - smooth(((P[i] - sh).length - .05) / .05)
            # Sleeve cloth wraps the arm closely (about 7 cm from its centre line); torso cloth beside the armpit is further out.
            d_axis = min(seg_dist(P[i], wr, el), seg_dist(P[i], el, sh)); share *= 1 - smooth((d_axis - .078) / .025)
            k = VERT_KEY(P[i]); SLEEVE[k] = min(SLEEVE.get(k, 1.0), share) if k in SLEEVE else share
            n_sleeve += share > .5
        for i in range(len(P)):
            if sx * P[i].x > 0 and i not in dist: SLEEVE[VERT_KEY(P[i])] = 0.0
        print('SLEEVE', S, 'cuff', len(cuff), 'sleeve verts', n_sleeve)
    # An armhole seam: each jacket point is sleeve or body; arm weight blends only within 4.5 cm of the seam
    # (half on the seam), measured along the cloth.
    is_sleeve = [SLEEVE.get(VERT_KEY(c), 0.0) > .5 for c in P]
    # Make each class one connected region: sleeve = reachable from a cuff through sleeve-class points; body =
    # reachable from the chest centre through body-class points. Stray patches inside either are re-assigned by
    # majority of their neighbours, so no false seam (and no chest weight) appears in the middle of a sleeve.
    def flood(seeds, ok):
        seen = set(seeds); stack = list(seeds)
        while stack:
            i = stack.pop()
            for j, _ in nbr[i]:
                if j not in seen and ok(j): seen.add(j); stack.append(j)
        return seen
    cuffs = [i for i in bnd if abs(P[i].x) > .25 and P[i].z < max(J['left']['wrist'][2], J['right']['wrist'][2]) + .08]
    centre = min(range(len(P)), key=lambda i: abs(P[i].x) + abs(P[i].z - 1.2) + (0 if P[i].y < 0 else 1))
    sleeve_main = flood([i for i in cuffs if is_sleeve[i]], lambda j: is_sleeve[j]); body_main = flood([centre], lambda j: not is_sleeve[j])
    for _ in range(6):
        for i in range(len(P)):
            if i in sleeve_main or i in body_main: continue
            votes = [is_sleeve[j] for j, _ in nbr[i]]
            if votes: is_sleeve[i] = sum(votes) * 2 > len(votes)
        sleeve_main = flood([i for i in cuffs if is_sleeve[i]], lambda j: is_sleeve[j]); body_main = flood([centre], lambda j: not is_sleeve[j])
    for i in range(len(P)):
        if i in sleeve_main: is_sleeve[i] = True
        elif i in body_main: is_sleeve[i] = False
    print('CLASSES sleeve', sum(is_sleeve), 'body', len(P) - sum(is_sleeve), 'unreached', len(P) - len(sleeve_main) - len(body_main))
    seam = {i for i in range(len(P)) for j, _ in nbr[i] if is_sleeve[i] != is_sleeve[j]}
    sd = {i: 0.0 for i in seam}; heap = [(0.0, i) for i in seam]; heapq.heapify(heap)
    while heap:
        d_, i = heapq.heappop(heap)
        if d_ > sd.get(i, 1e9) or d_ > .12: continue
        for j, w in nbr[i]:
            nd = d_ + w
            if nd < sd.get(j, 1e9): sd[j] = nd; heapq.heappush(heap, (nd, j))
    for i, c in enumerate(P):
        d_ = sd.get(i, 1.0); f = .5 * smooth(d_ / .06)
        ARM_TARGET[VERT_KEY(c)] = (.5 + f) if is_sleeve[i] else (.5 - f)
    print('SEAM', len(seam))
    odd = [(round(P[i].x, 3), round(P[i].z, 3), round(SLEEVE.get(VERT_KEY(P[i]), -1), 2), round(sd.get(i, 1.0), 3)) for i in range(len(P)) if abs(P[i].x) < .12 and P[i].z > 1.25 and ARM_TARGET[VERT_KEY(P[i])] > .05]
    print('ODD', len(odd), odd[:6])
    stray = [(round(P[i].x, 3), round(P[i].y, 3), round(P[i].z, 3), round(SLEEVE.get(VERT_KEY(P[i]), -1), 2)) for i in range(len(P)) if is_sleeve[i] and abs(P[i].x) < .15]
    print('STRAY', len(stray), stray[:8])
ARM_TARGET = {}
sleeve_map()

for o in [o for o in sc.objects if o.type == 'MESH']:
    for g in list(o.vertex_groups):
        if g.name not in REST: o.vertex_groups.remove(g)   # build-time helper groups (e.g. decimation masks) are not weights
for o in [o for o in sc.objects if o.type == 'MESH']:
    region = o.name.split('.')[0]
    if allowed(region, Vector((0, 0, 1))) is None: continue
    groups = {n: o.vertex_groups.new(name=n) for n in REST}
    def elbow_blend(c, arm_bones):
        # Sleeve cloth blends from upper arm to forearm over 10 cm centred on the elbow, measured along the arm,
        # so a bent elbow folds the sleeve smoothly instead of popping triangles.
        S = arm_bones[0][-1]; sh, el = REST['upper.' + S]; wr = REST['fore.' + S][1]
        up, lo = el - sh, wr - el
        t1 = max(0.0, min(1.0, (c - sh).dot(up) / up.length_squared)); t2 = max(0.0, min(1.0, (c - el).dot(lo) / lo.length_squared))
        d1 = (c - (sh + up * t1)).length; d2 = (c - (el + lo * t2)).length
        s_ = up.length * t1 if d1 <= d2 else up.length + lo.length * t2
        f = smooth((s_ - up.length + .05) / .10); mid = 1 - smooth(abs(s_ - up.length) / .08)
        return [(n, w) for n, w in (('upper.' + S, (1 - f) * (1 - mid)), ('fore.' + S, f * (1 - mid)), ('elbow.' + S, mid)) if w > 1e-4]
    def nearest(c, cand, k=3):
        d = sorted(((seg_dist(c, *REST[n]), n) for n in cand))[:k]; w = [1 / (x + .004) ** 3 for x, _ in d]; tot = sum(w)
        return [(n, wi / tot) for (_, n), wi in zip(d, w)]
    for v in o.data.vertices:
        c = o.matrix_world @ v.co; cand = allowed(region, c)
        if isinstance(cand, dict):
            mix = {}
            arm_part = elbow_blend(c, cand['arm']) if region == 'jacket' else cand['arm_w'] if 'arm_w' in cand else nearest(c, cand['arm'])
            for n, w in arm_part: mix[n] = mix.get(n, 0) + w * cand['blend']
            for n, w in (cand.get('body_w') or nearest(c, cand['body'])): mix[n] = mix.get(n, 0) + w * (1 - cand['blend'])
        else: mix = dict(nearest(c, cand))
        for n, w in mix.items():
            if w > 1e-4: groups[n].add([v.index], w, 'REPLACE')
    m = o.modifiers.new('rig', 'ARMATURE'); m.object = rig
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()   # move with the rig object; the modifier adds only the pose
# Collar ribbons copy the weights of the nearest jacket vertex, so collar and jacket move as one piece.
from mathutils.kdtree import KDTree
jk = bpy.data.objects['jacket']; tree = KDTree(len(jk.data.vertices))
for v in jk.data.vertices: tree.insert(jk.matrix_world @ v.co, v.index)
tree.balance(); jg = {g.index: g.name for g in jk.vertex_groups}
# Smooth the cloth weights first so no edge jumps between unrelated bones (vertex-group smoothing in Blender).
def smooth_weights(o, repeat=6, keep_top=4):
    gname = {g.index: g.name for g in o.vertex_groups}; vg = {g.name: g for g in o.vertex_groups}
    W = [{gname[g.group]: g.weight for g in v.groups} for v in o.data.vertices]
    nbr = [[] for _ in W]
    for e in o.data.edges: a_, b_ = e.vertices; nbr[a_].append(b_); nbr[b_].append(a_)
    for _ in range(repeat):
        new = []
        for i, w in enumerate(W):
            acc = {k: v * 2 for k, v in w.items()}
            for j in nbr[i]:
                for k, v in W[j].items(): acc[k] = acc.get(k, 0) + v
            tot = 2 + len(nbr[i]); acc = {k: v / tot for k, v in acc.items()}
            top = dict(sorted(acc.items(), key=lambda kv: -kv[1])[:keep_top]); t = sum(top.values()) or 1
            new.append({k: v / t for k, v in top.items()})
        W = new
    for i, w in enumerate(W):
        for g in list(o.data.vertices[i].groups): vg[gname[g.group]].remove([i])
        for k, v in w.items():
            if v > 1e-4: vg[k].add([i], v, 'REPLACE')
# The jacket's skirt (belt to hem) drapes over a raised thigh: below the belt it follows the thigh on its side
# progressively, none at the belt and half at the hem, more at the front than behind. A pelvis-only skirt stayed
# put while the thigh rose through it and read as a stiff panel in kicks.
jk_ = bpy.data.objects['jacket']; vg_ = {g.name: g for g in jk_.vertex_groups}; gn_ = {g.index: g.name for g in jk_.vertex_groups}
belt_z = sum((bpy.data.objects['belt'].matrix_world @ v.co).z for v in bpy.data.objects['belt'].data.vertices) / len(bpy.data.objects['belt'].data.vertices)
hem_z = min((jk_.matrix_world @ v.co).z for v in jk_.data.vertices if abs((jk_.matrix_world @ v.co).x) < .16)
front_y = min((jk_.matrix_world @ v.co).y for v in jk_.data.vertices if abs((jk_.matrix_world @ v.co).z - hem_z) < .03)
back_y = max((jk_.matrix_world @ v.co).y for v in jk_.data.vertices if abs((jk_.matrix_world @ v.co).z - hem_z) < .03)
skirt = 0
for v in jk_.data.vertices:
    c = jk_.matrix_world @ v.co
    if c.z >= belt_z or abs(c.x) > .21: continue
    down = smooth((belt_z - c.z) / max(.02, belt_z - hem_z)); front = .45 + .55 * smooth((back_y - c.y) / max(.02, back_y - front_y))
    w = .5 * down * front
    if w < .01: continue
    cur = {gn_[g.group]: g.weight for g in v.groups}; tot = sum(cur.values()) or 1
    sides = [('thigh.L', smooth((c.x + .03) / .06)), ('thigh.R', 1 - smooth((c.x + .03) / .06))]   # split smoothly across the centre seam
    for n in list(cur): vg_[n].add([v.index], cur[n] / tot * (1 - w), 'REPLACE')
    for n, share in sides:
        if share > 1e-3: vg_[n].add([v.index], w * share, 'REPLACE')
    skirt += 1
print('SKIRT', skirt, 'belt', round(belt_z, 3), 'hem', round(hem_z, 3))
smooth_weights(bpy.data.objects['jacket'], repeat=4); smooth_weights(bpy.data.objects['trousers'], repeat=2)
# After smoothing, every jacket point gets exactly its seam-based arm share (relative arm and body weights kept).
gn_ = {g.index: g.name for g in jk_.vertex_groups}; enforced = 0
for v in jk_.data.vertices:
    c = jk_.matrix_world @ v.co; S_ = 'L' if c.x > 0 else 'R'; target = ARM_TARGET.get(VERT_KEY(c), 0.0)
    cur = {gn_[g.group]: g.weight for g in v.groups}
    arm_w = {k: w for k, w in cur.items() if k in ('upper.' + S_, 'fore.' + S_, 'elbow.' + S_)}; body_w = {k: w for k, w in cur.items() if k not in arm_w and k.split('.')[0] not in ('upper', 'fore', 'elbow', 'shoulder')}
    if target > 1e-3 and not arm_w:   # a sleeve point that lost its arm weight in smoothing: give it the nearer arm bone
        arm_w = {min(('upper.' + S_, 'fore.' + S_), key=lambda n: seg_dist(c, *REST[n])): 1.0}
    if not body_w: body_w = {'chest': 1.0}
    ta, tb = sum(arm_w.values()) or 1, sum(body_w.values()) or 1
    for g in list(v.groups): jk_.vertex_groups[gn_[g.group]].remove([v.index])
    # Across the armhole seam the cloth passes through the shoulder helper: body → helper → sleeve, the seam itself
    # fully on the helper (half the upper arm's turn), instead of a linear chest/arm mix that folds into fins.
    helper = 0.0
    if 0 < target < 1 and c.z > J['left' if S_ == 'L' else 'right']['elbow'][2] + .03:   # the armhole part of the seam (above the elbow)
        helper = 1 - abs(2 * target - 1); body_share = max(0.0, 1 - 2 * target); arm_share = max(0.0, 2 * target - 1)
    else: body_share, arm_share = 1 - target, target
    if helper > 1e-4: vg_['shoulder.' + S_].add([v.index], helper, 'REPLACE')
    for k, w in arm_w.items():
        if arm_share * w / ta > 1e-4: vg_[k].add([v.index], arm_share * w / ta, 'REPLACE')
    for k, w in body_w.items():
        if body_share * w / tb > 1e-4: vg_[k].add([v.index], body_share * w / tb, 'REPLACE')
    enforced += 1
print('ARM_SHARE_ENFORCED', enforced)
smooth_weights(jk_, repeat=2)   # a light final pass so neighbouring points never jump between helper, chest and sleeve
# Belt cinch: the jacket and trousers under the belt band follow the torso only (smoothing had spread a little thigh
# weight up into the waist, so a raised knee lifted the cloth from under the band). Leg weight returns over 3 cm below.
band_z = [(o.matrix_world @ v.co).z for o in sc.objects if o.type == 'MESH' and o.name.startswith('belt') for v in o.data.vertices if (o.matrix_world @ v.co).z > .9]
BELT_LO = min(band_z); cinched = 0
LEGS = tuple(f'{b}.{S}' for b in ('thigh', 'shin', 'foot') for S in 'LR')
for o in (bpy.data.objects['jacket'], bpy.data.objects['trousers']):
    names = {g.index: g.name for g in o.vertex_groups}
    for v in o.data.vertices:
        z = (o.matrix_world @ v.co).z; keep = smooth((BELT_LO - z) / .03)
        if keep >= 1: continue
        ws = {names[g.group]: g.weight for g in v.groups if g.weight > 0}; leg = sum(w for n, w in ws.items() if n in LEGS)
        if leg <= 0: continue
        rest_ = sum(w for n, w in ws.items() if n not in LEGS); target_leg = leg * keep
        if rest_ <= 0: rest_, ws = 1.0, {**ws, 'pelvis': 1.0}
        for n, w in ws.items():
            nw = w * keep if n in LEGS else w * (rest_ + leg - target_leg) / rest_
            o.vertex_groups[n].add([v.index], nw, 'REPLACE')
        cinched += 1
print('BELT_CINCH', round(BELT_LO, 3), cinched)
TORSO = ('pelvis', 'chest', 'neck')
# Collar, belt, knot and tails take the jacket's torso weights (never the arms), so they twist with the waist
# and chest exactly as the cloth under them does.
trim = [o for o in sc.objects if o.type == 'MESH' and (o.name.startswith('collar') or o.name.startswith('belt'))]
for o in trim:
    if not o.modifiers.get('rig'): m = o.modifiers.new('rig', 'ARMATURE'); m.object = rig
    mw = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'OBJECT'; o.matrix_world = mw
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    groups_c = {n: o.vertex_groups.new(name=n) for n in REST}
    for v in o.data.vertices:
        acc = {}
        for _, idx, dist in tree.find_n(o.matrix_world @ v.co, 6):
            for g in jk.data.vertices[idx].groups:
                n = jg[g.group]
                if n in TORSO: acc[n] = acc.get(n, 0) + g.weight / (dist + .005)
        if not acc: acc = {'chest': 1.0}
        tot = sum(acc.values())
        for n, w in acc.items(): groups_c[n].add([v.index], w / tot, 'REPLACE')
# Rigid pieces follow one bone: belt → pelvis, hair, eyes and brows → head.
for o in [o for o in sc.objects if o.type == 'MESH' and not o.modifiers.get('rig') and o.name != 'floor']:
    bn = 'head'
    mw = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = bn; o.matrix_world = mw

# ── limbs to the runtime's segment lengths, so lesson joints land exactly (no stretching at elbows or knees) ──
pb = rig.pose.bones
RUNTIME_LEN = {'upper': .30, 'fore': .27, 'thigh': .45, 'shin': .44}
for S in ('L', 'R'):
    for b, L in RUNTIME_LEN.items():
        pb[f'{b}.{S}'].scale = (1, L / arm.bones[f'{b}.{S}'].length, 1)
    for child in ('fore', 'hand', 'shin', 'foot', 'elbow'): arm.bones[f'{child}.{S}'].inherit_scale = 'NONE'
    # Straighten the relaxed wrist so a closed hand lines up with the forearm (knuckles on the forearm line).
    hb, fb = arm.bones['hand.' + S], arm.bones['fore.' + S]
    q_arm = (hb.tail_local - hb.head_local).normalized().rotation_difference((fb.tail_local - fb.head_local).normalized())
    m = hb.matrix_local.to_3x3(); q_loc = (m.inverted() @ q_arm.to_matrix() @ m).to_quaternion()
    pb['hand.' + S].rotation_mode = 'QUATERNION'; pb['hand.' + S].rotation_quaternion = q_loc
    print('WRIST', S, round(math.degrees(q_arm.angle), 1))
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
for o in [o for o in sc.objects if o.type == 'MESH' and o.modifiers.get('rig')]:
    baked = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    old = o.data; o.data = baked; bpy.data.meshes.remove(old)
vl.objects.active = rig; bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
for S in ('L', 'R'):
    for child in ('fore', 'hand', 'shin', 'foot', 'elbow'): arm.bones[f'{child}.{S}'].inherit_scale = 'FULL'
for b in RUNTIME_LEN: print('LEN', b, round(arm.bones[b + '.L'].length, 3))
REST = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in arm.bones}
J2 = {side: {'shoulder': REST['upper.' + S][0], 'elbow': REST['upper.' + S][1], 'wrist': REST['fore.' + S][1], 'hip': REST['thigh.' + S][0], 'knee': REST['shin.' + S][0], 'ankle': REST['shin.' + S][1], 'toe': REST['foot.' + S][1]} for side, S in (('left', 'L'), ('right', 'R'))}


# ── posing from lesson data ──
targets = {}
def target(name):
    if name not in targets: e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); targets[name] = e
    return targets[name]
pb = rig.pose.bones
for side in ('L', 'R'):
    for b, t in (('fore', 'wrist'), ('shin', 'ankle')):
        c = pb[f'{b}.{side}'].constraints.new('IK'); c.target = target(f'{t}.{side}'); c.pole_target = target(f'{t}_pole.{side}'); c.chain_count = 2
    c = pb[f'foot.{side}'].constraints.new('DAMPED_TRACK'); c.target = target(f'toe.{side}')
    c = pb[f'shoulder.{side}'].constraints.new('COPY_ROTATION'); c.target = rig; c.subtarget = f'upper.{side}'; c.owner_space = c.target_space = 'LOCAL'; c.influence = .5
    c = pb[f'elbow.{side}'].constraints.new('COPY_ROTATION'); c.target = rig; c.subtarget = f'fore.{side}'; c.owner_space = c.target_space = 'LOCAL'; c.influence = .5
def bend(a, b, c, fallback):
    # Direction the middle joint points (elbow or knee), from the real joint positions.
    d = V(b) - (V(a) + V(c)) / 2
    return d.normalized() if d.length > .012 else V(fallback).normalized()
def set_rest_targets():
    for side, S in (('left', 'L'), ('right', 'R')):
        s_ = J2[side]
        target('wrist.' + S).location = V(s_['wrist']); target('wrist_pole.' + S).location = V(s_['elbow']) + bend(s_['shoulder'], s_['elbow'], s_['wrist'], (0, 1, 0)) * .4
        target('ankle.' + S).location = V(s_['ankle']); target('ankle_pole.' + S).location = V(s_['knee']) + V((0, -.4, 0))
        target('toe.' + S).location = V(s_['toe'])
# Pick each IK pole angle that leaves the rest pose untwisted.
set_rest_targets(); rig.matrix_world = Matrix.Identity(4)
for S in ('L', 'R'):
    for chain, bones in (('fore', ('upper', 'fore')), ('shin', ('thigh', 'shin'))):
        best = None
        for ang in range(-180, 180, 15):
            pb[f'{chain}.{S}'].constraints['IK'].pole_angle = math.radians(ang); bpy.context.view_layer.update()
            err = sum((pb[f'{b}.{S}'].matrix.to_3x3() - arm.bones[f'{b}.{S}'].matrix_local.to_3x3()).to_quaternion().angle if False else
                      pb[f'{b}.{S}'].matrix.to_quaternion().rotation_difference(arm.bones[f'{b}.{S}'].matrix_local.to_quaternion()).angle for b in bones)
            if best is None or err < best[0]: best = (err, ang)
        pb[f'{chain}.{S}'].constraints['IK'].pole_angle = math.radians(best[1]); print('POLE', chain, S, best[1], round(math.degrees(best[0]), 1))
REST_PELVIS = V(J['pelvis'])
HAND = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hand_rules.json')))
def curl(side, open_, shape=None):
    # The shared baked shapes (bake_hands.py): fist when closed, the technique's shape when open.
    from mathutils import Quaternion
    k = 1 - max(0, min(1, open_)); name = shape or ('palm' if k < 1 else 'knife')
    if 'shapes' not in HAND:
        return
    op, fi = HAND['shapes'].get(name, HAND['shapes']['knife'])[side], HAND['shapes']['fist'][side]
    for b in op:
        pbn = pb[f'{b}.{side}']; pbn.rotation_mode = 'QUATERNION'; pbn.rotation_quaternion = Quaternion(op[b]).slerp(Quaternion(fi[b]), k); pbn.scale = (1, 1, 1)
        pbn.location = [x * (1 - k) for x in HAND.get('knuckles', {}).get(side, {}).get(b, (0, 0, 0))]
def pose(p):
    d = p['data']; yaw = math.radians(d['yaw'])
    rig.matrix_world = Matrix.Translation(B(d['pelvis'])) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Translation(-REST_PELVIS)
    pb['chest'].rotation_mode = 'XYZ'; pb['chest'].rotation_euler = (math.radians(-d.get('lean', 0)), math.radians(d['chestYaw'] - d['yaw']), 0)
    pb['neck'].rotation_mode = 'XYZ'; pb['neck'].rotation_euler = (0, math.radians(d.get('headYaw', 0)), 0)
    for side, S in (('left', 'L'), ('right', 'R')):
        a = d['arms'][side]; l = d['legs'][side]
        target('wrist.' + S).location = B(a['wrist'])
        target('wrist_pole.' + S).location = B(a['elbow']) + bend(B(a['shoulder']), B(a['elbow']), B(a['wrist']), (0, 0, -1)) * .4
        fy = math.radians(l.get('yaw', 0)); fp = math.radians(l.get('pitch', 0))
        fwd = [math.sin(fy) * math.cos(fp), -math.sin(fp), math.cos(fy) * math.cos(fp)]   # runtime foot forward: pitch about X, then yaw about Y
        target('ankle.' + S).location = B(l['ankle'])
        target('ankle_pole.' + S).location = B(l['knee']) + bend(B(l['hip']), B(l['knee']), B(l['ankle']), B(fwd)) * .4
        target('toe.' + S).location = B(l['ankle']) + B(fwd) * .175 + Vector((0, 0, -.066)) * math.cos(fp)
        curl(S, a.get('open', 0), a.get('shape'))
    bpy.context.view_layer.update()

# ── lighting and camera (as the turntable) ──
for engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: sc.render.engine = engine; break
    except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 720, 900; sc.view_settings.exposure = -0.7
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.62, .67, .72, 1); world.node_tree.nodes['Background'].inputs['Strength'].default_value = .55
def light(name, loc, energy, size, colour):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = colour
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = (V((0, 0, 1)) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
light('key', (-1.6, -2.4, 2.9), 420, 2.0, (1, .96, .92)); light('fill', (2.2, -1.6, 1.6), 140, 2.5, (.92, .95, 1)); light('rim', (.8, 2.6, 2.6), 260, 1.5, (.9, .94, 1))
fl = bpy.data.meshes.new('floor'); fl.from_pydata([(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [], [(0, 1, 2, 3)])
fo = bpy.data.objects.new('floor', fl); sc.collection.objects.link(fo); fm = bpy.data.materials.new('mat'); fm.use_nodes = True
fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.06, .11, .17, 1); fo.data.materials.append(fm)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
def shoot(target_pt, az, el, dist, lens, name):
    a, e = math.radians(az), math.radians(el)
    cam.location = V(target_pt) + V((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (V(target_pt) - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
    sc.render.filepath = os.path.join(out, name + '.png'); bpy.ops.render.render(write_still=True)
report = []
for p in POSES:
    pose(p); c = B(p['data']['pelvis']); c.z = .92
    slug = f"{p['lesson']}-pose{p['pose']:02d}"
    shoot(c, 40 + p['data']['yaw'], 8, 4.6, 50, slug)          # front-left of the way she faces
    shoot(c, -50 + p['data']['yaw'], 14, 4.6, 50, slug + '-right')
    report.append({'lesson': p['lesson'], 'pose': p['pose'], 'name': p['name'], 't': p['t'], 'image': slug + '.png',
                   'hands_open': [p['data']['arms'][s].get('open', 0) for s in ('left', 'right')]})
# Hand close-ups: a fist from a punch pose and an open hand.
pose(POSES[2]); bpy.context.view_layer.update()
fist = rig.matrix_world @ pb['middle2.R'].head; yaw = POSES[2]['data']['yaw']
for az, el, nm in ((yaw + 70, 30, 'hand_fist_close'), (yaw + 140, 20, 'hand_fist_side')): shoot(fist, az, el, .45, 60, nm)
for S in ('L', 'R'): curl(S, 1, 'knife')
bpy.context.view_layer.update(); shoot(rig.matrix_world @ pb['middle2.R'].head, yaw + 70, 30, .45, 60, 'hand_open_close')
# Optional: Blender reference stills from exactly the browser lab's camera (eye, target, 30° vertical FOV, aspect).
args_all = sys.argv[sys.argv.index('--') + 1:]
if len(args_all) > 3:
    cdir = os.path.join(out, 'compare'); os.makedirs(cdir, exist_ok=True)
    for v in json.load(open(args_all[3])):
        pose(v); cam.location = B(v['eye']); cam.rotation_euler = (B(v['target']) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.sensor_fit = 'VERTICAL'; cam.data.angle_y = math.radians(30)
        sc.render.resolution_y = 800; sc.render.resolution_x = int(800 * v['aspect'])
        sc.render.filepath = os.path.join(cdir, v['name'] + '-blender.png'); bpy.ops.render.render(write_still=True)
    sc.render.resolution_x, sc.render.resolution_y = 720, 900
json.dump({'bones': len(arm.bones), 'renders': report}, open(os.path.join(out, 'poses_report.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'avatar_stage_b.blend'), copy=True)
print('POSE_OK', len(arm.bones), 'bones', len(report), 'poses')
