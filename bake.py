"""Bake a hole's light in Cycles:  blender -b --factory-startup -P bake.py -- hole10.npz atlas.png outdir [px_per_yd]

Input: the hole exported from the game (terrain height grid, tree prototypes + instance matrices, far trees, static scenery
triangles, sun direction), all in the game's hole-local frame (x, y up, z).  Blender frame: X = x, Y = -z, Z = y.
Output: light.png over the hole bounds (R = sun visibility with soft penumbra and leaf transparency, G = sky light incl. one
bounce, normalised so open flat ground = 1), previews, log.  PNG row 0 = the bounds' minimum z (matches the game's flipY=false).
"""
import bpy, bmesh, sys, os, time, math
import numpy as np
from mathutils import Matrix, Vector

T0 = time.time()
a = sys.argv[sys.argv.index('--') + 1:]
NPZ, ATLAS, OUT = a[0], a[1], a[2]
PX = float(a[3]) if len(a) > 3 else 3.0
os.makedirs(OUT, exist_ok=True)
LOG = []
def log(*x):
    s = ' '.join(str(v) for v in x); LOG.append(s); print('[bake]', s, flush=True)

D = np.load(NPZ)
bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene; COLL = SC.collection
C3 = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], dtype=np.float64)    # game -> Blender
def gb(P): return (np.asarray(P, dtype=np.float64) @ C3.T).astype(np.float32)

def mesh_tris(name, P, uv=None):
    """non-indexed triangles (game coords) -> mesh"""
    P = gb(P); n = len(P); nt = n // 3
    me = bpy.data.meshes.new(name)
    me.vertices.add(n); me.vertices.foreach_set('co', P.ravel())
    me.loops.add(n); me.loops.foreach_set('vertex_index', np.arange(n, dtype=np.int32))
    me.polygons.add(nt); me.polygons.foreach_set('loop_start', np.arange(0, n, 3, dtype=np.int32))
    try: me.polygons.foreach_set('loop_total', np.full(nt, 3, np.int32))
    except Exception: pass
    if uv is not None:
        ul = me.uv_layers.new(name='UVMap'); ul.data.foreach_set('uv', np.asarray(uv, dtype=np.float32).ravel())
    me.update(); me.validate()
    return me

