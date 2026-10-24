"""Bake sky light (ambient occlusion through the leaf cut-outs, one bounce) into the tree prototypes' vertex colours.

  blender -b --factory-startup -P bake_trees.py -- trees.npz atlas.png outdir

trees.npz from treegen.py (game frame x, y up, z). Writes outdir/trees_col.npz: per 'sp|v|kind' the baked colours
(base colour x light), and previews. Leaves keep the game's alphaTest 0.5 cut-out, so light reaches the inner crown only
through real gaps; normals are the game's own (custom split normals) so the bake matches how the game lights them.
"""
import bpy, sys, os, json, time, math
import numpy as np
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
NPZ, ATLAS, OUT = a[0], a[1], a[2]
os.makedirs(OUT, exist_ok=True)
T0 = time.time(); LOG = []
def log(*x):
    s = ' '.join(str(v) for v in x); LOG.append(s); print('[trees]', s, flush=True)
D = np.load(NPZ); META = json.load(open(NPZ.replace('.npz', '.json')))
bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene; COLL = SC.collection
C3 = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], dtype=np.float64)
def gb(P): return (np.asarray(P, dtype=np.float64) @ C3.T)

atlas = bpy.data.images.load(os.path.abspath(ATLAS)); atlas.alpha_mode = 'STRAIGHT'
def mat(name, col, alpha=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = .9
    if alpha:
        tx = m.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = atlas
        mth = m.node_tree.nodes.new('ShaderNodeMath'); mth.operation = 'GREATER_THAN'; mth.inputs[1].default_value = .5
        m.node_tree.links.new(tx.outputs['Alpha'], mth.inputs[0]); m.node_tree.links.new(mth.outputs[0], b.inputs['Alpha'])
    return m
MB, MM, ML = mat('bark', (.25, .2, .15)), mat('mass', (.12, .18, .08)), mat('leaf', (.15, .22, .1), alpha=True)

def obj(name, A, m, uv=False):
    P = gb(A[:, :3]).astype(np.float32); n = len(P); nt = n // 3
    me = bpy.data.meshes.new(name)
    me.vertices.add(n); me.vertices.foreach_set('co', P.ravel())
    me.loops.add(n); me.loops.foreach_set('vertex_index', np.arange(n, dtype=np.int32))
    me.polygons.add(nt); me.polygons.foreach_set('loop_start', np.arange(0, n, 3, dtype=np.int32))
    if uv:
        ul = me.uv_layers.new(name='UVMap'); ul.data.foreach_set('uv', np.stack([A[:, 9], 1 - A[:, 10]], 1).astype(np.float32).ravel())
    me.update(); me.validate(clean_customdata=False)
    for p in me.polygons: p.use_smooth = True
    Nn = gb(A[:, 3:6]); Nn /= np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-6)
    me.normals_split_custom_set([tuple(v) for v in Nn])
    me.materials.append(m)
    me.color_attributes.new('ao', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = me.color_attributes['ao']; me.color_attributes.active_color_index = me.color_attributes.find('ao') if hasattr(me.color_attributes, 'active_color_index') else 0
    o = bpy.data.objects.new(name, me); COLL.objects.link(o); return o

# ground (bounce + occlusion from below)
import bmesh
bm = bmesh.new(); s = 60
vs = [bm.verts.new(v) for v in ((-s, -s, -.05), (s, -s, -.05), (s, s, -.05), (-s, s, -.05))]; bm.faces.new(vs)
gm = bpy.data.meshes.new('ground'); bm.to_mesh(gm); bm.free(); gm.materials.append(mat('g', (.22, .26, .14)))
G = bpy.data.objects.new('ground', gm); COLL.objects.link(G)
world = bpy.data.worlds.new('w'); SC.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 1.0
world.light_settings.distance = float(os.environ.get('AO_DIST', 4.0))
SC.render.engine = 'CYCLES'; SC.cycles.device = 'CPU'; SC.cycles.samples = int(os.environ.get('TREE_SAMPLES', 128))
SC.cycles.transparent_max_bounces = 32; SC.cycles.max_bounces = 3; SC.cycles.diffuse_bounces = 1
SC.render.bake.target = 'VERTEX_COLORS'; SC.render.bake.use_pass_direct = True; SC.render.bake.use_pass_indirect = True; SC.render.bake.use_pass_color = False

out = {}
for key in META:
    objs = {k: obj('%s_%s' % (key, k), D['%s|%s' % (key, k)], {'bark': MB, 'mass': MM, 'leaf': ML}[k], uv=(k != 'mass')) for k in ('bark', 'mass', 'leaf') if len(D['%s|%s' % (key, k)])}
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs.values(): o.select_set(True)
    bpy.context.view_layer.objects.active = list(objs.values())[0]
    t = time.time()
    MODE = os.environ.get('TREE_MODE', 'AO')
    if MODE == 'AO': bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    else: bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS')
    for k, o in objs.items():
        A = D['%s|%s' % (key, k)]; n = len(A)
        c = np.empty(n * 4, np.float32); o.data.color_attributes['ao'].data.foreach_get('color', c); occ = c.reshape(n, 4)[:, 0]
        # open ground under a white sky bakes to 1; a leaf facing the open sky about the same
        lo, hi = {'leaf': (.5, .68), 'mass': (.45, .55), 'bark': (.42, .7)}[k]
        f = np.clip(lo + hi * occ, 0, 1.25)
        out['%s|%s' % (key, k)] = np.clip(A[:, 6:9] * f[:, None], 0, 1).astype(np.float32)
        log(key, k, 'occl mean %.2f p10 %.2f p90 %.2f' % (occ.mean(), np.percentile(occ, 10), np.percentile(occ, 90)))
    log(key, 'baked', round(time.time() - t, 1), 's')
    for o in objs.values(): bpy.data.objects.remove(o)
np.savez_compressed(os.path.join(OUT, 'trees_col.npz'), **out)
log('done', round(time.time() - T0), 's')
open(os.path.join(OUT, 'trees_log.txt'), 'w').write('\n'.join(LOG))
