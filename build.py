"""Clubhouse builder (Blender 4.2, background):  blender -b --factory-startup -P build.py -- spec.json outdir

Builds a detailed clubhouse from the survey blocks (same format as CLUBLID / pipeline/clubs/models/<id>/final.json)
plus photo-based annotations in the spec (dormers, doors, rooftop units, colours, window rules).

Frame: u along the building (yd), v 90 deg clockwise from u (yd), heights in yd above the reference ground.
Blender coordinates: X=u, Y=-v, Z=height.  glTF/tris.json coordinates: (u, height, v).

Outputs in outdir: <id>.glb, tris.json (triangles + sRGB vertex colours for the game), renders r_*.png, stats.json
"""
import bpy, bmesh, json, math, sys, os, time
from mathutils import Vector

T0 = time.time()
args = sys.argv[sys.argv.index('--') + 1:]
SPEC = json.load(open(args[0]))
OUT = args[1]
os.makedirs(OUT, exist_ok=True)
LOG = []
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.append(s); print('[club]', s, flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
COLL = SC.collection
BL = SPEC['blocks']
KIND = {int(k): v for k, v in SPEC.get('kinds', {}).items()}

def P(u, v, z): return Vector((u, -v, z))
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c] + [1.0]
COL = {k: lin(v) for k, v in SPEC['colors'].items()}

# ---------------------------------------------------------------- roof solids
def roof_pts(b, ge, gr, dz, zb):
    t, u0, u1, v0, v1, e, p, cap = b[:8]
    W, D = u1 - u0, v1 - v0
    rect = lambda U0, U1, V0, V1: [(U0, V0), (U1, V0), (U0, V1), (U1, V1)]
    if t == 'H':
        d = max(0, min((cap - e) / p if p > 1e-6 else 0, min(W, D) / 2))
        R = rect(u0 - ge, u1 + ge, v0 - ge, v1 + ge); E = e - p * ge
        top = rect(u0 + d, u1 - d, v0 + d, v1 - d); zt = e + p * d
    elif t == 'GU':
        d = max(0, min((cap - e) / p, D / 2))
        R = rect(u0 - gr, u1 + gr, v0 - ge, v1 + ge); E = e - p * ge
        top = rect(u0 - gr, u1 + gr, v0 + d, v1 - d); zt = e + p * d
    elif t == 'GV':
        d = max(0, min((cap - e) / p, W / 2))
        R = rect(u0 - ge, u1 + ge, v0 - gr, v1 + gr); E = e - p * ge
        top = rect(u0 + d, u1 - d, v0 - gr, v1 + gr); zt = e + p * d
    elif t in ('SU', 'SV'):
        lo, hi = min(e, cap), max(e, cap)
        L = W if t == 'SU' else D
        z0 = e - p * ge; z1 = min(max(e + p * L, lo), hi) + p * ge
        if t == 'SU':
            R = rect(u0 - ge, u1 + ge, v0 - gr, v1 + gr)
            pts = [(x, y, zb) for x, y in R] + [(u0 - ge, v0 - gr, z0 + dz), (u0 - ge, v1 + gr, z0 + dz), (u1 + ge, v0 - gr, z1 + dz), (u1 + ge, v1 + gr, z1 + dz)]
        else:
            R = rect(u0 - gr, u1 + gr, v0 - ge, v1 + ge)
            pts = [(x, y, zb) for x, y in R] + [(u0 - gr, v0 - ge, z0 + dz), (u1 + gr, v0 - ge, z0 + dz), (u0 - gr, v1 + ge, z1 + dz), (u1 + gr, v1 + ge, z1 + dz)]
        return pts
    else:  # F / T: flat
        R = rect(u0 - ge, u1 + ge, v0 - ge, v1 + ge)
        return [(x, y, zb) for x, y in R] + [(x, y, e + dz) for x, y in R]
    return [(x, y, zb) for x, y in R] + [(x, y, E + dz) for x, y in R] + [(x, y, zt + dz) for x, y in top]