def mat(name, col, alpha_img=None, alpha_from_uv=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = .9
    if alpha_img is not None:
        tx = m.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = alpha_img; tx.interpolation = 'Linear'
        # the game's leaves use alphaTest 0.5: hard cut-outs
        mth = m.node_tree.nodes.new('ShaderNodeMath'); mth.operation = 'GREATER_THAN'; mth.inputs[1].default_value = .5
        m.node_tree.links.new(tx.outputs['Alpha'], mth.inputs[0]); m.node_tree.links.new(mth.outputs[0], b.inputs['Alpha'])
    return m

# ------------------------------------------------------------- terrain (the receiver)
nx, ny, st, x0, y0 = D['hg_meta']; nx, ny = int(nx), int(ny)
HG = D['hg']; B = D['bounds']; W, H = B[2] - B[0], B[3] - B[1]
ii, jj = np.meshgrid(np.arange(nx), np.arange(ny))
gx = x0 + ii * st; gz = y0 + jj * st
P = np.stack([gx.ravel(), HG.ravel(), gz.ravel()], 1)
me = bpy.data.meshes.new('terrain')
q = [((j + 1) * nx + i, (j + 1) * nx + i + 1, j * nx + i + 1, j * nx + i) for j in range(ny - 1) for i in range(nx - 1)]   # wound so the normals face up (Blender Y = -z)
me.from_pydata([tuple(v) for v in gb(P)], [], q); me.update()
ul = me.uv_layers.new(name='UVMap')
lv = np.zeros(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
U = (P[lv, 0] - B[0]) / W; V = 1 - (P[lv, 2] - B[1]) / H
ul.data.foreach_set('uv', np.stack([U, V], 1).astype(np.float32).ravel())
TER = bpy.data.objects.new('terrain', me); COLL.objects.link(TER)
for p in me.polygons: p.use_smooth = True
IW, IH = int(round(W * PX)), int(round(H * PX))
img = bpy.data.images.new('bake', IW, IH, float_buffer=True)
tm = mat('ground', (.3, .3, .3))
tn = tm.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = img; tm.node_tree.nodes.active = tn
me.materials.append(tm)
log('terrain', nx, ny, 'image', IW, IH, 'yd', W, H)

# ------------------------------------------------------------- trees: prototypes + instances
atlas = bpy.data.images.load(os.path.abspath(ATLAS)); atlas.alpha_mode = 'STRAIGHT'
mBark = mat('bark', (.18, .14, .1)); mMass = mat('mass', (.12, .16, .08)); mLeaf = mat('leaf', (.14, .2, .09), alpha_img=atlas)
protos = []
for i in range(int(D['nproto'][0])):
    bk, ms, lf = D['p%d_bark' % i], D['p%d_mass' % i], D['p%d_leaf' % i]
    solid = mesh_tris('ps%d' % i, np.concatenate([bk[:, :3], ms[:, :3]]))
    solid.materials.append(mBark)
    if len(lf):
        lme = mesh_tris('pl%d' % i, lf[:, :3], uv=np.stack([lf[:, 9], 1 - lf[:, 10]], 1)); lme.materials.append(mLeaf)
        protos.append((solid, lme))
    else: protos.append((solid,))
C4 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))); C4i = C4.inverted()
for k, (pi, m16) in enumerate(zip(D['inst_p'], D['inst_M'])):
    Mg = Matrix(np.asarray(m16, dtype=np.float64).reshape(4, 4).T.tolist())
    Mb = C4 @ Mg @ C4i
    for me_ in protos[pi]:
        o = bpy.data.objects.new('t%d' % k, me_); o.matrix_world = Mb; COLL.objects.link(o)
log('trees', len(D['inst_p']), 'protos', len(protos))
# far trees (impostors in the game): crowns as ellipsoids / cones with a trunk
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1); sph = bpy.data.meshes.new('sph'); bm.to_mesh(sph); bm.free()
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=1, radius2=0, depth=1); cone = bpy.data.meshes.new('cone'); bm.to_mesh(cone); bm.free()
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=1, radius2=1, depth=1); cyl = bpy.data.meshes.new('cyl'); bm.to_mesh(cyl); bm.free()
for m_ in (sph, cone): m_.materials.append(mMass)
cyl.materials.append(mBark)
for x, z, r, gh, con in D['far']:
    if con:
        o = bpy.data.objects.new('fc', cone); o.location = gb([[x, gh + 1.6 + r * 1.05, z]])[0]; o.scale = (r * .62, r * .62, r * 2.1)
    else:
        o = bpy.data.objects.new('fs', sph); o.location = gb([[x, gh + 3.3 + r * .5, z]])[0]; o.scale = (r * .85, r * .85, r * .55)
    COLL.objects.link(o)
    t = bpy.data.objects.new('ft', cyl); t.location = gb([[x, gh + 1.8, z]])[0]; t.scale = (.45, .45, 3.6); COLL.objects.link(t)
