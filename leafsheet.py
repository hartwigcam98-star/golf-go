"""Leaf sprays modelled and rendered in Blender, composited into the game's 4x4 leaf atlas (2048 px, 512 px cells).

  blender -b --factory-startup -P leafsheet.py -- old_atlas.png outdir

Cells replaced: 0 bur oak, 1 oak, 2 maple, 4 cottonwood (also aspen), 8 birch. Each cell: a spray of twigs radiating from the
centre with real leaf outlines (lobed, palmate, deltoid, serrated), folded along the midrib and curled, lit by a sun + sky,
rendered top-down orthographic with a transparent film. Colours are matched afterwards to the old cell's average (the game tints
the atlas by each card's vertex colour, so the sheet must stay pale yellow-green like the old one).
"""
import bpy, bmesh, sys, os, math, random
import numpy as np
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index('--') + 1:]
OLD, OUT = a[0], a[1]
os.makedirs(OUT, exist_ok=True)
CELLS = os.environ.get('CELLS', '0,1,2,4,8')
CELLS = [int(c) for c in CELLS.split(',')]

def outline(kind, R):
    """leaf outline: list of (x, y) with the base at (0,0) and the tip at (0,1); right side then left side"""
    N = 80
    ts = np.linspace(0, 1, N)
    if kind == 'maple':
        pts = []
        for th in np.linspace(-math.pi * .95, math.pi * .95, 160):
            # five pointed lobes, angle from the leaf axis (up)
            lob = abs(math.cos(2.5 * th)) ** .9
            r = .45 + .55 * lob
            r *= 1 + .05 * math.sin(th * 23 + R.random())  # teeth
            if abs(th) > 2.3: r *= .55                       # short lower lobes
            pts.append((math.sin(th) * r * .5, .42 + math.cos(th) * r * .5))
        pts = [(0, 0)] + pts[len(pts) // 2:] + pts[:len(pts) // 2]
        return pts, 'polar'
    def w(t):
        if kind == 'oak':
            env = .5 * t ** .55 * (1 - t) ** .45 * 1.45
            n = 4.5; d = .55
            return env * (1 - d * math.sin(math.pi * n * t) ** 2)
        if kind == 'bur':
            env = .62 * t ** .9 * (1 - t) ** .3 * 1.4
            d = .8 if .25 < t < .62 else .35
            return env * (1 - d * math.sin(math.pi * 5 * t) ** 2) + (.05 if t > .6 else 0) * (1 - t)
        if kind == 'cotton':
            base = min(1, t * 7) ** .6
            env = .55 * base * (1 - t) ** .95
            return env * (1 + .05 * math.sin(2 * math.pi * 18 * t))
        if kind == 'birch':
            env = .36 * math.sin(math.pi * min(1, t ** .8)) ** .85
            return env * (1 + .07 * ((t * 22) % 1))
        return .3 * math.sin(math.pi * t)
    right = [(w(t), t) for t in ts]
    return right, 'side'

def leaf_mesh(bm, kind, R, M, col_layer, col):
    """add one leaf to bm, placed by matrix M (leaf local: base at origin, tip +Y, length 1)"""
    pts, mode = outline(kind, R)
    fold = R.uniform(.06, .16); curl = R.uniform(-.12, .18)
    def P(x, y):
        z = fold * abs(x) + curl * (y - .5) ** 2 - curl * .25
        return M @ Vector((x, y, z))
    faces = []
    if mode == 'side':
        rib = [(0, t) for t in np.linspace(0, 1, len(pts))[1:-1]]
        for s in (1, -1):
            loop = [P(s * x, y) for x, y in pts] + [P(0, y) for _, y in reversed(rib)]
            vs = [bm.verts.new(p) for p in loop]
            try: faces.append(bm.faces.new(vs))
            except ValueError: pass
    else:
        cen = P(0, .42)
        vs = [bm.verts.new(P(x, y)) for x, y in pts]
        c = bm.verts.new(cen)
        for i in range(len(vs)):
            faces.append(bm.faces.new([c, vs[i], vs[(i + 1) % len(vs)]]))
    res = bmesh.ops.triangulate(bm, faces=faces, quad_method='BEAUTY', ngon_method='EAR_CLIP')
    for f in res['faces']:
        f.normal_update()
        if f.normal.z < 0: f.normal_flip()
        for l in f.loops:
            # a little darker toward the base and along the midrib
            l[col_layer] = col

SPEC = {
    0: dict(kind='bur', n=22, size=(.44, .58), twigs=6, col=(.16, .3, .08)),
    1: dict(kind='oak', n=26, size=(.36, .48), twigs=6, col=(.18, .33, .09)),
    2: dict(kind='maple', n=30, size=(.46, .6), twigs=6, col=(.2, .36, .08)),
    4: dict(kind='cotton', n=40, size=(.34, .44), twigs=7, col=(.22, .36, .09)),
    8: dict(kind='birch', n=84, size=(.18, .26), twigs=8, col=(.24, .38, .1)),
}

def build_spray(cell):
    S = SPEC[cell]; R = random.Random(1000 + cell)
    for o in list(bpy.data.objects):
        if o.name.startswith('spray'): bpy.data.objects.remove(o)
    bm = bmesh.new(); cl = bm.loops.layers.float_color.new('Col')
    twig_pts = []
    # twigs radiating from the centre, slightly curved
    for k in range(S['twigs']):
        a0 = k / S['twigs'] * 2 * math.pi + R.uniform(-.25, .25)
        L = R.uniform(.7, .95)
        pts = []
        for i in range(12):
            t = i / 11; a = a0 + .25 * math.sin(t * 2 + k)
            pts.append(Vector((math.cos(a) * L * t, math.sin(a) * L * t, .02 - .05 * t)))
        twig_pts.append(pts)
    # twig geometry: thin quads seen from above
    bark = (.32, .24, .16, 1)
    for pts in twig_pts:
        for i in range(len(pts) - 1):
            d = (pts[i + 1] - pts[i]).normalized(); n = Vector((-d.y, d.x, 0)) * (.012 * (1 - i / 12) + .004)
            q = [pts[i] - n, pts[i] + n, pts[i + 1] + n * .8, pts[i + 1] - n * .8]
            f = bm.faces.new([bm.verts.new(p) for p in q])
            for l in f.loops: l[cl] = bark
    # leaves along the twigs, alternate sides, pointing outward
    n = S['n']; per = max(2, n // S['twigs'])
    for pts in twig_pts:
        for j in range(per):
            t = .15 + .85 * (j + R.random() * .5) / per
            i = min(10, int(t * 11)); p = pts[i]; d = (pts[i + 1] - pts[i]).normalized()
            side = 1 if j % 2 else -1
            ang = math.atan2(d.y, d.x) - math.pi / 2 + side * R.uniform(.5, 1.1)
            size = R.uniform(*S['size']) * (.75 + .25 * t)
            tilt = R.uniform(-.35, .45); roll = R.uniform(-.4, .4)
            M = Matrix.Translation(p + Vector((0, 0, R.uniform(0, .05)))) @ Matrix.Rotation(ang, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'X') @ Matrix.Rotation(roll, 4, 'Y') @ Matrix.Scale(size, 4)
            v = R.uniform(.7, 1.25); h = R.uniform(-.05, .07)
            c = S['col']; col = (max(0, c[0] * v + h), c[1] * v, max(0, c[2] * v - h * .5), 1)
            leaf_mesh(bm, S['kind'], R, M, cl, col)
    # a tuft at the centre
    for j in range(per):
        ang = R.uniform(0, 2 * math.pi); size = R.uniform(*S['size']) * .8
        M = Matrix.Translation(Vector((0, 0, .06))) @ Matrix.Rotation(ang, 4, 'Z') @ Matrix.Rotation(R.uniform(-.3, .3), 4, 'X') @ Matrix.Scale(size, 4)
        c = S['col']; v = R.uniform(.9, 1.15); leaf_mesh(bm, S['kind'], R, M, cl, (c[0] * v, c[1] * v, c[2] * v, 1))
    me = bpy.data.meshes.new('spray'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('spray', me); bpy.context.scene.collection.objects.link(ob)
    mat = bpy.data.materials.get('leafm') or make_mat(); me.materials.append(mat)
    return ob

def make_mat():
    m = bpy.data.materials.new('leafm'); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; att = nt.nodes.new('ShaderNodeVertexColor'); att.layer_name = 'Col'
    nt.links.new(att.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = .5
    try: b.inputs['Specular IOR Level'].default_value = .35
    except KeyError: pass
    try:
        b.inputs['Subsurface Weight'].default_value = 0
    except KeyError: pass
    # some light through the leaves
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent'); nt.links.new(att.outputs['Color'], tr.inputs['Color'])
    mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = .18
    out = nt.nodes['Material Output']
    nt.links.new(b.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m

bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
SC.render.engine = 'CYCLES'; SC.cycles.samples = 48; SC.cycles.use_denoising = True
SC.render.film_transparent = True; SC.render.resolution_x = SC.render.resolution_y = 512
SC.view_settings.view_transform = 'Standard'
SC.render.image_settings.file_format = 'PNG'; SC.render.image_settings.color_mode = 'RGBA'
w = bpy.data.worlds.new('w'); SC.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (.7, .8, 1, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = .45
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = .1
so = bpy.data.objects.new('sun', sun); SC.collection.objects.link(so); so.rotation_euler = (math.radians(35), math.radians(-20), 0)
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2.08
co = bpy.data.objects.new('cam', cam); SC.collection.objects.link(co); co.location = (0, 0, 5); SC.camera = co

old = bpy.data.images.load(os.path.abspath(OLD))
W = old.size[0]; A = np.empty(W * W * 4, np.float32); old.pixels.foreach_get(A); A = A.reshape(W, W, 4)   # row 0 = bottom
C = W // 4
for cell in CELLS:
    build_spray(cell)
    fp = os.path.join(OUT, 'cell%d.png' % cell); SC.render.filepath = fp
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(fp); px = np.empty(C * C * 4, np.float32); im.pixels.foreach_get(px); px = px.reshape(C, C, 4)
    # match the old cell's mean colour where opaque (the game tints the sheet per card)
    r, q = cell // 4, cell % 4
    oc = A[W - (r + 1) * C:W - r * C, q * C:(q + 1) * C]          # old cell (image rows bottom-up)
    m_old = oc[..., 3] > .5; m_new = px[..., 3] > .5
    k = oc[..., :3][m_old].mean(0) / np.maximum(px[..., :3][m_new].mean(0), 1e-3)
    px[..., :3] = np.clip(px[..., :3] * k, 0, 1)
    A[W - (r + 1) * C:W - r * C, q * C:(q + 1) * C] = px
    print('[leaf] cell', cell, 'cover old %.2f new %.2f' % (m_old.mean(), m_new.mean()), 'gain', np.round(k, 2), flush=True)
out = bpy.data.images.new('atlas', W, W, alpha=True); out.pixels.foreach_set(A.ravel())
out.filepath_raw = os.path.join(OUT, 'leaves.png'); out.file_format = 'PNG'; out.save()
print('[leaf] done', flush=True)
