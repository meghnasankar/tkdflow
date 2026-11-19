# Bake every hand shape once (fist, knife-hand, spear-hand, palm, ridge-hand) as each finger bone's local rotation,
# so the Blender rig and the browser runtime apply exactly the same fingers. Writes `shapes` into hand_rules.json.
#   fist   : the existing finger angles; the thumb's middle joint against the thumb side of the folded index finger
#            (root swing capped at 14°), the tip turned most of the way across the middle finger; the left thumb is the
#            right one mirrored.
#   knife  : fingers straight and parallel (no splay); thumb bent and tucked along the edge of the index finger.
#   spear  : knife, with the middle finger flexed slightly so the fingertips line up.
#   palm   : fingers together, slightly bent at the middle joints; thumb along the index.
#   ridge  : fingers straight together; thumb tucked against the palm just below the index knuckle (a crease, not a
#            curl into the palm's centre, which folded the thumb web over into a flap).
# Run: Blender -b -Y --factory-startup avatar_stage_b.blend --python bake_hands.py
import bpy, os, math, json
from mathutils import Vector, Matrix, Quaternion, Euler
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hand_rules.json')
H = json.load(open(path)); sc = bpy.context.scene; rig = bpy.data.objects['rig']; pb = rig.pose.bones
FINGERS = ('index', 'middle', 'ring', 'pinky'); FINGER_GAP = .010; KNUCKLE_SPACING = .021; KNUCKLE_PULL = .7; THUMB_ROOT_STIFF = .95; OPEN_ROOT_SHARE = .4; THUMB = ('thumb0', 'thumb1', 'thumb2')
def reset():
    rig.matrix_world = Matrix.Identity(4)
    for b in pb:
        for c in list(b.constraints):
            if c.name.startswith('bake'): b.constraints.remove(c)
            else: c.mute = True
        b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0); b.scale = (1, 1, 1)
    bpy.context.view_layer.update()
def local_q(bone):
    rest = bone.bone.matrix_local; parent_pose = bone.parent.matrix; parent_rest = bone.parent.bone.matrix_local
    return ((parent_rest.inverted() @ rest).inverted() @ parent_pose.inverted() @ bone.matrix).to_quaternion()
def empty(name, loc):
    o = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if o.name not in sc.collection.objects: sc.collection.objects.link(o)
    o.location = loc; return o
def read(S):
    bpy.context.view_layer.update(); out = {}
    for f in FINGERS:
        for i in '123': out[f'{f}{i}'] = [round(x, 5) for x in local_q(pb[f'{f}{i}.{S}'])]
    for t in THUMB: out[t] = [round(x, 5) for x in local_q(pb[f'{t}.{S}'])]
    for c_ in [c for b in pb for c in b.constraints if c.name.startswith('bake')]: pass
    return out
def bake_fingers_straight(S, flex=None):
    # Fingers straight and closed together (no splay): each finger aims at a tip point beside the middle finger's tip,
    # one finger-width apart, so neighbouring fingers touch along their length the way a knife-hand is formed.
    d = (pb['middle3.' + S].tail - pb['middle1.' + S].head).normalized()
    across = (pb['pinky1.' + S].head - pb['index1.' + S].head).normalized()
    m0 = pb['middle1.' + S].head
    for k, f in zip((-1, 0, 1, 1.8), FINGERS):
        h = pb[f + '1.' + S].head; length = (pb[f + '3.' + S].tail - h).length
        tip_across = (m0 - h).dot(across) + k * FINGER_GAP           # tip offset across from this finger's knuckle
        aim = (d * length + across * tip_across).normalized()
        for i in '123':
            b = pb[f'{f}{i}.{S}']; c = b.constraints.new('DAMPED_TRACK'); c.name = 'bake'
            c.target = empty(f'bake_{f}{i}_{S}', b.head + aim * 1.0)
    bpy.context.view_layer.update()
def knuckles(S):
    # The source hand rests with its knuckles spread wide (2.3 to 3.3 cm apart against 1.4 to 1.6 cm wide fingers), so a
    # closed open hand would still show gaps at the finger bases. Open shapes move the index, ring and little-finger
    # knuckles part of the way toward the middle finger (a pose offset on each first finger bone, in its rest frame).
    across = (pb['pinky1.' + S].head - pb['index1.' + S].head).normalized(); m0 = pb['middle1.' + S].head; out = {}
    for k, f in ((-1, 'index'), (1, 'ring'), (1.8, 'pinky')):
        b = pb[f + '1.' + S]; o = (b.head - m0).dot(across)
        shift = across * (k * KNUCKLE_SPACING - o) * KNUCKLE_PULL
        loc = b.bone.matrix_local.to_3x3().inverted() @ shift; b.location = loc; out[f + '1'] = [round(x, 5) for x in loc]
    bpy.context.view_layer.update(); return out