log('far trees', len(D['far']))
# static scenery (buildings incl. the Blender clubhouse, houses, structures, shrubs)
O = D['out']; O = O[:len(O) // 3 * 3]
sm = mesh_tris('scenery', O); sm.materials.append(mat('scen', (.35, .33, .3)))
so = bpy.data.objects.new('scenery', sm); COLL.objects.link(so)
log('scenery tris', len(O) // 3)

# ------------------------------------------------------------- lights and bake settings
sun = D['sun']; sb = Vector(gb([sun])[0]).normalized()
ld = bpy.data.lights.new('sun', 'SUN'); ld.angle = math.radians(1.2); ld.energy = 3
lo = bpy.data.objects.new('sun', ld); COLL.objects.link(lo); lo.rotation_euler = (-sb).to_track_quat('-Z', 'Y').to_euler()
world = bpy.data.worlds.new('w'); SC.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 0.0
SC.render.engine = 'CYCLES'; SC.cycles.device = 'CPU'
SC.cycles.transparent_max_bounces = 32; SC.cycles.max_bounces = 4; SC.cycles.diffuse_bounces = 2
SC.render.bake.margin = 4; SC.render.bake.target = 'IMAGE_TEXTURES'
for o in bpy.context.view_layer.objects: o.select_set(False)
TER.select_set(True); bpy.context.view_layer.objects.active = TER

def grab():
    a = np.empty(IW * IH * 4, np.float32); img.pixels.foreach_get(a); return a.reshape(IH, IW, 4)[:, :, 0].copy()

ONLY = os.environ.get('BAKE_ONLY', '')
SC.cycles.samples = int(os.environ.get('SH_SAMPLES', 96))
if ONLY != 'sky':
    t = time.time(); bpy.ops.object.bake(type='SHADOW', use_clear=True); SH = grab(); log('shadow bake', round(time.time() - t), 's', 'mean', float(SH.mean()))
else: SH = None
# sky: the sun off, a white sky; diffuse light (direct + one bounce) without the albedo
ld.energy = 0; lo.hide_render = True; bg.inputs['Strength'].default_value = 1.0
SC.cycles.samples = int(os.environ.get('SKY_SAMPLES', 48))
SC.render.bake.use_pass_direct = True; SC.render.bake.use_pass_indirect = True; SC.render.bake.use_pass_color = False
if ONLY != 'sun':
    t = time.time(); bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True); SKY = grab(); log('sky bake', round(time.time() - t), 's', 'mean', float(SKY.mean()), 'p95', float(np.percentile(SKY, 95)))
else: SKY = None
np.savez_compressed(os.path.join(OUT, 'raw_%s.npz' % (ONLY or 'both')), **({'sun': SH} if SH is not None else {}), **({'sky': SKY} if SKY is not None else {}))
if SH is None or SKY is None:
    open(os.path.join(OUT, 'log.txt'), 'w').write('\n'.join(LOG)); sys.exit(0)

# ------------------------------------------------------------- denoise (separable blur) and write
def blur(a, s):
    r = int(math.ceil(s * 3)); k = np.exp(-(np.arange(-r, r + 1) ** 2) / (2 * s * s)); k /= k.sum()
    p = np.pad(a, r, mode='edge')
    a = sum(k[i] * p[i:i + a.shape[0], r:r + a.shape[1]] for i in range(2 * r + 1))
    p = np.pad(a, r, mode='edge')
    return sum(k[i] * p[r:r + a.shape[0], i:i + a.shape[1]] for i in range(2 * r + 1))
SHb = np.clip(blur(SH, float(os.environ.get('SH_BLUR', .8))), 0, 1)
ref = float(np.percentile(SKY, 97))      # open ground; small bumps above that clip at 1
SKb = np.clip(blur(SKY, float(os.environ.get('SKY_BLUR', 2.0))) / max(ref, 1e-3), 0, 1)
out = bpy.data.images.new('light', IW, IH, alpha=False)
px = np.ones((IH, IW, 4), np.float32); px[:, :, 0] = SHb; px[:, :, 1] = SKb; px[:, :, 2] = 0
out.pixels.foreach_set(px.ravel()); out.filepath_raw = os.path.join(OUT, 'light.png'); out.file_format = 'PNG'; out.save()
for nm, ch in (('prev_sun', SHb), ('prev_sky', SKb)):
    pv = bpy.data.images.new(nm, IW, IH); q = np.ones((IH, IW, 4), np.float32); q[:, :, 0] = q[:, :, 1] = q[:, :, 2] = ch
    pv.pixels.foreach_set(q.ravel()); pv.filepath_raw = os.path.join(OUT, nm + '.png'); pv.file_format = 'PNG'; pv.save()
log('sky ref', ref, 'done', round(time.time() - T0), 's')
open(os.path.join(OUT, 'log.txt'), 'w').write('\n'.join(LOG))
