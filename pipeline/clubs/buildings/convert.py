"""Lidar building results (bld/res/bld_<key>.json) -> BLDX game data (course yards, roof colours from the aerial photo).
usage: python3 convert.py [keys] -> bld/bldx.json (+ prints a summary)"""
import json, math, sys, os, numpy as np, cv2
B = '/home/claude/golf/bld/'; Q = '/home/claude/golf/qa/'
E = json.load(open(B + 'export.json')); XF = json.load(open('/home/claude/golf/naip/xf.json'))
keys = sys.argv[1].split(',') if len(sys.argv) > 1 else [k for k in E if os.path.exists(B + f'res/bld_{k}.json')]
YD = 1.0936
def frame(k):
    o = E[k]['origin']
    if o:
        lat0, lon0 = o; K = math.cos(math.radians(lat0)) * 111320 * YD; L = 110574 * YD
        return (lambda lo, la: ((lo - lon0) * K, -(la - lat0) * L)), (lambda x, y: (lon0 + x / K, lat0 - y / L))
    A = np.array(XF[k]); M = A[:2]; t = A[2]; Mi = np.linalg.inv(M)
    return (lambda lo, la: tuple(np.array([lo, la]) @ M + t)), (lambda x, y: tuple((np.array([x, y]) - t) @ Mi))
def inpoly(P, x, y):
    c = False
    for i in range(len(P)):
        x1, y1 = P[i]; x2, y2 = P[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def dseg(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]; l = dx * dx + dy * dy; t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) if l else 0
    return math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t)
def shortside(ring):
    r = cv2.minAreaRect(np.array(ring, np.float32)); return max(1.0, min(r[1]))
def caprise(rise, ring, roof):
    if roof == 0: return 0.0
    return round(max(0.8, min(rise, 0.22 * shortside(ring), 4.5)), 1)
out = {}; tot = dict(rec=0, add=0, col=0)
for k in keys:
    R = json.load(open(B + f'res/bld_{k}.json')); toyd, toll = frame(k)
    photo = Q + f'photos/naip_{k}.jpg'; P = cv2.imread(photo) if os.path.exists(photo) else None
    if P is not None:
        M = json.load(open(Q + f'photos/naip_{k}.json')); W_, S_, E_, N_ = M['ext']; Hh, Ww = P.shape[:2]
        def px(x, y):
            lo, la = toll(x, y); return ((lo - W_) / (E_ - W_) * Ww, (N_ - la) / (N_ - S_) * Hh)
    def colour(ring):
        """median roof colour inside the footprint (shrunk 15% toward the middle), or None if it reads as vegetation"""
        if P is None: return None, 0
        pts = np.array([px(*q) for q in ring]); c = pts.mean(0); pts = c + (pts - c) * .85
        m = np.zeros(P.shape[:2], np.uint8); cv2.fillPoly(m, [np.round(pts).astype(np.int32)], 1)
        v = P[m > 0]
        if len(v) < 3: return None, 0
        b, g, r = [float(np.median(v[:, i])) for i in range(3)]; exg = (2 * g - r - b) / max(r + g + b, 1)
        if exg > 0.06: return None, exg
        return (int(r) << 16) | (int(g) << 8) | int(b), exg
    D = json.load(open(Q + f'dump/{k}.json')) if os.path.exists(Q + f'dump/{k}.json') else None
    mown = [p for t in ('fairway', 'green', 'tee', 'bunker', 'water') for p in (D['polys'].get(t, []) if D else [])]
    o = dict(c={}, b={}, a=[])
    for fid, r in R['fp'].items():
        if not isinstance(r, list): continue
        eave, rise, roof, ang = r[0] * YD, r[1] * YD, r[2], r[3]
        if eave < 2.0 or eave > 40: continue
        rise = min(rise, 0.9 * eave + 3)
        idx = int(fid[1:])
        if fid[0] == 'o':   # an OpenStreetMap building measured for a course with no footprints of its own
            ring = [toyd(lo, la) for lo, la in R['osm'][idx]]; cx = sum(q[0] for q in ring) / len(ring); cy = sum(q[1] for q in ring) / len(ring)
            if min(dseg((cx, cy), a_, b_) for L in E[k]['lines'] for a_, b_ in zip(L, L[1:])) > 260: continue
            col, _ = colour(ring); rise = caprise(rise, ring, roof)
            o['a'].append([[[round(x, 1), round(y, 1)] for x, y in ring], [round(eave, 1), round(rise, 1), roof, round(math.degrees(ang) % 180, 1), col], 'building']); tot['add'] += 1; continue
        ring = (E[k]['club'][idx] if fid[0] == 'c' else E[k]['bld'][idx][0])
        rise = caprise(rise, ring, roof)
        col, _ = colour(ring)
        o['c' if fid[0] == 'c' else 'b'][str(idx)] = [round(eave, 1), round(rise, 1), roof, round(math.degrees(ang) % 180, 1), col]
        tot['rec'] += 1; tot['col'] += col is not None
    has6 = False
    import glob
    for sf in glob.glob(B + 'res/sum_*.json'):
        c = json.load(open(sf))['courses'].get(k, {})
        if c.get('used') == R['src'] and c.get('tried', {}).get(R['src'], {}).get('b6', 0) > 0: has6 = True
    for a in R['add']:
        ring = [toyd(lo, la) for lo, la in a['ring']]; cx = sum(q[0] for q in ring) / len(ring); cy = sum(q[1] for q in ring) / len(ring)
        if any(inpoly(p, cx, cy) for p in mown): continue
        if has6 and a.get('b6', 0) < 0.5: continue
        col, exg = colour(ring)
        if col is None: continue                     # green on the photo: a tree, not a roof
        eave, rise = a['eave'] * YD, a['rise'] * YD
        if eave < 2.0 or eave > 30: continue
        area = a.get('rect', a['area']); kind = 'shack' if area < 55 else ('barn' if a['roof'] == 0 and area > 200 else 'building')
        o['a'].append([[[round(x, 1), round(y, 1)] for x, y in ring], [round(eave, 1), caprise(min(rise, 0.9 * eave + 3), ring, a['roof']), a['roof'], round(math.degrees(a['ang']) % 180, 1), col], kind])
        tot['add'] += 1
    out[k] = o
    print(k, R['src'], 'recs', len(o['c']) + len(o['b']), 'of', len(R['fp']), 'added', len(o['a']), 'of', len(R['add']), '(class6' if has6 else '(no class6', ')')
json.dump(out, open(B + 'bldx.json', 'w'), separators=(',', ':')); print(tot)
