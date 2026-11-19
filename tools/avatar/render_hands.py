# Review sheet: each baked hand shape on the right hand (Blender rig = runtime), from the back, the palm, the thumb side and the little-finger side.
# Run: Blender -b -Y --factory-startup avatar_stage_b.blend --python render_hands.py -- <out_dir> [fist,knife,...]  (HAND_SIDE=L for the left hand)
import bpy, json, sys, os, math
from mathutils import Quaternion, Matrix, Vector
out = sys.argv[sys.argv.index('--') + 1]; os.makedirs(out, exist_ok=True)
H = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hand_rules.json')))
sc = bpy.context.scene; rig = bpy.data.objects['rig']; pb = rig.pose.bones; rig.matrix_world = Matrix.Identity(4)
for o in sc.objects:
    if o.type == 'MESH' and o.name != 'skin': o.hide_render = True
for b in pb:
    for c in b.constraints: c.mute = True
    b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.show_cavity = True
sc.display.shading.color_type = 'SINGLE'; sc.display.shading.single_color = (.78, .6, .48)
sc.render.resolution_x = sc.render.resolution_y = 360; sc.render.film_transparent = False
cam = bpy.data.objects.get('handcam') or bpy.data.objects.new('handcam', bpy.data.cameras.new('handcam'))
if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = .24; sc.camera = cam
S = os.environ.get('HAND_SIDE', 'R'); tiles = []
hand = pb['hand.' + S]
SHAPES = sys.argv[sys.argv.index('--') + 2].split(',') if len(sys.argv) > sys.argv.index('--') + 2 else ['fist', 'knife', 'spear', 'palm', 'ridge']
for shape in SHAPES:
    for b in pb:
        if b.name.endswith('.' + S) and b.name.split('.')[0] not in ('hand', 'fore', 'upper', 'elbow', 'shoulder'): b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
    for k, q in (H['shapes'][shape][S].items() if shape != 'rest' else []): pb[f'{k}.{S}'].rotation_quaternion = Quaternion(q)
    if shape not in ('fist', 'rest'):
        for k, l in H.get('knuckles', {}).get(S, {}).items(): pb[f'{k}.{S}'].location = l
    bpy.context.view_layer.update()
    m = hand.matrix; c = (hand.head + pb['middle1.' + S].head) / 2 + (pb['middle1.' + S].head - hand.head) * .5
    along = (pb['middle1.' + S].head - hand.head).normalized(); across = (pb['pinky1.' + S].head - pb['index1.' + S].head).normalized()
    n = along.cross(across).normalized()
    for name, d in (('palm', n), ('back', -n), ('thumb side', -across), ('little-finger side', across)):
        cam.location = c + d * .5; up = along
        z = d.normalized(); x = up.cross(z).normalized(); y = z.cross(x)
        cam.matrix_world = Matrix((x, y, z)).transposed().to_4x4(); cam.location = c + d * .5
        path = os.path.join(out, f'{S}-{shape}-{name.split()[0]}.png'); sc.render.filepath = path
        bpy.ops.render.render(write_still=True); tiles.append(path)
print('RENDER_HANDS_OK', len(tiles))
