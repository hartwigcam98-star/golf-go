# quick checks: (1) does SHADOW bake see a cube's shadow on a plane, (2) a top render of the hole scene as built by bake.py
import bpy, bmesh, numpy as np, sys, os, math
from mathutils import Vector
OUT = sys.argv[sys.argv.index('--') + 1]; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); SC = bpy.context.scene
bpy.ops.mesh.primitive_plane_add(size=10); P = bpy.context.active_object
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 2))
bpy.ops.object.select_all(action='DESELECT')
img = bpy.data.images.new('b', 64, 64, float_buffer=True)
m = bpy.data.materials.new('m'); m.use_nodes = True; n = m.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; m.node_tree.nodes.active = n
P.data.materials.append(m); P.data.uv_layers.active
ld = bpy.data.lights.new('s', 'SUN'); lo = bpy.data.objects.new('s', ld); SC.collection.objects.link(lo); lo.rotation_euler = (0.3, 0, 0)
SC.render.engine = 'CYCLES'; SC.cycles.samples = 16; SC.render.bake.target = 'IMAGE_TEXTURES'
P.select_set(True); bpy.context.view_layer.objects.active = P
for typ, kw in (('SHADOW', {}), ('DIFFUSE', {'pass_filter': {'DIRECT'}}), ('AO', {})):
    bpy.ops.object.bake(type=typ, use_clear=True, **kw)
    a = np.empty(64 * 64 * 4, np.float32); img.pixels.foreach_get(a); a = a.reshape(64, 64, 4)[:, :, 0]
    print('[dbg]', typ, 'min %.3f mean %.3f max %.3f' % (a.min(), a.mean(), a.max()), flush=True)