def bake_thumb_open(S, target):
    # Open hands: solve once, keep only part of the root's swing, then let the two thumb joints reach the target.
    err = bake_thumb(S, target); apply_and_clear(S)
    t0 = pb['thumb0.' + S]; t0.rotation_quaternion = Quaternion().slerp(t0.rotation_quaternion, OPEN_ROOT_SHARE); bpy.context.view_layer.update()
    t = empty('bake_thumb_' + S, target); c = pb['thumb2.' + S].constraints.new('IK'); c.name = 'bake'; c.target = t; c.chain_count = 2; c.use_tail = True
    bpy.context.view_layer.update(); return (pb['thumb2.' + S].tail - target).length
def bake_thumb(S, target):
    # The thumb's root (metacarpal) bone is stiff in the solve, so the thumb reaches by bending at its joints; a large
    # swing at the root drags the skin at the base of the thumb (the thenar) into a torn patch.
    t0 = pb['thumb0.' + S]; t0.ik_stiffness_x = t0.ik_stiffness_y = t0.ik_stiffness_z = THUMB_ROOT_STIFF
    t = empty('bake_thumb_' + S, target); c = pb['thumb2.' + S].constraints.new('IK'); c.name = 'bake'; c.target = t; c.chain_count = 3; c.use_tail = True
    bpy.context.view_layer.update(); return (pb['thumb2.' + S].tail - target).length
def apply_and_clear(S):
    # Freeze the constrained result as plain rotations, then remove the bake constraints (fingers first, then thumb).
    bpy.context.view_layer.update()
    qs = {b.name: local_q(b) for b in pb if b.name.endswith('.' + S) and (b.name[:-2].rstrip('123') in FINGERS or b.name[:-2] in THUMB)}
    for b in pb:
        for c in list(b.constraints):
            if c.name == 'bake': b.constraints.remove(c)
    for n, q in qs.items(): pb[n].rotation_quaternion = q
    bpy.context.view_layer.update()
