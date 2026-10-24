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
MR = mat('recv', (.8, .8, .8))

def obj(name, A, m, uv=False, recv=False):
    """triangles -> object. Receivers (the copies that get baked) are opaque, wound to face their normals, lifted 0.03 yd
    off the surface and invisible to every ray, so they measure the light without shading themselves; the leaf
    cut-out corners (transparent) would otherwise bake black."""
    P = gb(A[:, :3]); Nn = gb(A[:, 3:6]); Nn /= np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-6)
    n = len(P); nt = n // 3; idx = np.arange(n).reshape(nt, 3)
    if recv:
        fn = np.cross(P[idx[:, 1]] - P[idx[:, 0]], P[idx[:, 2]] - P[idx[:, 0]])
        flip = (fn * Nn[idx].sum(1)).sum(1) < 0
        idx[flip] = idx[flip][:, [0, 2, 1]]
        P = P + Nn * .03
    order = idx.ravel()
    me = bpy.data.meshes.new(name)
    me.vertices.add(n); me.vertices.foreach_set('co', P.astype(np.float32).ravel())
    me.loops.add(n); me.loops.foreach_set('vertex_index', order.astype(np.int32))
    me.polygons.add(nt); me.polygons.foreach_set('loop_start', np.arange(0, n, 3, dtype=np.int32))
    if uv:
        ul = me.uv_layers.new(name='UVMap'); ul.data.foreach_set('uv', np.stack([A[order, 9], 1 - A[order, 10]], 1).astype(np.float32).ravel())
    me.update(); me.validate(clean_customdata=False)
    for p in me.polygons: p.use_smooth = True
    me.normals_split_custom_set([tuple(v) for v in Nn[order]])
    me.materials.append(m)
    o = bpy.data.objects.new(name, me); COLL.objects.link(o)
    if recv:
        me.color_attributes.new('ao', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = me.color_attributes['ao']
        for f in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
            if hasattr(o, f): setattr(o, f, False)
    o['order'] = 0
    return o, order

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
    kinds = [k for k in ('bark', 'mass', 'leaf') if len(D['%s|%s' % (key, k)])]
    occ_objs = [obj('o_%s_%s' % (key, k), D['%s|%s' % (key, k)], {'bark': MB, 'mass': MM, 'leaf': ML}[k], uv=(k == 'leaf'))[0] for k in kinds]
    rec = {k: obj('r_%s_%s' % (key, k), D['%s|%s' % (key, k)], MR, recv=True) for k in kinds}
    bpy.ops.object.select_all(action='DESELECT')
    for o, _ in rec.values(): o.select_set(True)
    bpy.context.view_layer.objects.active = list(rec.values())[0][0]
    t = time.time()
    MODE = os.environ.get('TREE_MODE', 'DIFFUSE')
    if MODE == 'AO': bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    else: bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS')
    for k, (o, order) in rec.items():
        A = D['%s|%s' % (key, k)]; n = len(A)
        c = np.empty(n * 4, np.float32); o.data.color_attributes['ao'].data.foreach_get('color', c)
        occ = np.empty(n, np.float32); occ[order] = c.reshape(n, 4)[:, 0]     # loop i holds vertex order[i]
        lo, hi = {'leaf': (.5, .68), 'mass': (.45, .55), 'bark': (.42, .7)}[k]
        f = np.clip(lo + hi * occ, 0, 1.25)
        out['%s|%s' % (key, k)] = np.clip(A[:, 6:9] * f[:, None], 0, 1).astype(np.float32)
        log(key, k, 'light mean %.2f p10 %.2f p90 %.2f' % (occ.mean(), np.percentile(occ, 10), np.percentile(occ, 90)))
    log(key, 'baked', round(time.time() - t, 1), 's')
    objs = {**{('o%d' % i): o for i, o in enumerate(occ_objs)}, **{k: o for k, (o, _) in rec.items()}}
    for o in objs.values(): bpy.data.objects.remove(o)
np.savez_compressed(os.path.join(OUT, 'trees_col.npz'), **out)
log('done', round(time.time() - T0), 's')
open(os.path.join(OUT, 'trees_log.txt'), 'w').write('\n'.join(LOG))
