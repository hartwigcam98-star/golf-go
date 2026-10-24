"""Game clubhouse (exactly as the game draws it from CLUBLID + CLUBLOOK: porches, stairs, arches, plantings...) -> npz for
club_bake.py.  python3 prep_club.py clubs/<id>.json out/<id>.npz

- triangles (stride 9: pos, normal, sRGB colour) re-centred on the clubhouse: course frame minus (cx, ground, cy)
- long triangles split (midpoints) so the baked light has vertices to live on (max edge 1.1 yd)
- window glass (dark, upright, small connected pieces) gets Blender-side frames and a cross muntin in the trim colour
- the ground round it (1 yd grid) for the bake
"""
import sys, json, math, numpy as np
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
if d.get('none'): print(d['id'], 'no clubhouse'); sys.exit(0)
T = np.array(d['tris'], np.float64).reshape(-1, 3, 9)
cx, cy = d['c']['x'], d['c']['y']; R = d['R']
gr = np.array(d['gr'], np.float64); n = int(round(math.sqrt(len(gr))))
gr = gr[:n * n].reshape(n, n)
g0 = gr[n // 2, n // 2]
off = np.array([cx, g0, cy])
T[:, :, :3] -= off
look = d.get('look') or {}
def hexc(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
trim = hexc(look.get('t', '#efede6'))

def split(T, maxe=2.4, depth=4):
    out = []
    stack = [(t, 0) for t in T]
    while stack:
        t, k = stack.pop()
        P = t[:, :3]; e = [np.linalg.norm(P[1] - P[0]), np.linalg.norm(P[2] - P[1]), np.linalg.norm(P[0] - P[2])]
        ar = .5 * np.linalg.norm(np.cross(P[1] - P[0], P[2] - P[0]))
        if max(e) <= maxe or k >= depth or ar < 1.2: out.append(t); continue
        m01, m12, m20 = (t[0] + t[1]) / 2, (t[1] + t[2]) / 2, (t[2] + t[0]) / 2
        for q in ((t[0], m01, m20), (m01, t[1], m12), (m20, m12, t[2]), (m01, m12, m20)):
            stack.append((np.array(q), k + 1))
    return np.array(out)

# --- windows: connected dark upright small pieces
C = T[:, 0, 6:9]; lum = C @ np.array([.3, .59, .11])
P = T[:, :, :3]; nrm = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]); area = .5 * np.linalg.norm(nrm, axis=1)
nn = nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
glass = (lum < .24) & (np.abs(nn[:, 1]) < .25) & (area < 6)
gi = np.nonzero(glass)[0]
# union-find on shared (rounded) vertex positions
key = {}
par = list(range(len(gi)))
def f(a):
    while par[a] != a: par[a] = par[par[a]]; a = par[a]
    return a
for j, i in enumerate(gi):
    for v in P[i]:
        k = tuple(np.round(v, 2))
        if k in key: par[f(j)] = f(key[k])
        else: key[k] = j
groups = {}
for j in range(len(gi)): groups.setdefault(f(j), []).append(gi[j])
frames = []
def box(c, a, b, n, ha, hb, d0, d1, col):
    """thin box: centre c in the wall plane, half sizes ha along a, hb along b, from d0 to d1 off the wall along n"""
    out = []
    cs = [c + a * sa * ha + b * sb * hb for sa, sb in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    f0 = [p + n * d0 for p in cs]; f1 = [p + n * d1 for p in cs]
    quads = [(f1, n)]   # front faces only: the bars stand 0.05 yd proud, their sides never read
    for q, nq in quads:
        if nq is None: nq = np.cross(q[1] - q[0], q[2] - q[0]); nq = nq / max(np.linalg.norm(nq), 1e-9)
        for tri in ((q[0], q[1], q[2]), (q[0], q[2], q[3])):
            fn = np.cross(tri[1] - tri[0], tri[2] - tri[0])
            if np.dot(fn, nq) < 0: tri = (tri[0], tri[2], tri[1])
            out.append([[*v, *nq, *col] for v in tri])
    return out
nwin = 0
for g in groups.values():
    Q = P[g].reshape(-1, 3); nv = nn[g].mean(0); nv /= max(np.linalg.norm(nv), 1e-9)
    if abs(nv[1]) > .3: continue
    a = np.cross([0, 1, 0], nv); a /= max(np.linalg.norm(a), 1e-9); b = np.array([0, 1., 0])
    c0 = Q.mean(0); u = (Q - c0) @ a; v = (Q - c0) @ b
    W, H = u.max() - u.min(), v.max() - v.min()
    if not (.35 < W < 4.5 and .45 < H < 4.5): continue
    c = c0 + a * (u.max() + u.min()) / 2 + b * (v.max() + v.min()) / 2 + nv * .01
    fw = .07
    frames += box(c + b * (H / 2), a, b, nv, W / 2 + fw, fw, 0, .05, trim)
    frames += box(c - b * (H / 2), a, b, nv, W / 2 + fw, fw * 1.4, 0, .07, trim)
    frames += box(c + a * (W / 2), a, b, nv, fw, H / 2, 0, .05, trim)
    frames += box(c - a * (W / 2), a, b, nv, fw, H / 2, 0, .05, trim)
    if W > .5: frames += box(c, a, b, nv, .025, H / 2, 0, .03, trim)
    if H > .6: frames += box(c, a, b, nv, W / 2, .025, 0, .03, trim)
    nwin += 1
T2 = split(T)
if len(T2) > 60000: T2 = split(T, maxe=6.0, depth=2)
if frames: T2 = np.concatenate([T2, np.array(frames)])
xs = np.arange(-R, R + 1e-6, 1.0)
np.savez_compressed(dst, tris=T2.astype(np.float32), off=off, offc=off + np.array([d['T0'][0], 0, d['T0'][1]]), ground=(gr - g0).astype(np.float32), R=np.array([R]), xs=xs)
print(d['id'], 'tris', len(T), '->', len(T2), 'windows', nwin, 'R', R)