def eave_low(b, ge):
    t, u0, u1, v0, v1, e, p, cap = b[:8]
    if t in ('SU', 'SV'): return min(e, cap) - abs(p) * ge
    return e - p * ge

def mk(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); COLL.objects.link(ob); return ob

def hull(name, pts):
    seen = set(); bm = bmesh.new()
    for p in pts:
        k = tuple(round(x, 5) for x in p)
        if k in seen: continue
        seen.add(k); bm.verts.new(P(*p))
    r = bmesh.ops.convex_hull(bm, input=bm.verts[:], use_existing_faces=False)
    junk = [g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)]
    if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
    bmesh.ops.dissolve_limit(bm, angle_limit=1e-4, verts=bm.verts[:], edges=bm.edges[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return mk(name, bm)

def boolean(base, other, op):
    m = base.modifiers.new('b', 'BOOLEAN'); m.operation = op; m.solver = 'EXACT'; m.object = other
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(base.evaluated_get(dg))
    base.modifiers.clear(); old = base.data; base.data = me; bpy.data.meshes.remove(old)
    bpy.data.objects.remove(other)
    return base

OV = SPEC.get('overhang', .45); RK = SPEC.get('rake', .25)
enclosed = [i for i, b in enumerate(BL) if b[0] != 'T' and not (len(b) > 8 and 'o' in b[8])]
openb = [i for i, b in enumerate(BL) if b[0] != 'T' and len(b) > 8 and 'o' in b[8]]
towers = [i for i, b in enumerate(BL) if b[0] == 'T']
log('blocks', len(BL), 'enclosed', enclosed, 'open', openb, 'towers', towers)

# bodies (walls), unioned
bodies = [hull('body%d' % i, roof_pts(BL[i], 0, 0, 0, -1.2)) for i in enclosed]
BODY = bodies[0]
for o in bodies[1:]: BODY = boolean(BODY, o, 'UNION')
# roof slabs: outer shell minus a cutter 0.34 yd lower
slabs = []
for i in enclosed + openb:
    b = BL[i]
    ge, gr = (OV, RK)
    if b[0] in ('SU', 'SV'): ge, gr = .3, .2
    zb = eave_low(b, ge) - .36
    outer = hull('slab%d' % i, roof_pts(b, ge, gr, .04, zb))
    inner = hull('cut%d' % i, roof_pts(b, ge + .08, gr + .08, -.30, zb - 4))
    slabs.append(boolean(outer, inner, 'DIFFERENCE'))
ROOF = slabs[0]
for o in slabs[1:]: ROOF = boolean(ROOF, o, 'UNION')
log('booleans done', round(time.time() - T0, 1), 's')

# ---------------------------------------------------------------- footprint tests
def inside(i, u, v, pad=0.0):
    b = BL[i]; return b[1] - pad < u < b[2] + pad and b[3] - pad < v < b[4] + pad
def rh(i, u, v):
    """roof height of block i at (u,v) (no overhang), -1e9 outside"""
    t, u0, u1, v0, v1, e, p, cap = BL[i][:8]
    if not (u0 - 1e-6 <= u <= u1 + 1e-6 and v0 - 1e-6 <= v <= v1 + 1e-6): return -1e9
    du, dv = min(u - u0, u1 - u), min(v - v0, v1 - v)
    if t == 'H': y = e + p * min(du, dv)
    elif t == 'GU': y = e + p * dv
    elif t == 'GV': y = e + p * du
    elif t == 'SU': y = e + p * (u - u0)
    elif t == 'SV': y = e + p * (v - v0)
    else: y = e
    if t in ('SU', 'SV'): return min(max(y, min(e, cap)), max(e, cap))
    return min(y, max(cap, e))

# sides: (block, name, fixed coord, outward sign, along-axis 'u' or 'v', t0, t1)
def sides(i):
    t, u0, u1, v0, v1 = BL[i][:5]
    return [(i, 'N', v0, -1, 'u', u0, u1), (i, 'S', v1, 1, 'u', u0, u1), (i, 'W', u0, -1, 'v', v0, v1), (i, 'E', u1, 1, 'v', v0, v1)]
def side_pt(sd, t, d):
    i, nm, c, s, ax, a, b = sd
    return (t, c + s * d) if ax == 'u' else (c + s * d, t)
def exterior_segments(sd, occ):
    i, nm, c, s, ax, a, b = sd
    segs = []; cur = None; N = max(2, int((b - a) / .1))
    for k in range(N + 1):
        t = a + (b - a) * k / N
        q = side_pt(sd, t, .15)
        ext = not any(inside(j, *q) for j in occ if j != i)
        if ext and cur is None: cur = t
        if not ext and cur is not None:
            if t - cur > .3: segs.append((cur, t))
            cur = None
    if cur is not None and b - cur > .3: segs.append((cur, b))
    return segs
def side_eave(sd):
    i, nm = sd[0], sd[1]; t, u0, u1, v0, v1, e, p, cap = BL[i][:8]
    if t in ('SU',): return e if nm == 'W' else (min(max(e + p * (u1 - u0), min(e, cap)), max(e, cap)) if nm == 'E' else min(e, cap))
    if t in ('SV',): return e if nm == 'N' else (min(max(e + p * (v1 - v0), min(e, cap)), max(e, cap)) if nm == 'S' else min(e, cap))
    return e
def is_eave_side(sd):
    t = BL[sd[0]][0]; nm = sd[1]
    if t == 'H' or t == 'F': return True
    if t == 'GU': return nm in 'NS'
    if t == 'GV': return nm in 'WE'
    if t == 'SU': return nm == 'E' if BL[sd[0]][6] < 0 else nm == 'W'
    return False

# ---------------------------------------------------------------- detail geometry (one bmesh with colours)
DB = bmesh.new()
BASE = DB.loops.layers.float_color.new('base')
def face(vs, want, col):
    f = DB.faces.new(vs); f.normal_update()
    if f.normal.dot(want) < 0: f.normal_flip()
    for l in f.loops: l[BASE] = col
    return f
def frame_of(sd):
    """local axes for a side: T along the wall, N outward (Blender vectors)"""
    i, nm, c, s, ax, a, b = sd
    if ax == 'u': return Vector((1, 0, 0)), Vector((0, -s, 0))  # v outward s -> Y = -v
    return Vector((0, -1, 0)), Vector((s, 0, 0))
def lbox(sd, t0, t1, z0, z1, d0, d1, col, back=False):
    i, nm, c, s, ax, a, b = sd
    def V(t, z, d):
        u, v = side_pt(sd, t, d); return DB.verts.new(P(u, v, z))
    Tv, Nv = frame_of(sd)
    v = {(ti, zi, di): V(tt, zz, dd) for ti, tt in enumerate((t0, t1)) for zi, zz in enumerate((z0, z1)) for di, dd in enumerate((d0, d1))}
    Z = Vector((0, 0, 1))
    face([v[0, 0, 1], v[1, 0, 1], v[1, 1, 1], v[0, 1, 1]], Nv, col)
    face([v[0, 1, 0], v[1, 1, 0], v[1, 1, 1], v[0, 1, 1]], Z, col)
    face([v[0, 0, 0], v[1, 0, 0], v[1, 0, 1], v[0, 0, 1]], -Z, col)
    face([v[0, 0, 0], v[0, 1, 0], v[0, 1, 1], v[0, 0, 1]], -Tv, col)
    face([v[1, 0, 0], v[1, 1, 0], v[1, 1, 1], v[1, 0, 1]], Tv, col)
    if back: face([v[0, 0, 0], v[1, 0, 0], v[1, 1, 0], v[0, 1, 0]], -Nv, col)
def wbox(u0, u1, v0, v1, z0, z1, col, bottom=False):
    vs = {}
    for a, u in enumerate((u0, u1)):
        for b, v in enumerate((v0, v1)):
            for c, z in enumerate((z0, z1)): vs[a, b, c] = DB.verts.new(P(u, v, z))
    X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    face([vs[0, 0, 1], vs[1, 0, 1], vs[1, 1, 1], vs[0, 1, 1]], Z, col)
    if bottom: face([vs[0, 0, 0], vs[1, 0, 0], vs[1, 1, 0], vs[0, 1, 0]], -Z, col)
    face([vs[0, 0, 0], vs[0, 1, 0], vs[0, 1, 1], vs[0, 0, 1]], -X, col)
    face([vs[1, 0, 0], vs[1, 1, 0], vs[1, 1, 1], vs[1, 0, 1]], X, col)
    face([vs[0, 0, 0], vs[1, 0, 0], vs[1, 0, 1], vs[0, 0, 1]], Y, col)   # v0 side -> Y=-v0 is the larger Y
    face([vs[0, 1, 0], vs[1, 1, 0], vs[1, 1, 1], vs[0, 1, 1]], -Y, col)

NWIN = [0]
def window(sd, tc, w, sill, head, cols, rows, door=False):
    """window or glazed door centred at tc on side sd, standing proud of the wall"""
    NWIN[0] += 1
    t0, t1 = tc - w / 2, tc + w / 2
    tr, gl, mu = COL['trim'], COL['glass'], COL['muntin']
    lbox(sd, t0, t1, sill, head, .0, .02, gl)                           # glass
    cw = .09
    lbox(sd, t0 - cw, t0, sill, head, 0, .06, tr)                      # casing
    lbox(sd, t1, t1 + cw, sill, head, 0, .06, tr)
    lbox(sd, t0 - cw - .03, t1 + cw + .03, head, head + .14, 0, .08, tr)  # head casing
    if not door: lbox(sd, t0 - cw - .02, t1 + cw + .02, sill - .07, sill, 0, .1, tr)  # sill
    for k in range(1, cols):
        tt = t0 + w * k / cols; lbox(sd, tt - .02, tt + .02, sill, head, .02, .04, mu)
    for k in range(1, rows):
        zz = sill + (head - sill) * k / rows; lbox(sd, t0, t1, zz - .02, zz + .02, .02, .04, mu)
    if door:  # kick panels
        lbox(sd, t0, t1, sill, sill + .45, .0, .035, tr)

R = SPEC['windows']
occ = enclosed
dormer_u = [(BL[i][1], BL[i][2]) for i in SPEC.get('dormers', [])]
link = SPEC.get('link')
ext_sides = []
for i in enclosed:
    if i in SPEC.get('dormers', []): continue
    for sd in sides(i):
        segs = exterior_segments(sd, occ)
        if not segs: continue
        ext_sides.append((sd, segs))
        e_side = side_eave(sd)
        if link is not None and i == link and sd[1] == 'S':
            d = SPEC['door']; tc = (BL[i][1] + BL[i][2]) / 2
            for k in (-1, 1): window(sd, tc + k * (d['w'] / 4 + .02), d['w'] / 2 - .04, .02, d['head'], 1, 5, door=True)
            for k in (-1, 1): window(sd, tc + k * (d['w'] / 2 + .1 + .25), .5, .5, d['head'], 1, 4)
            if e_side - d['head'] > .9: window(sd, tc, d['w'] + 1.2, d['head'] + .2, d['head'] + .62, 6, 1)
            continue
        if i == link: continue
        rule = R[sd[1]]
        head = min(rule['head'], e_side - .62); sill = rule['sill']
        if head - sill < .8: continue
        for (a, b) in segs:
            if b - a < 1.6: continue
            # French doors under the dormers on this side
            slots = [(a, b)]
            if sd[1] == SPEC.get('dormer_side', 'N') and sd[4] == 'u':
                nxt = []
                for (x0, x1) in slots:
                    cuts = [((du0 + du1) / 2) for du0, du1 in dormer_u if x0 + 1.2 < (du0 + du1) / 2 < x1 - 1.2]
                    lo = x0
                    for cc in sorted(cuts):
                        dw = R['door_w']
                        for k in (-1, 1): window(sd, cc + k * (dw / 4 + .02), dw / 2 - .04, .03, head, 2, 5, door=True)
                        nxt.append((lo, cc - dw / 2 - .25)); lo = cc + dw / 2 + .25
                    nxt.append((lo, x1))
                slots = nxt
            for (x0, x1) in slots:
                m = .8; L = x1 - x0 - 2 * m
                unit = rule['w'] * (2 if rule['pair'] else 1) + (rule['gap'] if rule['pair'] else 0)
                if L < unit: continue
                n = max(1, int(L / rule['period'] + .5)); sp = L / n
                for k in range(n):
                    tc = x0 + m + sp * (k + .5)
                    if rule['pair']:
                        for s in (-1, 1): window(sd, tc + s * (rule['w'] + rule['gap']) / 2, rule['w'], sill, head, rule['cols'], rule['rows'])
                    else: window(sd, tc, rule['w'], sill, head, rule['cols'], rule['rows'])

# dormer fronts: paired small windows above the main eave
for i in SPEC.get('dormers', []):
    b = BL[i]; sd = (i, 'N', b[3], -1, 'u', b[1], b[2]); tc = (b[1] + b[2]) / 2; dw = SPEC['dormer_win']
    for s in (-1, 1): window(sd, tc + s * (dw['w'] + dw['gap']) / 2, dw['w'], dw['sill'], dw['head'], 2, 3)
    lbox(sd, b[1] + .02, b[1] + .18, dw['sill'] - .3, b[5] - .05, 0, .05, COL['trim'])
    lbox(sd, b[2] - .18, b[2] - .02, dw['sill'] - .3, b[5] - .05, 0, .05, COL['trim'])

# trim on exterior walls: water table, frieze (eave sides), corner boards
for sd, segs in ext_sides:
    i = sd[0]; e_side = side_eave(sd); a_, b_ = sd[5], sd[6]
    for (a, b) in segs:
        lbox(sd, a, b, .2, .36, 0, .05, COL['trim'])
        if is_eave_side(sd) and e_side > 1.5: lbox(sd, a, b, e_side - .56, e_side - .31, 0, .04, COL['trim'])
        for t in (a, b):
            if abs(t - a_) < .05 or abs(t - b_) < .05:
                tt0, tt1 = (t, t + .17) if abs(t - a_) < .05 else (t - .17, t)
                lbox(sd, tt0, tt1, .36, e_side - .31 if is_eave_side(sd) else e_side - .05, 0, .05, COL['trim'])

# gutters along exterior eave edges
def roof_at(u, v, skip):
    return max([rh(j, u, v) for j in enclosed + openb if j != skip] + [-1e9])
for i in enclosed + openb:
    b = BL[i]
    for sd in sides(i):
        if not is_eave_side(sd) or b[0] in ('SU', 'SV'): continue
        E = b[5] - b[6] * OV
        i_, nm, c, s, ax, a, bb = sd
        a, bb = a - OV, bb + OV
        run = None; N = max(2, int((bb - a) / .2))
        for k in range(N + 1):
            t = a + (bb - a) * k / N
            q = side_pt(sd, t, OV + .07)
            ok = roof_at(q[0], q[1], i) < E - .25 and not (len(b) > 8 and 'o' in b[8] and False)
            if ok and run is None: run = t
            if (not ok or k == N) and run is not None:
                t_end = t if ok else t - (bb - a) / N
                if t_end - run > 1: lbox(sd, run, t_end, E - .2, E + .02, OV, OV + .13, COL['gutter'], back=True)
                run = None

# chimneys / rooftop units
for i in towers:
    t, u0, u1, v0, v1, e, p, cap = BL[i][:8]
    kind = KIND.get(i, 'chimney')
    base = max(0, roof_at((u0 + u1) / 2, (v0 + v1) / 2, i) - .6)
    if kind == 'chimney':
        wbox(u0, u1, v0, v1, base, cap - .12, COL['chimney'])
        wbox(u0 - .1, u1 + .1, v0 - .1, v1 + .1, cap - .12, cap, COL['trim'], bottom=True)
        wbox(u0 + .3, u0 + .55, v0 + .4, v0 + .65, cap, cap + .35, COL['flue'])
    else:
        top = SPEC.get('hvac_top', {}).get(str(i), e)
        wbox(u0, u1, v0, v1, base, top, COL['hvac'])
        wbox(u0 + .2, u0 + (u1 - u0) * .5, v0 + .25, v1 - .25, top, top + .05, COL['fan'])
for (u0, u1, v0, v1, top) in SPEC.get('hvac_extra', []):
    base = max(0, roof_at((u0 + u1) / 2, (v0 + v1) / 2, -1) - .6)
    wbox(u0, u1, v0, v1, base, top, COL['hvac'])
    wbox(u0 + .15, u1 - .15, v0 + .15, v1 - .15, top, top + .05, COL['fan'])

# open blocks (porte-cochere): beams, ceiling, columns
for i in openb:
    t, u0, u1, v0, v1, e, p, cap = BL[i][:8]
    tr = COL['trim']
    wbox(u0 + .1, u1 - .1, v0 + .1, v0 + .4, e - .6, e, tr, bottom=True)
    wbox(u0 + .1, u1 - .1, v1 - .4, v1 - .1, e - .6, e, tr, bottom=True)
    wbox(u0 + .1, u0 + .4, v0 + .1, v1 - .1, e - .6, e, tr, bottom=True)
    wbox(u1 - .4, u1 - .1, v0 + .1, v1 - .1, e - .6, e, tr, bottom=True)
    f = [DB.verts.new(P(x, y, e - .1)) for x, y in ((u0 + .1, v0 + .1), (u1 - .1, v0 + .1), (u1 - .1, v1 - .1), (u0 + .1, v1 - .1))]
    face(f, Vector((0, 0, -1)), COL['soffit'])
    pv = SPEC.get('porch_v0', v0)
    for (cu, cv) in ((u0 + .4, pv + .4), (u1 - .4, pv + .4), (u0 + .4, v1 - .4), (u1 - .4, v1 - .4)):
        r = .24
        wbox(cu - .34, cu + .34, cv - .34, cv + .34, -.3, .5, COL['stone'])
        wbox(cu - r, cu + r, cv - r, cv + r, .5, e - .75, tr)
        wbox(cu - r - .06, cu + r + .06, cv - r - .06, cv + r + .06, e - .75, e - .6, tr, bottom=True)

DET = mk('details', DB)
log('windows', NWIN[0], 'time', round(time.time() - T0, 1))

# ---------------------------------------------------------------- colour + subdivide the walls and roof
def finish(ob, colour_of, step=1.2):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    geom = lambda: bm.verts[:] + bm.edges[:] + bm.faces[:]
    xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]; zs = [v.co.z for v in bm.verts]
    def cuts(lo, hi, st):
        k = math.floor(lo / st) + 1; out = []
        while k * st < hi: out.append(k * st); k += 1
        return out
    for x in cuts(min(xs), max(xs), step): bmesh.ops.bisect_plane(bm, geom=geom(), plane_co=(x, 0, 0), plane_no=(1, 0, 0))
    for y in cuts(min(ys), max(ys), step): bmesh.ops.bisect_plane(bm, geom=geom(), plane_co=(0, y, 0), plane_no=(0, 1, 0))
    for z in [.2] + cuts(.2, max(zs), 1.0): bmesh.ops.bisect_plane(bm, geom=geom(), plane_co=(0, 0, z), plane_no=(0, 0, 1))
    lay = bm.loops.layers.float_color.new('base')
    dead = []
    for f in bm.faces:
        c = colour_of(f)
        if c is None: dead.append(f); continue
        for l in f.loops: l[lay] = c
    if dead: bmesh.ops.delete(bm, geom=dead, context='FACES')
    bm.to_mesh(ob.data); bm.free()

def body_col(f):
    n = f.normal
    if n.z > .3 or n.z < -.9: return None   # roof tops under the slabs, bottoms
    zc = f.calc_center_median().z
    return COL['stone'] if zc < .2 else COL['siding']
def roof_col(f):
    n = f.normal
    if n.z > .25: return COL['roof']
    if n.z < -.25: return COL['soffit']
    return COL['fascia']
finish(BODY, body_col)
finish(ROOF, roof_col)

for o in (BODY, ROOF, DET): o.select_set(True)
bpy.context.view_layer.objects.active = BODY
bpy.ops.object.join()
M = BODY; M.name = 'clubhouse'
me = M.data
log('faces', len(me.polygons), 'verts', len(me.vertices))

# ---------------------------------------------------------------- context ground (renders + AO only)
def ground_obj():
    bm = bmesh.new()
    s = 220
    vs = [bm.verts.new(P(*p)) for p in ((-s, -s, -.12), (s, -s, -.12), (s, s, -.12), (-s, s, -.12))]
    bm.faces.new(vs)
    ob = mk('ground', bm)
    mat = bpy.data.materials.new('lawn'); mat.diffuse_color = COL['lawn']; mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = COL['lawn']
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .95
    ob.data.materials.append(mat); return ob
GROUND = ground_obj()
def flat(name, pts, z, col):
    bm = bmesh.new(); vs = [bm.verts.new(P(u, v, z)) for u, v in pts]; bm.faces.new(vs)
    ob = mk(name, bm); mat = bpy.data.materials.new(name); mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = col
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9
    ob.data.materials.append(mat); return ob
CTX = [GROUND]
for c in SPEC.get('context', []):
    if c['type'] == 'rect':
        u0, u1, v0, v1 = c['r']; CTX.append(flat(c['name'], [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], c['z'], lin(c['col'])))
    elif c['type'] == 'disc':
        cu, cv, r = c['c'][0], c['c'][1], c['r']
        CTX.append(flat(c['name'], [(cu + r * math.cos(a * math.pi / 24), cv + r * math.sin(a * math.pi / 24)) for a in range(48)], c['z'], lin(c['col'])))

# ---------------------------------------------------------------- material, AO bake
mat = bpy.data.materials.new('club'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'Col'
nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = .78
me.materials.clear(); me.materials.append(mat)

SC.render.engine = 'CYCLES'; SC.cycles.device = 'CPU'
world = bpy.data.worlds.new('w'); SC.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.50, .64, .85, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
world.light_settings.distance = SPEC.get('ao_dist', 3.0)
me.color_attributes.new('ao', 'BYTE_COLOR', 'CORNER')
me.color_attributes.active_color = me.color_attributes['ao']
for o in bpy.context.view_layer.objects: o.select_set(False)
M.select_set(True); bpy.context.view_layer.objects.active = M
SC.cycles.samples = SPEC.get('ao_samples', 64)
SC.render.bake.target = 'VERTEX_COLORS'
tb = time.time()
try:
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    log('AO bake', round(time.time() - tb, 1), 's')
    baked = True
except Exception as ex:
    log('AO bake failed:', ex); baked = False

base = me.color_attributes['base'].data; ao = me.color_attributes['ao'].data
col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
k0, k1 = SPEC.get('ao_mix', [.42, .58])
for k in range(len(col.data)):
    b = base[k].color; a = (ao[k].color[0] if baked else 1.0)
    f = k0 + k1 * a
    col.data[k].color = (b[0] * f, b[1] * f, b[2] * f, 1)
me.color_attributes.active_color = col
me.color_attributes.render_color_index = me.color_attributes.find('Col')

# ---------------------------------------------------------------- export: glb + tris.json
for o in bpy.context.view_layer.objects: o.select_set(False)
M.select_set(True)
glb = os.path.join(OUT, SPEC['id'] + '.glb')
kw = dict(filepath=glb, use_selection=True, export_format='GLB', export_apply=True, export_yup=True)
try: bpy.ops.export_scene.gltf(**kw, export_vertex_color='ACTIVE')
except TypeError: bpy.ops.export_scene.gltf(**kw)
log('glb bytes', os.path.getsize(glb))

me.calc_loop_triangles()
C = me.color_attributes['Col'].data
def srgb(x): x = max(0, min(1, x)); return int(round(255 * (1.055 * x ** (1 / 2.4) - .055 if x > .0031308 else 12.92 * x)))
pos = []; cols = []
for tri in me.loop_triangles:
    for li in tri.loops:
        v = me.vertices[me.loops[li].vertex_index].co
        pos += [round(v.x, 3), round(v.z, 3), round(-v.y, 3)]
        c = C[li].color; cols += [srgb(c[0]), srgb(c[1]), srgb(c[2])]
json.dump({'id': SPEC['id'], 'frame': 'u,h,v yd (CLUBLID frame)', 'pos': pos, 'col': cols}, open(os.path.join(OUT, 'tris.json'), 'w'), separators=(',', ':'))
ntri = len(me.loop_triangles)
xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
stats = {'id': SPEC['id'], 'tris': ntri, 'windows': NWIN[0], 'bbox_u': [min(xs), max(xs)], 'bbox_h': [min(ys), max(ys)], 'bbox_v': [min(zs), max(zs)], 'ao_baked': baked}
log('stats', stats)

# ---------------------------------------------------------------- renders
SC.view_settings.view_transform = 'Standard'
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = SPEC.get('sun_energy', 3.6); sun.angle = math.radians(1.5); sun.color = (1, .96, .9)
so = bpy.data.objects.new('sun', sun); COLL.objects.link(so)
az, el = [math.radians(x) for x in SPEC.get('sun_from', [210, 42])]   # azimuth in the u/v frame: 0 = +u, 90 = +v
dvec = Vector((math.cos(az) * math.cos(el), -math.sin(az) * math.cos(el), math.sin(el)))  # toward the sun (Blender)
so.rotation_euler = (-dvec).to_track_quat('-Z', 'Y').to_euler()
SC.cycles.samples = SPEC.get('render_samples', 96)
SC.cycles.use_denoising = True
SC.render.resolution_x, SC.render.resolution_y = 1280, 720
SC.render.image_settings.file_format = 'JPEG'; SC.render.image_settings.quality = 88
for r in SPEC['renders']:
    cd = bpy.data.cameras.new(r['name']); cd.lens = r.get('lens', 35)
    co = bpy.data.objects.new(r['name'], cd); COLL.objects.link(co)
    co.location = P(*r['eye'])
    co.rotation_euler = (P(*r['at']) - P(*r['eye'])).to_track_quat('-Z', 'Y').to_euler()
    SC.camera = co; SC.render.filepath = os.path.join(OUT, 'r_' + r['name'] + '.jpg')
    tr = time.time()
    bpy.ops.render.render(write_still=True)
    log('render', r['name'], round(time.time() - tr, 1), 's')

stats['seconds'] = round(time.time() - T0, 1)
json.dump(stats, open(os.path.join(OUT, 'stats.json'), 'w'), indent=1)
open(os.path.join(OUT, 'log.txt'), 'w').write('\n'.join(LOG))
log('done', stats['seconds'])
