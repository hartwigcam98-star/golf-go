"""Runs inside Blender after build.py: one neutral golfer, each short hairstyle in turn, a head-and-shoulders Cycles render of each
(front three-quarter and back) -> out/mh/hair_<name>_{f,b}.png. Uses the packs build.py installed."""
import bpy, os, sys, json, math, importlib, traceback
def dyn(pkg, key):
    for m in list(sys.modules):
        if m.endswith(pkg):
            mod = importlib.import_module(m)
            if hasattr(mod, key): return getattr(mod, key)
    raise ValueError(pkg)
HumanService = dyn("mpfb.services.humanservice", "HumanService"); AssetService = dyn("mpfb.services.assetservice", "AssetService")
TS = dyn("mpfb.services.targetservice", "TargetService"); LocationService = dyn("mpfb.services.locationservice", "LocationService")
OUT = os.path.abspath('out/mh'); os.makedirs(OUT, exist_ok=True)
AssetService.update_all_asset_lists()
HAIRS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hairs.json')))
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
md = TS.get_default_macro_info_dict(); md.update({"gender": 1.0, "age": 0.55, "muscle": 0.6, "weight": 0.5, "height": 0.5, "proportions": 0.65})
bm = HumanService.create_human(macro_detail_dict=md)
HumanService.set_character_skin(AssetService.find_asset_absolute_path("young_caucasian_male.mhmat", asset_subdir="skins"), bm, skin_type='GAMEENGINE')
for sub, nm in [("eyes", "low-poly.mhclo"), ("eyebrows", "eyebrow001.mhclo"), ("eyelashes", "eyelashes01.mhclo"), ("clothes", "namuhekam_male_polo_shirt.mhclo")]:
    p = AssetService.find_asset_absolute_path(nm, asset_subdir=sub)
    if p: HumanService.add_mhclo_asset(p, bm, asset_type={'eyes': 'Eyes', 'eyebrows': 'Eyebrows', 'eyelashes': 'Eyelashes'}.get(sub, 'Clothes'), material_type='GAMEENGINE')
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'; sc.render.resolution_x = sc.render.resolution_y = 360
if not sc.world: sc.world = bpy.data.worlds.new('w')
sc.world.use_nodes = True; bg = sc.world.node_tree.nodes.get('Background'); bg.inputs[0].default_value = (.62, .72, .85, 1); bg.inputs[1].default_value = 1.1
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (0.8, 0.2, 0.6); sc.collection.objects.link(sun)
top = max((bm.matrix_world @ v.co).z for v in bm.data.vertices); print('top', top, flush=True)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.lens = 85; sc.camera = cam
for h in HAIRS:
    try:
        before = set(bpy.data.objects)
        p = AssetService.find_asset_absolute_path(h + '.mhclo', asset_subdir='hair')
        if not p: print('MISSING', h, flush=True); continue
        HumanService.add_mhclo_asset(p, bm, asset_type='Hair', material_type='GAMEENGINE')
        new = [o for o in bpy.data.objects if o not in before]
        for ang, tag in [(0.5, 'f'), (math.pi - 0.5, 'b')]:
            d = 1.25; cam.location = (math.sin(ang) * d, -math.cos(ang) * d, top - 0.1); cam.rotation_euler = (math.radians(92), 0, ang)
            sc.render.filepath = f"{OUT}/hair_{h}_{tag}.png"; bpy.ops.render.render(write_still=True)
        for o in new: bpy.data.objects.remove(o, do_unlink=True)
        print('HAIR', h, flush=True)
    except Exception: traceback.print_exc()
