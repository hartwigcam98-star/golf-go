"""Runs inside Blender (background). Installs the downloaded MakeHuman packs into MPFB's data folder, lists the assets,
builds the test golfer described in golfer.json, and exports FBX + GLB + a Cycles preview render to out/mh/."""
import bpy, os, sys, json, glob, zipfile, traceback, importlib
def dyn(pkg, key):
    for m in list(sys.modules):
        if m.endswith(pkg):
            mod = importlib.import_module(m)
            if hasattr(mod, key): return getattr(mod, key)
    raise ValueError(pkg)
HumanService = dyn("mpfb.services.humanservice", "HumanService")
AssetService = dyn("mpfb.services.assetservice", "AssetService")
ExportService = dyn("mpfb.services.exportservice", "ExportService")
ObjectService = dyn("mpfb.services.objectservice", "ObjectService")
LocationService = dyn("mpfb.services.locationservice", "LocationService")
OUT = os.path.abspath('out/mh'); os.makedirs(OUT, exist_ok=True)
data = LocationService.get_user_data(); print('mpfb user data', data, flush=True)
for z in sorted(glob.glob('packs/*.zip')):
    try:
        with zipfile.ZipFile(z) as f: f.extractall(data)
        print('installed', z, flush=True)
    except Exception as e: print('ERR pack', z, e, flush=True)
AssetService.update_all_asset_lists()
# what is there
lst = {}
for sub in ['clothes', 'hair', 'skins', 'eyebrows', 'eyes', 'eyelashes', 'teeth', 'tongue', 'proxymeshes']:
    root = LocationService.get_user_data(sub)
    lst[sub] = sorted(os.path.relpath(p, root) for p in glob.glob(os.path.join(root, '**', '*.mh*'), recursive=True) if p.endswith(('.mhclo', '.mhmat', '.proxy')))
json.dump(lst, open(f'{OUT}/assets.json', 'w'), indent=1)
print({k: len(v) for k, v in lst.items()}, flush=True)
G = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'golfers.json')))
RUN = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run.json'))) if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run.json')) else {}
if not RUN.get('build', True): G = []
if RUN.get('only'): G = [g for g in G if g['id'] in RUN['only']]
def find(name, sub):
    p = AssetService.find_asset_absolute_path(name, asset_subdir=sub)
    if p: return p
    # loose match on the listing
    for rel in lst.get(sub, []):
        if os.path.basename(rel).lower().startswith(name.lower().split('.')[0]): return os.path.join(LocationService.get_user_data(sub), rel)
    return None
for g in G:
    try:
        for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
        TS = dyn("mpfb.services.targetservice", "TargetService"); md = TS.get_default_macro_info_dict(); md.update(g.get('macro', {}))
        print('macro', md, flush=True)
        bm = HumanService.create_human(macro_detail_dict=md)
        troot = LocationService.get_mpfb_data('targets')
        for t, w in g.get('targets', []):
            try: TS.load_target(bm, os.path.join(troot, t + '.target.gz'), weight=w)
            except Exception as e: print('target', t, e, flush=True)
        sk = find(g['skin'], 'skins')
        if sk: HumanService.set_character_skin(sk, bm, skin_type='GAMEENGINE')
        else: print('no skin', g['skin'])
        HumanService.add_builtin_rig(bm, g.get('rig', 'mixamo'))
        for sub, name in g['assets']:
            p = find(name, sub)
            if not p: print('MISSING', sub, name, flush=True); continue
            HumanService.add_mhclo_asset(p, bm, asset_type={'clothes':'Clothes','hair':'Hair','eyes':'Eyes','eyebrows':'Eyebrows','eyelashes':'Eyelashes','teeth':'Teeth','tongue':'Tongue'}.get(sub, 'Clothes'), material_type='GAMEENGINE')
            print('added', sub, os.path.basename(p), flush=True)
        root = ExportService.create_character_copy(bm, name_suffix='_x')
        xb = ObjectService.find_object_of_type_amongst_nearest_relatives(root, 'Basemesh')
        print('modifiers', [(m.name, m.type) for m in xb.modifiers], flush=True)
        if g.get('keep_scalp'):   # the hair's delete-group mask would cut the scalp (and the sides of the head) away under it
            hs = [os.path.splitext(n)[0].lower() for sub, n in g['assets'] if sub == 'hair']
            for m in list(xb.modifiers):
                if m.type == 'MASK' and any(h in m.name.lower() for h in hs): print('drop mask', m.name, flush=True); xb.modifiers.remove(m)
        ExportService.bake_modifiers_remove_helpers(xb, bake_masks=True, bake_subdiv=True, remove_helpers=True, also_proxy=True)
        bpy.ops.object.select_all(action='DESELECT'); root.select_set(True)
        for c in ObjectService.get_list_of_children(root): c.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.fbx(filepath=f"{OUT}/{g['id']}.fbx", use_selection=True, add_leaf_bones=False, bake_anim=False, path_mode='COPY', embed_textures=True)
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{g['id']}.glb", use_selection=True, export_format='GLB', export_animations=False)
        print('DONE', g['id'], flush=True)
        if not g.get('render', True): continue
        # hide the originals, render the export copy
        for o in bpy.data.objects:
            if o.name.endswith('_x') or o == root or o.parent == root or (o.parent and o.parent.parent == root): continue
            o.hide_render = True
        sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.device = 'CPU'
        sc.render.resolution_x, sc.render.resolution_y = 720, 1100
        if not sc.world: sc.world = bpy.data.worlds.new('w')
        sc.world.use_nodes = True; bg = sc.world.node_tree.nodes.get('Background'); bg.inputs[0].default_value = (.62, .72, .85, 1); bg.inputs[1].default_value = 1.2
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (0.9, 0.2, 0.7); sc.collection.objects.link(sun)
        ftop = max((xb.matrix_world @ v.co).z for v in xb.data.vertices); print('top', ftop, flush=True)
        for ang, nm in [(0.25, 'front')]:
            import math
            cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
            cam.data.lens = 60; d = 3.4
            cam.location = (math.sin(ang) * d, -math.cos(ang) * d, 1.0); cam.rotation_euler = (math.radians(89), 0, ang)
            sc.camera = cam; sc.render.filepath = f"{OUT}/{g['id']}_{nm}.png"; bpy.ops.render.render(write_still=True)
            cam.data.lens = 160; cam.location = (math.sin(ang) * 2.2, -math.cos(ang) * 2.2, ftop - 0.11); cam.rotation_euler = (math.radians(90), 0, ang)
            sc.render.resolution_x, sc.render.resolution_y = 600, 600; sc.render.filepath = f"{OUT}/{g['id']}_face.png"; bpy.ops.render.render(write_still=True)
            sc.render.resolution_x, sc.render.resolution_y = 720, 1100
            bpy.data.objects.remove(cam, do_unlink=True)
        bpy.data.objects.remove(sun, do_unlink=True)
        print('DONE', g['id'], flush=True)
    except Exception:
        traceback.print_exc(); open(f"{OUT}/{g['id']}_error.txt", 'w').write(traceback.format_exc())
