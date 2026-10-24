"""Bake sky light (ambient occlusion with one bounce) into a game clubhouse's vertex colours.
  blender -b --factory-startup -P club_bake.py -- in.npz out.npz
Receivers are copies lifted 0.02 yd along each triangle's normal and invisible to rays, so coplanar walls and the
game's stacked trims don't shade themselves; occluders are the clubhouse and the ground round it.
Final colour = base x (0.38 + 0.66 x light / open-ground light for that facing), so walls aren't darkened just for
being upright, only where porches, eaves, wings and plantings hide the sky.
"""
import bpy, bmesh, sys, os, time, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; SRC, DST = a[0], a[1]
D = np.load(SRC); T = D['tris'].astype(np.float64)        # (n,3,9) game frame (x, y up, z), re-centred
bpy.ops.wm.read_factory_settings(use_empty=True); SC = bpy.context.scene; COLL = SC.collection
C3 = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], np.float64)
def gb(P): return np.asarray(P) @ C3.T
def mat(name, col):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = .9; return m
def mesh(name, P, Nn=None, recv=False, m=None):
    P = gb(P.reshape(-1, 3)); n = len(P); nt = n // 3
    if recv:
        fn = np.cross(P[1::3] - P[0::3], P[2::3] - P[0::3]); fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-9)
        P = P + np.repeat(fn, 3, 0) * .02
    me = bpy.data.meshes.new(name); me.vertices.add(n); me.vertices.foreach_set('co', P.astype(np.float32).ravel())
    me.loops.add(n); me.loops.foreach_set('vertex_index', np.arange(n, dtype=np.int32))
    me.polygons.add(nt); me.polygons.foreach_set('loop_start', np.arange(0, n, 3, dtype=np.int32))
    me.update(); me.validate(clean_customdata=False)
    if m: me.materials.append(m)
    o = bpy.data.objects.new(name, me); COLL.objects.link(o)
    if recv:
        me.color_attributes.new('ao', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = me.color_attributes['ao']
        for f in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
            if hasattr(o, f): setattr(o, f, False)
    return o
mesh('club', T[:, :, :3], m=mat('c', (.55, .53, .5)))
# ground (1 yd grid)
G = D['ground']; R = float(D['R'][0]); nG = G.shape[0]; xs = np.linspace(-R, R, nG)
X, Z = np.meshgrid(xs, xs); Pg = np.stack([X.ravel(), G.ravel() - .05, Z.ravel()], 1)
bm = bmesh.new(); vs = [bm.verts.new(tuple(p)) for p in gb(Pg)]
for j in range(nG - 1):
    for i in range(nG - 1):
        k = j * nG + i; bm.faces.new([vs[k + nG], vs[k + nG + 1], vs[k + 1], vs[k]])
gm = bpy.data.meshes.new('ground'); bm.to_mesh(gm); bm.free(); gm.materials.append(mat('g', (.25, .3, .18)))
COLL.objects.link(bpy.data.objects.new('ground', gm))
rec = mesh('recv', T[:, :, :3], recv=True, m=mat('r', (.8, .8, .8)))
w = bpy.data.worlds.new('w'); SC.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
SC.render.engine = 'CYCLES'; SC.cycles.device = 'CPU'; SC.cycles.samples = int(os.environ.get('SAMPLES', 64)); SC.cycles.max_bounces = 3; SC.cycles.diffuse_bounces = 1
SC.render.bake.target = 'VERTEX_COLORS'; SC.render.bake.use_pass_direct = True; SC.render.bake.use_pass_indirect = True; SC.render.bake.use_pass_color = False
bpy.ops.object.select_all(action='DESELECT'); rec.select_set(True); bpy.context.view_layer.objects.active = rec
t = time.time(); bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS')
n = len(T) * 3; c = np.empty(n * 4, np.float32); rec.data.color_attributes['ao'].data.foreach_get('color', c); occ = c.reshape(n, 4)[:, 0].reshape(-1, 3)
fn = np.cross(T[:, 1, :3] - T[:, 0, :3], T[:, 2, :3] - T[:, 0, :3]); fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-9)
ny = fn[:, 1:2]; ref = .5 * (1 + ny) + .25 * .5 * (1 - ny)            # open ground: sky above + a little bounce from below
ratio = np.clip(occ / np.maximum(ref, .2), 0, 1.05)
f = .38 + .66 * ratio
col = np.clip(T[:, :, 6:9] * f[:, :, None], 0, 1)
np.savez_compressed(DST, tris=T[:, :, :6].astype(np.float32), col=col.astype(np.float32), off=D['off'], offc=D['offc'])
print('[club] baked', len(T), 'tris in', round(time.time() - t, 1), 's; light mean %.2f, ratio mean %.2f' % (occ.mean(), ratio.mean()), flush=True)
