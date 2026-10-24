"""Broadleaf tree prototypes for the game (space colonisation), in the game's prototype format.

  python3 treegen.py out.npz            (pure numpy/scipy; Blender then bakes the light into the colours: bake_trees.py)

Frame: the game's (x, y up, z), yd. Per prototype: bark (n,11 pos nor col uv), mass (n,9 pos nor col), leaf (n,11 pos nor col uv),
trunkN (floats of bark belonging to trunk + main limbs, used for the game's distant 'lite' version). Colours are the base colours
before the bake (sRGB 0..1, like the game's hexc).
Species sizes follow R3T_SP in index.html so the trees keep the sizes the course was tuned with.
"""
import sys, math, json
import numpy as np
from scipy.spatial import cKDTree
from scipy.cluster.vq import kmeans2

SP = {
 'buroak':     dict(clusters=12, dens=24, shape='spread', trunkH=3.1, trunkR=.75, crownY=7.2, W=10.5, H=5.2, rc=(3.1, 4.1), cards=390, cols=['#2c4a22', '#3a5f2e', '#53783a'], bark='#4a3b2e', cell=0, stems=1),
 'oak':        dict(clusters=11, dens=24, shape='oval', trunkH=3.5, trunkR=.65, crownY=7.8, W=8.6, H=6.4, rc=(2.9, 3.8), cards=300, cols=['#2f5428', '#3f6c31', '#5a8a40'], bark='#4f3826', cell=1, stems=1),
 'maple':      dict(clusters=11, dens=26, shape='oval', trunkH=3.6, trunkR=.55, crownY=8.2, W=7.4, H=7.4, rc=(2.7, 3.5), cards=280, cols=['#2f6b2c', '#437f33', '#5f9d42'], bark='#5b3e27', cell=2, stems=1),
 'maple_fall': dict(clusters=11, dens=26, shape='oval', trunkH=3.6, trunkR=.55, crownY=8.2, W=7.4, H=7.4, rc=(2.7, 3.5), cards=280, cols=['#8a3b1f', '#b5532a', '#d9793a'], bark='#5b3e27', cell=2, stems=1),
 'cottonwood': dict(clusters=14, dens=18, shape='tall', trunkH=5.6, trunkR=.85, crownY=12, W=9, H=9.5, rc=(2.9, 3.9), cards=300, cols=['#3a5f30', '#4f7639', '#6d9248'], bark='#9a9188', cell=4, stems=1),
 'birch':      dict(clusters=11, dens=24, shape='slim', trunkH=3.4, trunkR=.27, crownY=7.4, W=5.6, H=7.4, rc=(2, 2.7), cards=170, cols=['#5f8a34', '#7aa545', '#98bf5c'], bark='#ece8de', cell=8, stems=3),
}
RECT = [[(i % 4) / 4 + .003, (i >> 2) / 4 + .003, (i % 4 + 1) / 4 - .003, ((i >> 2) + 1) / 4 - .003] for i in range(16)]
def hexc(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
def nrm(v): v = np.asarray(v, float); n = np.linalg.norm(v, axis=-1, keepdims=True); return v / np.maximum(n, 1e-9)

def lobes(S, R):
    """crown lobes placed like the game's own tree clusters (same silhouette family), radius rc"""
    out = []; n = S.get('clusters', 12); sp = S['shape']
    for i in range(n):
        a = i / n * 2 * math.pi * 1.618 * 1.618 + R.random() * .6
        ring = .55 + R.random() * .45 if sp == 'spread' else R.random() * .7 if sp == 'slim' else .25 + R.random() * .7
        x, z = math.cos(a) * S['W'] * .5 * ring, math.sin(a) * S['W'] * .5 * ring
        y = S['crownY'] + (R.random() - .5) * S['H'] * (.45 if sp == 'spread' else .75)
        if sp == 'spread': y -= ring * 1.2
        if sp == 'tall': y += (R.random() - .3) * S['H'] * .25
        out.append((np.array([x, y, z]), R.uniform(*S['rc'])))
    return out

def envelope(S, R, n, L):
    """attractor points inside the crown lobes, weighted to each lobe's outer half"""
    pts = []
    per = n // len(L) + 1
    for c, rc in L:
        p = R.normal(0, 1, (per * 2, 3)); p = nrm(p) * (R.random((per * 2, 1)) ** .5)
        p = p[(np.linalg.norm(p, axis=1) > .35) | (R.random(len(p)) < .3)][:per]
        P = c + p * np.array([rc * .95, rc * .8, rc * .95])
        pts.extend(P[P[:, 1] > S['trunkH'] + .25].tolist())
    return np.array(pts)

def grow(S, R):
    nodes = [np.zeros(3)]; par = [-1]
    lean = R.uniform(-.35, .35, 2)
    stems = S['stems']
    tops = []
    for s in range(stems):
        a = s / stems * 2 * math.pi + R.random()
        off = np.array([math.cos(a) * .35, 0, math.sin(a) * .35]) if stems > 1 else np.zeros(3)
        spread = np.array([math.cos(a) * 1.2, 0, math.sin(a) * 1.2]) if stems > 1 else np.zeros(3)
        prev = 0
        if stems > 1:
            nodes.append(off.copy()); par.append(0); prev = len(nodes) - 1
        k = max(3, int(S['trunkH'] / .5))
        for i in range(1, k + 1):
            f = i / k
            p = off + np.array([lean[0] * f, S['trunkH'] * f, lean[1] * f]) + spread * f ** 1.5 + R.normal(0, .04, 3)
            nodes.append(p); par.append(prev); prev = len(nodes) - 1
        tops.append(prev)
    trunk_n = len(nodes)
    L = lobes(S, R)
    A = envelope(S, R, 2600, L)
    di, dk, D = 4.0, .62, .42
    for it in range(260):
        if len(A) == 0: break
        N = np.array(nodes)
        tr = cKDTree(N)
        d, idx = tr.query(A, distance_upper_bound=di)
        m = np.isfinite(d)
        if not m.any():
            # nothing in reach: extend the stem tops upward toward the crown
            for t in list(tops):
                p = N[t] + np.array([0, D, 0]); nodes.append(p); par.append(t); tops[tops.index(t)] = len(nodes) - 1
            continue
        dirs = nrm(A[m] - N[idx[m]])
        acc = np.zeros((len(N), 3)); cnt = np.zeros(len(N))
        np.add.at(acc, idx[m], dirs); np.add.at(cnt, idx[m], 1)
        grown = 0
        for j in np.nonzero(cnt)[0]:
            v = nrm(acc[j]) + np.array([0, .12, 0]) + R.normal(0, .08, 3)
            p = N[j] + D * nrm(v)
            if tr.query(p)[0] < D * .5: continue
            nodes.append(p); par.append(j); grown += 1
        N = np.array(nodes)
        kd = cKDTree(N).query(A, distance_upper_bound=dk)[0]
        A = A[~np.isfinite(kd)]
        if grown == 0: break
    N = np.array(nodes); par = np.array(par)
    # pipe-model radii
    nch = np.zeros(len(N), int)
    for i in range(1, len(N)): nch[par[i]] += 1
    r = np.zeros(len(N)); n_ = 2.4
    for i in range(len(N) - 1, -1, -1):
        if r[i] == 0: r[i] = .03 ** n_
        if par[i] >= 0: r[par[i]] += r[i]
    r = r ** (1 / n_)
    r *= S['trunkR'] / r[0]
    r = np.maximum(r, .025)
    return N, par, r, trunk_n, L

def tube_chains(N, par, r):
    ch = [[] for _ in range(len(N))]
    for i in range(1, len(N)): ch[par[i]].append(i)
    chains = []
    def walk(start):
        stack = [start]
        while stack:
            s = stack.pop()
            for c in ch[s]:
                chain = [s, c]
                while len(ch[chain[-1]]) == 1:
                    chain.append(ch[chain[-1]][0])
                # children beyond a fork: the thickest continues this chain
                chains.append(chain)
                stack.append(chain[-1])
    walk(0)
    return chains

def bark_mesh(N, par, r, S, R, rmin=.16):
    out = []; trunk_out = []
    col = hexc(S['bark'])
    chains = tube_chains(N, par, r)
    chains.sort(key=lambda c: -r[c[0]])
    for chain in chains:
        if r[chain[1]] < rmin: continue
        # thin out nodes: keep every node on thick limbs, fewer on thin ones
        keep = [chain[0]]
        step = 2 if r[chain[0]] > .3 else 3
        for k, i in enumerate(chain[1:-1], 1):
            if k % step == 0 and r[i] >= rmin: keep.append(i)
        last = [i for i in chain if r[i] >= rmin][-1]
        if keep[-1] != last: keep.append(last)
        if len(keep) < 2: continue
        P = N[keep]; rr = r[keep]
        sides = 7 if rr[0] > .4 else 5 if rr[0] > .22 else 4
        Ur = max(1, round(2 * math.pi * rr[0] / .8))
        # parallel-transported frames
        T = [nrm(P[min(k + 1, len(P) - 1)] - P[max(k - 1, 0)]) for k in range(len(P))]
        u = np.cross(T[0], [0, 1, 0]) if abs(T[0][1]) < .95 else np.cross(T[0], [1, 0, 0]); u = nrm(u)
        frames = []
        for k in range(len(P)):
            if k: u = nrm(u - np.dot(u, T[k]) * T[k])
            frames.append((u, np.cross(T[k], u)))
        v0 = 0.0; target = out if not (rr[0] > .3 or chain[0] < 1) else trunk_out
        for k in range(len(P) - 1):
            L = np.linalg.norm(P[k + 1] - P[k]); vt = v0 + L / (2 * math.pi * rr[0] / Ur)
            for s in range(sides):
                a0, a1 = s / sides * 2 * math.pi, (s + 1) / sides * 2 * math.pi
                def ring(kk, a): fu, fv = frames[kk]; return fu * math.cos(a) + fv * math.sin(a)
                c00, c01, c10, c11 = ring(k, a0), ring(k, a1), ring(k + 1, a0), ring(k + 1, a1)
                Pq = [P[k] + c00 * rr[k], P[k] + c01 * rr[k], P[k + 1] + c11 * rr[k + 1], P[k + 1] + c10 * rr[k + 1]]
                Nq = [c00, c01, c11, c10]
                UV = [[s / sides * Ur, v0], [(s + 1) / sides * Ur, v0], [(s + 1) / sides * Ur, vt], [s / sides * Ur, vt]]
                for q in (0, 2, 1, 0, 3, 2):
                    target.append([*Pq[q], *Nq[q], *col, *UV[q]])
            v0 = vt
    trunkN = len(trunk_out) * 11
    return np.array(trunk_out + out, np.float32).reshape(-1, 11), trunkN

def leaves(N, par, r, S, R):
    nch = np.zeros(len(N), int)
    for i in range(1, len(N)): nch[par[i]] += 1
    tips = np.nonzero((r <= max(.09, np.percentile(r, 55))) & (np.arange(len(N)) > 0))[0]
    lo, base, hi = [hexc(c) for c in S['cols']]
    cc = np.array([0, S['crownY'], 0])
    cards = []
    want = int(sum(S['dens'] * (rc / 3.3) ** 2 for _, rc in S['_L']) * 1.05)
    # spread the cards over twig nodes, more at the very tips
    w = np.where(nch[tips] == 0, 2.0, 1.0); w /= w.sum()
    pick = R.choice(tips, size=want, p=w)
    ymin, ymax = N[tips, 1].min(), N[tips, 1].max()
    cell = RECT[S['cell']]
    for i in pick:
        o = nrm(N[i] - cc * np.array([0, 1, 0]) - np.array([0, 0, 0]))
        d = nrm(R.normal(0, 1, 3) * .7 + nrm(N[i] - cc) * .8 + np.array([0, .2, 0]))
        C = N[i] + d * R.uniform(.3, 1.1)
        rc = R.uniform(*S['rc'])
        sz = rc * (.34 + R.random() * .18)
        out2 = nrm(C - cc)
        nn = nrm(out2 * .65 + d * .25 + np.array([0, .25, 0]))
        t1 = np.cross(nn, [0, 1, 0]); t1 = nrm(t1) if np.linalg.norm(t1) > .1 else np.array([1., 0, 0]); t2 = np.cross(nn, t1)
        a = R.random() * 2 * math.pi
        u = (t1 * math.cos(a) + t2 * math.sin(a)) * sz; v = (t1 * -math.sin(a) + t2 * math.cos(a)) * sz
        k = np.clip((C[1] - ymin) / max(ymax - ymin, 1e-3), 0, 1) * .75 + .25 * R.random()
        col = (lo + (base - lo) * (k / .55) if k < .55 else base + (hi - base) * ((k - .55) / .45)) * (.88 + R.random() * .24)
        u0, vt, u1, vb = cell
        Pq = [C - u - v, C + u - v, C + u + v, C - u + v]; UV = [[u0, vb], [u1, vb], [u1, vt], [u0, vt]]
        for q in (0, 1, 2, 0, 2, 3): cards.append([*Pq[q], *nn, *col, *UV[q]])
    return np.array(cards, np.float32)

ICO = None
def ico1():
    global ICO
    if ICO is not None: return ICO
    t = (1 + 5 ** .5) / 2
    V = [nrm(v) for v in [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]]
    F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    tris = []
    for a, b, c in F:
        A, B, C = V[a], V[b], V[c]; ab, bc, ca = nrm(A + B), nrm(B + C), nrm(C + A)
        tris += [[A, ab, ca], [B, bc, ab], [C, ca, bc], [ab, bc, ca]]
    ICO = np.array(tris); return ICO

def ico0():
    t = (1 + 5 ** .5) / 2
    V = [nrm(v) for v in [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]]
    F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    return np.array([[V[a], V[b], V[c]] for a, b, c in F])

def masses(L, S, R):
    lo, base, hi = [hexc(c) for c in S['cols']]
    out = []
    for c, rc in L:
        sd = np.array([rc * .66, rc * .55, rc * .66])
        for tri in ico0():
            for v in tri:
                P = c + v * sd * (1 + .22 * (R.random() - .5))
                n = nrm(v / sd)
                kk = np.clip(v[1] * .5 + .5, 0, 1)
                col = (lo * .8 + (base - lo * .8) * kk) * (.55 + .3 * kk)
                out.append([*P, *n, *col])
    return np.array(out, np.float32)

def build(name, S, seed):
    R = np.random.default_rng(seed)
    N, par, r, tn, L = grow(S, R)
    bark, trunkN = bark_mesh(N, par, r, S, R)
    S = dict(S, _L=L)
    leaf = leaves(N, par, r, S, R)
    mass = masses(L, S, R)
    return dict(bark=bark, mass=mass, leaf=leaf, trunkN=trunkN, nodes=len(N))

if __name__ == '__main__':
    out = {}
    meta = {}
    for name, S in SP.items():
        for v in range(2):
            g = build(name, S, 1000 + hash(name) % 1000 * 7 + v * 131 if False else sum(map(ord, name)) * 17 + v * 131)
            for k in ('bark', 'mass', 'leaf'): out['%s|%d|%s' % (name, v, k)] = g[k]
            meta['%s|%d' % (name, v)] = dict(trunkN=g['trunkN'], nodes=g['nodes'], tris=(len(g['bark']) + len(g['mass']) + len(g['leaf'])) // 3)
            print(name, v, meta['%s|%d' % (name, v)], 'bark', len(g['bark']) // 3, 'mass', len(g['mass']) // 3, 'leaf', len(g['leaf']) // 3, flush=True)
    np.savez_compressed(sys.argv[1] if len(sys.argv) > 1 else 'trees.npz', **out)
    json.dump(meta, open((sys.argv[1] if len(sys.argv) > 1 else 'trees.npz').replace('.npz', '.json'), 'w'), indent=1)