shapes = {k: {} for k in ('fist', 'knife', 'spear', 'palm', 'ridge')}; K = {}
# Fist finger curl (degrees at the knuckle, middle and end joints); FIST_FINGERS="a,b,c" overrides for review.
FIST_FINGERS = H['fingers'] if not os.environ.get('FIST_FINGERS') else {str(k + 1): [float(a), 0, 0] for k, a in enumerate(os.environ['FIST_FINGERS'].split(','))}
for S in ('L', 'R'):
    across = (pb['pinky1.' + S].head - pb['index1.' + S].head).normalized()
    # fist: the existing rules
    reset()
    for f in FINGERS:
        for i in '123': pb[f'{f}{i}.{S}'].rotation_quaternion = Euler([math.radians(a) for a in FIST_FINGERS[i]], 'XYZ').to_quaternion()
    bpy.context.view_layer.update(); i2, m2 = pb['index2.' + S], pb['middle2.' + S]
    face = (i2.tail - pb['index1.' + S].head).normalized()
    # The thumb lies over the fist: first its root and first joint bring its middle joint against the thumb side of
    # the folded index finger, covering the gap under the curled index; then the tip turns across the middle finger.
    # The root's share of that first step is capped (FIST_ROOT_CAP of its own solve) so the web never tears.
    FO = float(os.environ.get('FIST_OUT', '.006')); FA = float(os.environ.get('FIST_ALONG', '1.0'))
    MJ = float(os.environ.get('FIST_JOINT_OUT', '.006')); MA = float(os.environ.get('FIST_JOINT_ALONG', '.3')); MS = float(os.environ.get('FIST_JOINT_SIDE', '.016'))
    joint_at = i2.head + (i2.tail - i2.head) * MA - across * MS + face * MJ
    t0 = pb['thumb0.' + S]; t0.ik_stiffness_x = t0.ik_stiffness_y = t0.ik_stiffness_z = 0
    t = empty('bake_thumbjoint_' + S, joint_at); c = pb['thumb1.' + S].constraints.new('IK'); c.name = 'bake'; c.target = t; c.chain_count = 2; c.use_tail = True
    bpy.context.view_layer.update(); apply_and_clear(S); t0.ik_stiffness_x = t0.ik_stiffness_y = t0.ik_stiffness_z = THUMB_ROOT_STIFF
    cap = math.radians(float(os.environ.get('FIST_ROOT_CAP', '14')))
    if t0.rotation_quaternion.angle > cap:
        t0.rotation_quaternion = Quaternion().slerp(t0.rotation_quaternion, cap / t0.rotation_quaternion.angle); bpy.context.view_layer.update()
        c = pb['thumb1.' + S].constraints.new('IK'); c.name = 'bake'; c.target = t; c.chain_count = 1; c.use_tail = True
        bpy.context.view_layer.update(); apply_and_clear(S)
    tip_at = (m2.head + m2.tail) / 2 * FA + (i2.head + i2.tail) / 2 * (1 - FA) + face * FO
    tip_bend = float(os.environ.get('FIST_TIP_BEND', '.8'))
    if tip_bend > 0:   # the tip turns most of the way toward the middle finger (a full turn curls it under the fist)
        q0 = pb['thumb2.' + S].rotation_quaternion.copy()
        t = empty('bake_thumb_' + S, tip_at); c = pb['thumb2.' + S].constraints.new('DAMPED_TRACK'); c.name = 'bake'; c.target = t
        bpy.context.view_layer.update(); apply_and_clear(S); pb['thumb2.' + S].rotation_quaternion = q0.slerp(pb['thumb2.' + S].rotation_quaternion, tip_bend)
        bpy.context.view_layer.update()
    fist_err = (pb['thumb2.' + S].tail - tip_at).length
    shapes['fist'][S] = read(S)
    # knife-hand
    reset(); K[S] = knuckles(S); bake_fingers_straight(S); apply_and_clear(S)
    palm_n = (pb['hand.' + S].matrix.to_3x3() @ Vector((0, 0, 1))).normalized()
    i1 = pb['index1.' + S]; side_of_index = i1.head + (i1.tail - i1.head) * .55 - across * .012 + palm_n * .010
    err = bake_thumb_open(S, side_of_index); apply_and_clear(S); shapes['knife'][S] = read(S)
    # spear-hand: knife with the middle finger flexed so the tips line up
    for i, a in (('2', 12), ('3', 8)): pb[f'middle{i}.{S}'].rotation_quaternion = pb[f'middle{i}.{S}'].rotation_quaternion @ Euler((math.radians(a), 0, 0), 'XYZ').to_quaternion()
    shapes['spear'][S] = read(S)
    # palm: knife fingers, slightly bent at the middle and end joints
    reset(); knuckles(S); bake_fingers_straight(S); apply_and_clear(S)
    for f in FINGERS:
        for i, a in (('2', 18), ('3', 12)): pb[f'{f}{i}.{S}'].rotation_quaternion = pb[f'{f}{i}.{S}'].rotation_quaternion @ Euler((math.radians(a), 0, 0), 'XYZ').to_quaternion()
    bake_thumb_open(S, side_of_index); apply_and_clear(S); shapes['palm'][S] = read(S)
    # ridge-hand: knife fingers, thumb folded into the palm
    reset(); knuckles(S); bake_fingers_straight(S); apply_and_clear(S)
    # Ridge-hand: the thumb tucked against the palm just below the index finger's knuckle, bent but not curled into the
    # palm's centre, so the index edge (the ridge) is clear and the thumb web creases instead of folding over.
    RD = float(os.environ.get('RIDGE_DEPTH', '.020')); RA = float(os.environ.get('RIDGE_ACROSS', '0')); RB = float(os.environ.get('RIDGE_BACK', '.30'))
    i1h = pb['index1.' + S].head; centre = i1h + (pb['hand.' + S].head - i1h) * RB + across * RA + palm_n * RD
    bake_thumb_open(S, centre); apply_and_clear(S); shapes['ridge'][S] = read(S)
    print('HANDS', S, 'knife thumb error', round(err * 100, 2), 'cm', 'fist thumb error', round(fist_err * 100, 2), 'root swing', {k: round(math.degrees(Quaternion(shapes[k][S]['thumb0']).angle), 1) for k in shapes})
# The right fist's thumb, mirrored, is used for both hands when FIST_MIRROR is set (the two source hands differ a
# little, and the left solve wraps the thumb further round the fist). Mirror across x: (w, x, y, z) → (w, x, -y, -z).
if os.environ.get('FIST_MIRROR', '1') == '1':
    for t in THUMB:
        w, x, y, z = shapes['fist']['R'][t]; shapes['fist']['L'][t] = [w, x, -y, -z]
H['shapes'] = shapes; H['knuckles'] = K
H['note_knuckles'] = 'knuckles: open-hand pose offset (bone rest frame, metres) for the first bone of the index, ring and little fingers; scaled by how open the hand is (0 for a fist).'
H['note_shapes'] = 'shapes: per hand shape, each finger bone local rotation (w, x, y, z), baked by bake_hands.py. A closed hand (open = 0) is fist; open = 1 is the technique shape (knife default, palm for supporting hands); in between they slerp.'
json.dump(H, open(path, 'w'), indent=1)
print('BAKE_HANDS_OK')
